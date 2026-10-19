import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, beforeEach, expect, test } from "vitest";
import { personalScorer, resetTaste, signal, traits, understood, forgetTrait } from "../app/personal";
import { buildCatalog, recipes, useCatalog } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));

const store: Record<string, string> = {};
beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
    clear: () => {}, key: () => null, length: 0,
  } as Storage;
  (globalThis as unknown as { window: unknown }).window = { dispatchEvent: () => true };
  resetTaste();
});

test("liked traits lift similar dishes; muted traits stop counting", () => {
  const all = recipes();
  const soups = all.filter((r) => traits(r).includes("course:soup"));
  const sweets = all.filter((r) => traits(r).includes("course:dessert") || traits(r).includes("course:baking"));
  expect(soups.length).toBeGreaterThan(3);
  for (const r of soups.slice(0, 3)) { signal(r, "done"); signal(r, "liked"); }
  for (const r of sweets.slice(0, 2)) signal(r, "meh");
  const tuesdayNoon = new Date(2026, 9, 20, 12, 0);
  const score = personalScorer([], tuesdayNoon);
  const newSoup = soups[soups.length - 1], aSweet = sweets[sweets.length - 1];
  expect(score(newSoup)).toBeGreaterThan(score(aSweet));
  const u = understood();
  expect(u.likes.map((x) => x.label)).toContain("супы");
  forgetTrait("course:soup");
  expect(understood().likes.map((x) => x.label)).not.toContain("супы");
});

test("what was cooked in the last days goes down; weekday evenings prefer quick", () => {
  const all = recipes();
  const r = all[0];
  const now = new Date(2026, 9, 20, 19, 0);
  const s1 = personalScorer([], now)(r);
  const s2 = personalScorer([{ id: "x", recipeId: r.id, title: r.title, at: now.getTime() - 3600e3 }], now)(r);
  expect(s2).toBeLessThan(s1 - 2);
  const quick = all.find((x) => x.totalMinutes <= 30)!, long = all.find((x) => x.totalMinutes > 120)!;
  const sc = personalScorer([], now);
  expect(sc(quick) - sc(long)).toBeGreaterThan(0.8);
});
