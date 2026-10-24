// What the plan bench (planBench.test.ts) found wrong in generated weeks and their shopping lists.
import { beforeAll, expect, test } from "vitest";
import { DEFAULT_MENU_PLAN, DEFAULT_PREFERENCES, basics, generateMenu, menuShopping, nutritionOf, proteinOf, recipeById, type MenuDay, type MenuPlan, type Recipe } from "../engine";
import { shopLine } from "../app/amounts";
import { loadCatalog } from "./chefTurn";

beforeAll(loadCatalog);

const week = (m: number): MenuDay[] => Array.from({ length: 7 }, (_, i) => {
  const t = new Date(2026, m, 5 + i, 12);
  return { date: t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"), items: [] };
});
const weeks = (plan: MenuPlan, n = 12) => Array.from({ length: n }, (_, k) => generateMenu(week((k * 3) % 12), DEFAULT_PREFERENCES, 2, 1000 + k * 7919, plan));
const dinnersOf = (days: MenuDay[]) => days.map((d) => recipeById(d.items.find((it) => (it.meal ?? "dinner") === "dinner" && !it.leftover)?.recipeId ?? "")).filter((r) => !!r);

test("no long dish on a weekday, even without «быстро в будни»", () => {
  for (const days of weeks({ ...DEFAULT_MENU_PLAN, meals: ["dinner"], quickWeekdays: false, cookAhead: false })) for (const d of days) {
    const wd = new Date(d.date + "T12:00").getDay();
    for (const it of d.items) {
      const r = recipeById(it.recipeId)!;
      expect(r.totalMinutes).toBeLessThanOrEqual(wd >= 1 && wd <= 5 ? 120 : 240);
    }
  }
});

test("the same meat or fish is not on two days running, nor more than three times a week", () => {
  let runs = 0, pairs = 0;
  for (const days of weeks({ ...DEFAULT_MENU_PLAN, meals: ["dinner"], quickWeekdays: false, cookAhead: false }, 20)) {
    const p = dinnersOf(days).map((r) => proteinOf(r!));
    for (let i = 1; i < p.length; i++) { pairs++; if (p[i] && p[i] === p[i - 1]) runs++; }
    for (const x of new Set(p.filter(Boolean))) expect(p.filter((y) => y === x).length).toBeLessThanOrEqual(3);
  }
  expect(runs / pairs).toBeLessThan(0.03); // only when the rules leave nothing else
});

test("at least four dinners of seven are home cooking, not Turkish soups and Greek avgolemono", () => {
  const home = new Set(["russian", "ukrainian", "belarusian", "tatar"]);
  for (const days of weeks({ ...DEFAULT_MENU_PLAN, meals: ["dinner"], quickWeekdays: false, cookAhead: false }, 20)) {
    const far = dinnersOf(days).filter((r) => r!.cuisine && !home.has(r!.cuisine));
    expect(far.length, far.map((r) => r!.title).join(", ")).toBeLessThanOrEqual(3);
  }
});

test("«полегче» with three meals keeps the whole day at 1200–1500 kcal, not only each dish", () => {
  // As the plan screen passes the goal: each dish at most 600 kcal (Menu.goalFilter), and the day as a whole.
  const lightDish = (r: Recipe) => { const k = nutritionOf(r).perServing.kcal; return k > 0 && k <= 600; };
  const plan = { ...DEFAULT_MENU_PLAN, meals: ["breakfast", "lunch", "dinner"], quickWeekdays: false, cookAhead: false } as MenuPlan;
  const dayKcal = (days: MenuDay[]) => days.map((d) => d.items.reduce((s, it) => s + nutritionOf(recipeById(it.recipeId)!).perServing.kcal, 0));
  const before = weeks({ ...plan, only: lightDish } as MenuPlan, 24).flatMap(dayKcal);
  const after = weeks({ ...plan, only: lightDish, light: true } as MenuPlan, 24).flatMap(dayKcal);
  const avg = (l: number[]) => Math.round(l.reduce((s, x) => s + x, 0) / l.length);
  const over = (l: number[]) => l.filter((x) => x > 1500).length;
  console.log("day kcal before", avg(before), "over 1500:", over(before), "/", before.length, "· after", avg(after), "over:", over(after), "max", Math.max(...after), "min", Math.min(...after), "under 1200:", after.filter((x) => x < 1200).length, "under 1000:", after.filter((x) => x < 1000).length);
  // Each dish under 600 kcal alone left most days under 1200 (even 600 kcal for a whole day): now a light day is a day's food.
  const out = after.filter((x) => x < 1200 || x > 1500).length;
  expect(out).toBeLessThanOrEqual(Math.ceil(after.length * 0.05));
});

test("the shopping list says amounts a person can buy", () => {
  for (const days of weeks({ ...DEFAULT_MENU_PLAN, meals: ["breakfast", "lunch", "dinner"], quickWeekdays: true, cookAhead: false }, 8)) {
    const lines = menuShopping(days, [], [...basics(DEFAULT_PREFERENCES)]).map(shopLine);
    for (const l of lines) {
      expect(l.text).not.toMatch(/(^|\s)0[,.]\d/); // not «0,33 г» of coriander
      expect(l.text).not.toMatch(/\d[,.]\d\d/);
      if (/шт/.test(l.text)) expect(parseInt(l.text)).toBeLessThanOrEqual(15); // more is said in kilograms
    }
    expect(lines.filter((l) => l.name === "Лимон").length).toBeLessThanOrEqual(1); // lemon juice goes into the lemons
  }
});
