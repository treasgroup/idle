import { describe, expect, it } from "vitest";
import { splitRecipe } from "../app/ocr";
import * as core from "../engine/core.js";

describe("Семейная книга", () => {
  it("splits a recognised page into title, products and steps", () => {
    const r = splitRecipe("Блины бабушки Нины\nИнгредиенты:\nМолоко — 500 мл\nЯйца — 2 шт.\nПриготовление:\nЯйца взбить с сахаром.\nЖарить на сковороде\nс двух сторон.");
    expect(r.title).toBe("Блины бабушки Нины");
    expect(r.ingredients.split("\n")).toEqual(["Молоко — 500 мл", "Яйца — 2 шт."]);
    expect(r.steps.split("\n")).toEqual(["Яйца взбить с сахаром.", "Жарить на сковороде с двух сторон."]);
  });
  it("guesses products by amounts when there are no headings", () => {
    const r = splitRecipe("Сырники\nТворог 500 г\n2 яйца\nВсё смешать и обжарить.");
    expect(r.ingredients.split("\n")).toEqual(["Творог 500 г", "2 яйца"]);
    expect(r.steps).toBe("Всё смешать и обжарить.");
  });
  it("keeps only valid own recipes in the saved state", () => {
    const list = (core as unknown as { MyR: (v: unknown) => { id: string; title: string; people: number | null }[] }).MyR([
      { id: "my-abc123", title: " Наполеон ", people: 6, ingredients: "Мука", steps: "Испечь" },
      { id: "BAD ID", title: "x" }, { id: "my-zzzz", title: "" }, null, "junk",
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "my-abc123", title: "Наполеон", people: 6 });
  });
});
