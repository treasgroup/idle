// Checks the engine on the real catalog: every file is valid, requests are understood, the week menu is built.
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_STATE, buildCatalog, cleanMessage, generateMenu, parseMessage, rankRecipes, recipes, respond, useCatalog, weekDays,
  type Recipe,
} from "../engine";
import { parseReceipt } from "../screens/Pantry";
import { ingredientOptions } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) }));

function ask(text: string) {
  const s = structuredClone(DEFAULT_STATE);
  const message = cleanMessage(text);
  const patch = parseMessage(message, s.conditions);
  return respond({ message, patch, reply: patch.reply, local: true, conditions: s.conditions, preferences: s.preferences, conversation: [], guess: null, focus: null, voice: false });
}

beforeAll(() => useCatalog(buildCatalog(files)));

describe("catalog", () => {
  it("loads every recipe of the new batch without errors", () => {
    const built = buildCatalog(files);
    expect(built.errors.filter((e) => e.file.startsWith("20-"))).toEqual([]);
    expect(built.recipes.length).toBeGreaterThan(700);
  });
});

describe("requests", () => {
  it("'без' applies to what follows, not to the product before it", () => {
    const r = ask("курица без духовки");
    expect(r.conditions.desired).toContain("chicken");
    expect(r.conditions.excluded).not.toContain("chicken");
    expect(r.results.every((m: { recipe: Recipe }) => !m.recipe.appliances.includes("oven"))).toBe(true);
  });
  it("'не хочу' still excludes what was named before it", () => {
    expect(ask("курицу не хочу").conditions.excluded).toContain("chicken");
  });
  it("finds recipes for an appliance the profile does not list", () => {
    const r = ask("картошка в аэрогриле");
    expect(r.results.map((m: { recipe: Recipe }) => m.recipe.id)).toContain("airfryer-potato-wedges");
  });
  it("says plainly when the products never meet in one dish", () => {
    const r = ask("есть курица, картошка и сметана, минут 40");
    expect(r.text).toMatch(/^Блюда сразу с курицей, (картофелем|картошкой) и сметаной за 40 минут нет\. Вот что получится из части продуктов:/);
    expect(r.text).not.toMatch(/Подобрал|Блюд, где|под эти условия/);
    for (const o of r.options ?? []) expect(o.label).not.toMatch(/^Сразу с /);
    const minced = ask("есть кабачок, фарш и рис, минут 30");
    expect(minced.text).toContain("с кабачком, фаршем и рисом");
  });
  it("says the time of the quickest dish the way people read it", () => {
    const r = ask("хочу с креветками и грибами за 15 минут");
    expect(r.text).toMatch(/^За 15 минут ничего не успеть\. Самое быстрое — /);
    expect(r.text).not.toMatch(/\d{3,} минут/);
  });
  it("answers kitchen questions written casually", () => {
    const r = ask("скока варить яйца");
    expect(r.kind).toBe("talk");
    expect(r.text).toMatch(/минут/);
  });
  it("hides appliance recipes from people without the appliance", () => {
    const s = structuredClone(DEFAULT_STATE);
    const all = rankRecipes(recipes(), { ...s.conditions }, s.preferences, Infinity);
    expect(all.some((m) => m.recipe.appliances.includes("airfryer"))).toBe(false);
  });
});

describe("week menu", () => {
  it("fills seven dinners without repeating a dish", () => {
    const s = structuredClone(DEFAULT_STATE);
    const menu = generateMenu(weekDays([]).map((d) => ({ date: d.date, items: [] })), s.preferences, 2, 12345, s.menuPlan);
    const cooked = menu.flatMap((d) => d.items.filter((i) => !i.leftover).map((i) => i.recipeId));
    expect(menu.filter((d) => d.items.length).length).toBe(7);
    expect(new Set(cooked).size).toBe(cooked.length);
  });
  it("keeps cold soups to the warm months, unusual dishes to one a week and Italian to two", () => {
    const s = structuredClone(DEFAULT_STATE);
    const week = (from: string) => Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.parse(from) + i * 864e5).toISOString().slice(0, 10), items: [] }));
    const titles = (m: { items: { recipeId: string }[] }[]) => m.flatMap((d) => d.items.map((i) => recipes().find((r) => r.id === i.recipeId)?.title ?? ""));
    const odd = /чапче|пад тай|том ям|рамен|мисо|тайск|карри|тако|буррито|кесадиль|фо бо|удон|соба|тофу/i;
    let summerCold = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const october = titles(generateMenu(week("2026-10-19"), s.preferences, 2, seed, s.menuPlan));
      expect(october.filter((t) => /окрошк|холодник|свекольник холодн|гаспачо/i.test(t))).toEqual([]);
      expect(october.filter((t) => odd.test(t)).length).toBeLessThanOrEqual(1);
      expect(october.filter((t) => /(?<![а-яё])паст[аыу](?![а-яё])|спагетти|ризотто|лазань|равиоли|ньокки|карбонар|аранчини|минестроне/i.test(t)).length).toBeLessThanOrEqual(2);
      // A summer plan is made in summer: Шеф's ranking reads today's month, so the clock is set to July for it.
      vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-07-12T10:00:00"));
      summerCold += titles(generateMenu(week("2026-07-13"), s.preferences, 2, seed, s.menuPlan)).filter((t) => /окрошк|холодник|свекольник холодн|гаспачо/i.test(t)).length;
      vi.useRealTimers();
    }
    expect(summerCold).toBeGreaterThan(0);
  }, 30000); // 80 week menus: slow when the other test files run alongside
});

describe("receipt import", () => {
  it("finds products in a pasted receipt and skips service lines", () => {
    const ids = ingredientOptions().map((o) => o.id);
    const found = parseReceipt("СМЕТАНА 20% 300Г   89,90\nМОЛОКО 2,5% 930МЛ 79,99\nморковь, лук, кефир\nИТОГО 600,00\nКассир Иванова", ids);
    expect(found).toEqual(expect.arrayContaining(["sour-cream", "milk", "carrot", "onion", "kefir"]));
    expect(found.length).toBe(5);
  });
});
