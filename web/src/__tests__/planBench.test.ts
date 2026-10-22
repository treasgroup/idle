// A bench for the week plan and its shopping list: hundreds of weeks made with different settings, months and
// households, checked the way a person would look at them. Writes a report (C:/Users/fensi/AppData/Local/Temp/cw/
// plan-bench.txt); runs only with PLAN_BENCH=1 (npx vitest run planBench).
import { writeFileSync } from "node:fs";
import { beforeAll, test } from "vitest";
import {
  DEFAULT_MENU_PLAN, DEFAULT_PREFERENCES, basics, courseOf, generateMenu, isItalian, isUnusual, mainIngredientOf, menuShopping, nutritionOf, recipeById,
  type MenuDay, type MenuPlan, type Recipe,
} from "../engine";
import { shopLine } from "../app/amounts";
import { loadCatalog } from "./chefTurn";

beforeAll(loadCatalog);

const week = (y: number, m: number, d: number): MenuDay[] => Array.from({ length: 7 }, (_, i) => {
  const t = new Date(y, m, d + i, 12);
  return { date: t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"), items: [] };
});
const COLD = /(окрошк|свекольник холодн|холодн\S* суп|суп холодн|гаспачо|таратор|ботвинь|холодник)/i;
const PROTEIN: [string, RegExp][] = [["курица", /куриц|курин|цыпл|бедр|грудк|крыл/i], ["свинина", /свин/i], ["говядина", /говя|телят/i], ["фарш", /фарш|котлет|тефтел|фрикадел/i], ["рыба", /рыб|минтай|треск|горбуш|лосос|хек|судак|скумбри|сельд|тунец|кета/i], ["индейка", /индейк/i]];
const proteinOf = (r: Recipe) => PROTEIN.find(([, re]) => re.test(r.title + " " + (mainIngredientOf(r) ?? "")))?.[0] ?? null;

test.skipIf(!process.env.PLAN_BENCH)("plan: bench", () => {
  const bad: Record<string, string[]> = {}, seen: Record<string, number> = {};
  const fail = (k: string, s: string) => { (bad[k] ??= []).push(s); };
  const lines: string[] = [];
  let weeks = 0;
  const settings: { name: string; plan: MenuPlan }[] = [
    { name: "ужины", plan: { ...DEFAULT_MENU_PLAN, meals: ["dinner"], quickWeekdays: false, cookAhead: false } },
    { name: "ужины, быстрые будни", plan: { ...DEFAULT_MENU_PLAN, meals: ["dinner"], quickWeekdays: true, cookAhead: false } },
    { name: "обед+ужин, впрок", plan: { ...DEFAULT_MENU_PLAN, meals: ["lunch", "dinner"], quickWeekdays: false, cookAhead: true } },
    { name: "завтрак+обед+ужин", plan: { ...DEFAULT_MENU_PLAN, meals: ["breakfast", "lunch", "dinner"], quickWeekdays: true, cookAhead: false } },
  ];
  const months: [string, number][] = [["январь", 0], ["апрель", 3], ["июль", 6], ["октябрь", 9]];
  for (const { name, plan } of settings) for (const [mName, m] of months) for (const servings of [1, 2, 4]) for (let seed = 1; seed <= 6; seed++) {
    const days = generateMenu(week(2026, m, 5), DEFAULT_PREFERENCES, servings, seed * 7919 + m * 31 + servings, plan);
    weeks++;
    const tag = `[${name} · ${mName} · ${servings} чел · #${seed}]`;
    const all = days.flatMap((d) => d.items.map((it) => ({ d, it, r: recipeById(it.recipeId)! }))).filter((x) => x.r);
    const cooked = all.filter((x) => !x.it.leftover);
    // Empty meals
    for (const d of days) for (const meal of plan.meals) if (!d.items.some((it) => (it.meal ?? "dinner") === meal)) fail("пустой приём пищи", tag + " " + d.date + " " + meal);
    // Repeats
    const ids = cooked.map((x) => x.r.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) fail("одно блюдо дважды", tag + " " + dup.map((id) => recipeById(id)!.title).join(", "));
    const kinds = cooked.filter((x) => (x.it.meal ?? "dinner") !== "breakfast").map((x) => x.r.title.split(/[\s,«]/)[0].toLowerCase());
    const twice = [...new Set(kinds.filter((k, i) => kinds.indexOf(k) !== i))].filter((k) => !/^(суп|салат|курица|паста|рис|каша|запеканка)$/.test(k));
    if (twice.length) fail("одно и то же блюдо в двух видах", tag + " " + twice.join(", "));
    // Rules of the plan
    if (cooked.filter((x) => isUnusual(x.r)).length > 1) fail("больше одного необычного", tag + " " + cooked.filter((x) => isUnusual(x.r)).map((x) => x.r.title).join(", "));
    if (cooked.filter((x) => isItalian(x.r)).length > 2) fail("больше двух итальянских", tag + " " + cooked.filter((x) => isItalian(x.r)).map((x) => x.r.title).join(", "));
    if ([9, 10, 11, 0, 1, 2, 3].includes(m) && cooked.some((x) => COLD.test(x.r.title))) fail("холодный суп не по сезону", tag + " " + cooked.filter((x) => COLD.test(x.r.title)).map((x) => x.r.title).join(", "));
    // Slots
    for (const x of cooked) {
      const meal = x.it.meal ?? "dinner", c = courseOf(x.r);
      if (meal === "breakfast" && ["soup", "main"].includes(c) && !/омлет|яичниц|сырник|блин|оладь|каш|запеканк|тост|гренк|драник/i.test(x.r.title)) fail("на завтрак обед", tag + " " + x.r.title + " [" + c + "]");
      if (meal !== "breakfast" && ["side", "sauce", "drink", "snack", "dessert"].includes(c)) fail("на обед/ужин не блюдо", tag + " " + meal + ": " + x.r.title + " [" + c + "]");
      if (meal !== "breakfast" && c === "breakfast") fail("на обед/ужин завтрак", tag + " " + meal + ": " + x.r.title);
    }
    // Quick weekdays: a weekday dinner over an hour; any dinner over three
    for (const x of cooked) {
      const wd = new Date(x.d.date + "T12:00").getDay();
      if (plan.quickWeekdays && wd >= 1 && wd <= 5 && (x.it.meal ?? "dinner") === "dinner" && x.r.totalMinutes > 60) fail("долгий ужин в будний день", tag + " " + x.d.date + " " + x.r.title + " " + x.r.totalMinutes + " мин");
      if (wd >= 1 && wd <= 5 && x.r.totalMinutes > 120) fail("будний день: блюдо дольше 2 часов", tag + " " + x.d.date + " " + x.r.title + " " + x.r.totalMinutes + " мин");
      if (x.r.totalMinutes > 240) fail("блюдо дольше 4 часов", tag + " " + x.r.title + " " + x.r.totalMinutes + " мин");
    }
    // Balance: the same protein more than three dinners; soups more than three dinners; the same protein two days running
    const dinners = days.map((d) => d.items.filter((it) => (it.meal ?? "dinner") === "dinner" && !it.leftover).map((it) => recipeById(it.recipeId)!).filter(Boolean)[0] ?? null);
    const prot = dinners.map((r) => (r ? proteinOf(r) : null));
    for (const p of new Set(prot.filter(Boolean))) if (prot.filter((x) => x === p).length > 3) fail("один белок больше 3 ужинов", tag + " " + p + ": " + dinners.filter((r) => r && proteinOf(r) === p).map((r) => r!.title).join(", "));
    for (let i = 1; i < prot.length; i++) if (prot[i] && prot[i] === prot[i - 1]) { fail("один белок два дня подряд", tag + " " + prot[i] + ": " + dinners[i - 1]!.title + " → " + dinners[i]!.title); break; }
    if (dinners.filter((r) => r && courseOf(r) === "soup").length > 3) fail("супов на ужин больше трёх", tag);
    // A day's calories per person
    for (const d of days) {
      const k = d.items.reduce((s, it) => { const r = recipeById(it.recipeId); return s + (r ? nutritionOf(r).perServing.kcal : 0); }, 0);
      if (plan.meals.length === 3 && (k > 2600 || k < 700)) fail("калории за день странные", tag + " " + d.date + " " + k + " ккал");
    }
    // Shopping list
    const list = menuShopping(days, [], [...basics(DEFAULT_PREFERENCES)]); // as the app: salt, water, oil… are at home
    const shown = list.map((i) => ({ i, l: shopLine(i) }));
    for (const { l } of shown) {
      if (/\d[.,]\d\d/.test(l.text)) fail("покупки: дробь с сотыми", tag + " " + l.name + " " + l.text);
      if (/шт/.test(l.text) && /\d[,.]\d/.test(l.text) && !/≈|половин/.test(l.text)) fail("покупки: дробные штуки", tag + " " + l.name + " " + l.text);
      if (/(^|s)0[,.]d/.test(l.text)) fail("покупки: крошечное количество", tag + " " + l.name + " " + l.text);
      if (/^(вода|соль)$/i.test(l.name)) fail("покупки: вода или соль", tag + " " + l.name);
      if (/шт/.test(l.text) && parseInt(l.text) > 20) fail("покупки: слишком много штук", tag + " " + l.name + " " + l.text);
    }
    const names = shown.map((x) => x.l.name.toLowerCase());
    const twiceNames = [...new Set(names.filter((n, k) => names.indexOf(n) !== k))];
    if (twiceNames.length) fail("покупки: один продукт двумя строками", tag + " " + twiceNames.map((n) => n + ": " + shown.filter((x) => x.l.name.toLowerCase() === n).map((x) => x.l.text).join(" / ")).join("; "));
    if (list.length > 45) fail("покупки: слишком длинный список", tag + " " + list.length + " строк");
    seen[name] = (seen[name] ?? 0) + list.length;
    if (seed === 1 && servings === 2) lines.push(tag + "\n  " + days.map((d) => d.date.slice(5) + ": " + d.items.map((it) => (it.meal ?? "dinner")[0] + (it.leftover ? "↺" : "") + " " + (recipeById(it.recipeId)?.title ?? "?")).join(" | ")).join("\n  ") + "\n  ПОКУПКИ (" + list.length + "): " + shown.map((x) => x.l.name + " " + x.l.text).join("; "));
  }
  const report = ["НЕДЕЛЬ " + weeks, "", ...Object.entries(bad).sort((a, b) => b[1].length - a[1].length).flatMap(([k, v]) => ["## " + k + " (" + v.length + ")", ...v.slice(0, 25), ""]), "## ПРИМЕРЫ", ...lines];
  writeFileSync("C:/Users/fensi/AppData/Local/Temp/cw/plan-bench.txt", report.join("\n"));
  console.log("PLAN weeks " + weeks + " | " + Object.entries(bad).map(([k, v]) => k + ":" + v.length).join(", "));
});
