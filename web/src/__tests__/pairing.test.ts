import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, expect, test } from "vitest";
import { catalogSides, drinkAnswer, sideAnswer } from "../app/pairing";
import { buildCatalog, courseOf, recipes, useCatalog } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));
const by = (t: string) => recipes().find((r) => r.title.startsWith(t))!;

test("catalog sides suit the dish", () => {
  const fish = catalogSides(by("Рыба жареная в муке"));
  expect(fish.length).toBe(2);
  expect(fish.every((r) => courseOf(r) === "side")).toBe(true);
  expect(catalogSides(by("Котлеты домашние")).map((r) => r.title)).toContain("Отварной картофель с укропом");
  // Nothing the person does not eat.
  expect(catalogSides(by("Котлеты домашние"), ["dairy"]).some((r) => r.allergens.includes("dairy"))).toBe(false);
});

test("Шеф: «гарнир к котлетам», «что выпить»", () => {
  const a = sideAnswer("гарнир к котлетам")!;
  console.log(a.text, a.results.map((m) => m.recipe.title));
  expect(a.text).toMatch(/Котлет/);
  expect(a.results.length).toBe(3);
  expect(a.results.every((m) => courseOf(m.recipe) === "side")).toBe(true);
  const b = sideAnswer("с чем подать рыбу")!;
  console.log(b.text, b.results.map((m) => m.recipe.title));
  expect(b.results.length).toBeGreaterThan(0);
  expect(sideAnswer("какой гарнир сделать")!.results.length).toBe(3);
  expect(sideAnswer("хочу курицу с картошкой")).toBeNull();
  const w = drinkAnswer("что выпить", new Date(2026, 10, 5))!;
  console.log(w.text, w.results.map((m) => m.recipe.title));
  expect(w.results.every((m) => courseOf(m.recipe) === "drink")).toBe(true);
  expect(drinkAnswer("компот из яблок")).toBeNull();
});
