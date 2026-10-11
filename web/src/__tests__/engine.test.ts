// Checks the engine on the real catalog: every file is valid, requests are understood, the week menu is built.
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
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
});

describe("receipt import", () => {
  it("finds products in a pasted receipt and skips service lines", () => {
    const ids = ingredientOptions().map((o) => o.id);
    const found = parseReceipt("СМЕТАНА 20% 300Г   89,90\nМОЛОКО 2,5% 930МЛ 79,99\nморковь, лук, кефир\nИТОГО 600,00\nКассир Иванова", ids);
    expect(found).toEqual(expect.arrayContaining(["sour-cream", "milk", "carrot", "onion", "kefir"]));
    expect(found.length).toBe(5);
  });
});
