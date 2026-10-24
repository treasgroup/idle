import { describe, expect, it } from "vitest";
import { ALL_TROUBLES, troublesFor } from "../app/rescue";
import type { Recipe } from "../engine";

const dish = (p: Omit<Partial<Recipe>, "steps"> & { ids?: string[]; steps?: string[] }): Recipe => ({
  id: "x", title: "Блюдо", course: "main", mainIngredient: "", ...p,
  ingredients: (p.ids ?? []).map((id) => ({ id, name: id, amount: 1, unit: "г", optional: false })),
  steps: (p.steps ?? ["Готовьте."]).map((text) => ({ text })),
} as unknown as Recipe);
const titles = (r: Recipe) => troublesFor(r).map((t) => t.title);

describe("Спасти блюдо: котлеты", () => {
  it("cutlets and meatballs get «Котлеты разваливаются» first", () => {
    expect(titles(dish({ title: "Котлеты куриные", mainIngredient: "chicken-fillet", steps: ["Обжарьте котлеты."] }))[0]).toBe("Котлеты разваливаются");
    expect(titles(dish({ title: "Суп с фрикадельками", course: "soup" }))).not.toContain("Котлеты разваливаются");
  });
});

describe("Спасти блюдо", () => {
  it("fits the dish", () => {
    const pilaf = titles(dish({ title: "Плов с говядиной", mainIngredient: "beef", ids: ["rice", "beef"], steps: ["Обжарьте мясо.", "Засыпьте рис."] }));
    expect(pilaf).toContain("Рис не доварился, а вода ушла");
    expect(pilaf).toContain("Мясо жёсткое");
    expect(titles(dish({ title: "Борщ", course: "soup", steps: ["Обжарьте свёклу."] }))).toContain("Пресный вкус");
    expect(titles(dish({ title: "Пирог с яблоками", course: "baking", ids: ["yeast", "wheat-flour"] }))).toContain("Тесто не поднимается");
    expect(titles(dish({ title: "Шарлотка", course: "baking", ids: ["wheat-flour"] }))).not.toContain("Тесто не поднимается");
    expect(titles(dish({ title: "Блины на молоке", course: "breakfast", steps: ["Жарьте блины."] }))).toContain("Блины рвутся или прилипают");
    expect(titles(dish({ title: "Салат с огурцами", course: "salad" }))).not.toContain("Подгорело");
  });
  it("drinks get their own, not «Пересолено»", () => {
    expect(titles(dish({ title: "Компот из яблок", course: "drink" }))).toEqual(["Слишком сладко", "Несладко или пресно"]);
  });
  it("always 2–6, with «Пересолено»", () => {
    for (const r of [dish({}), dish({ course: "soup" }), dish({ course: "dessert" }), dish({ title: "Плов", mainIngredient: "beef", steps: ["Обжарьте мясо"] })]) {
      const list = troublesFor(r);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.length).toBeLessThanOrEqual(6);
      expect(list.some((t) => t.title === "Пересолено")).toBe(true);
    }
  });
  it("short answers", () => {
    for (const t of ALL_TROUBLES) {
      expect(t.steps.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.steps.length, t.id).toBeLessThanOrEqual(3);
      for (const s of t.steps) expect(s.length, t.id + ": " + s).toBeLessThanOrEqual(120);
    }
  });
});
