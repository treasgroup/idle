// What the plan bench (planBench.test.ts) found wrong in generated weeks and their shopping lists.
import { beforeAll, expect, test } from "vitest";
import { DEFAULT_MENU_PLAN, DEFAULT_PREFERENCES, basics, generateMenu, menuShopping, proteinOf, recipeById, type MenuDay, type MenuPlan } from "../engine";
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
