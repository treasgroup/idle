import { readFileSync, readdirSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { habits, personalScorer, resetTaste, signal, traits, understood, forgetTrait } from "../app/personal";
import { isColdSoup, weatherLine, weatherScore, type Weather } from "../app/weather";
import { courseOf } from "../engine";
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

afterEach(() => { vi.useRealTimers(); });

test("habits by the day of the week come from what was really cooked", () => {
  const all = recipes();
  const baking = all.filter((r) => courseOf(r) === "baking").slice(0, 4);
  const other = all.filter((r) => courseOf(r) === "soup" || courseOf(r) === "main").slice(0, 8);
  vi.useFakeTimers();
  // Three Sundays of baking, weekdays of soups and mains (2026-09-06 was a Sunday).
  for (let w = 0; w < 3; w++) {
    vi.setSystemTime(new Date(2026, 8, 6 + w * 7, 13, 0));
    signal(baking[w], "done");
    for (let d = 1; d <= 2; d++) { vi.setSystemTime(new Date(2026, 8, 6 + w * 7 + d, 19, 0)); signal(other[w * 2 + d - 1], "done"); }
  }
  vi.setSystemTime(new Date(2026, 9, 4, 12, 0));
  const h = habits();
  expect(h.map((x) => x.when + " — " + x.label)).toContain("по воскресеньям — выпечка");
  expect(understood().habits.length).toBe(h.length);
  forgetTrait(h.find((x) => x.when === "по воскресеньям")!.key);
  expect(habits().some((x) => x.when === "по воскресеньям" && x.label === "выпечка")).toBe(false);
});

test("the weather nudges soups in the cold and cold soups in the heat", () => {
  const all = recipes();
  const hot = all.find((r) => courseOf(r) === "soup" && !isColdSoup(r) && r.tags.includes("hearty"))!;
  const cold = all.find(isColdSoup)!;
  expect(cold).toBeTruthy();
  const w = (max: number): Weather => ({ t: max, max, min: max - 5, rain: false, snow: false, at: Date.now() });
  expect(weatherScore(hot, w(-2))).toBeGreaterThan(weatherScore(cold, w(-2)));
  expect(weatherScore(cold, w(30))).toBeGreaterThan(weatherScore(hot, w(30)));
  expect(weatherScore(hot, null)).toBe(0);
  expect(weatherLine(w(18))).toBeNull();
  expect(weatherLine(w(-3))).toContain("−3°");
});
