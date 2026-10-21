import { describe, expect, it } from "vitest";
import { pickPrep } from "../app/mealPrep";
import type { Recipe } from "../engine";

const r = (id: string, course: string, main: string, storage: number, freezer: number, ings: string[]): Recipe =>
  ({ id, title: id, course, mainIngredient: main, storageDays: storage, freezerDays: freezer, totalMinutes: 60, activeMinutes: 20, ingredients: ings.map((x) => ({ id: x })) } as unknown as Recipe);
const pool = [
  r("borsch", "soup", "beef", 3, 90, ["beef", "beet", "cabbage"]), r("shchi", "soup", "beef", 3, 90, ["beef", "cabbage"]),
  r("lentil", "soup", "red-lentil", 3, 60, ["red-lentil", "carrot"]), r("pea", "soup", "split-pea", 3, 60, ["split-pea"]),
  r("cutlets", "main", "minced-pork-beef", 3, 90, ["minced-pork-beef", "bread"]), r("meatballs", "main", "minced-beef", 3, 90, ["minced-beef", "rice"]),
  r("plov", "main", "chicken-thigh-fillet", 1, 30, ["chicken-thigh-fillet", "rice", "carrot"]), r("pasta", "main", "pasta", 2, 0, ["pasta", "tomato"]),
  r("salad", "salad", "cucumber", 1, 0, ["cucumber"]),
];
const dates = ["d1", "d2", "d3", "d4", "d5"];

describe("Заготовки на неделю", () => {
  it("keeps food safe: fridge days fit storage, the last two only freeze", () => {
    for (let seed = 0; seed < 30; seed++) {
      const days = pickPrep(pool, dates, seed);
      expect(days.length).toBe(5);
      days.forEach((d, i) => {
        if (i < 3) expect(d.recipe.storageDays, d.recipe.id + " day " + (i + 1)).toBeGreaterThanOrEqual(i + 1);
        else expect(d.recipe.freezerDays, d.recipe.id).toBeGreaterThan(0);
      });
      expect(days.filter((d) => d.recipe.course === "soup").length).toBeLessThanOrEqual(2);
      expect(new Set(days.map((d) => d.recipe.mainIngredient)).size).toBe(5);
      expect(days.some((d) => d.recipe.course === "salad")).toBe(false);
    }
  });
  it("keeps the other days when one is replaced", () => {
    const a = pickPrep(pool, dates, 1);
    const keep = Object.fromEntries(a.filter((d) => d.date !== "d2").map((d) => [d.date, d.recipe.id]));
    const b = pickPrep(pool, dates, 99, keep);
    for (const d of b) if (d.date !== "d2") expect(d.recipe.id).toBe(keep[d.date]);
  });
});
