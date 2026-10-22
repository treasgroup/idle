// «Получится …» on a recipe page after scaling to the number of eaters (app/yieldLine).
import { describe, expect, it } from "vitest";
import { yieldLine } from "../app/yieldLine";

const r = (amount: number, unit: string, servings: number) => ({ servings, yields: { amount, unit } });

describe("yield line", () => {
  it("a whole pan at its own number of eaters", () => {
    expect(yieldLine(r(1, "форма 22 см", 6), 6)).toBe("Получится форма 22 см.");
  });
  it("a whole pan for fewer or more eaters says how much of it", () => {
    expect(yieldLine(r(1, "форма 22 см", 6), 4)).toBe("Целиком рецепт — форма 22 см на 6 человек, на 4 человека — примерно две трети.");
    expect(yieldLine(r(1, "торт 20 см", 8), 4)).toMatch(/примерно половина\.$/);
    expect(yieldLine(r(1, "форма 22 см", 6), 12)).toMatch(/вдвое больше\.$/);
  });
  it("counted things are whole and declined", () => {
    expect(yieldLine(r(24, "фрикадельки", 4), 2)).toBe("Получится около 12 фрикаделек.");
    expect(yieldLine(r(2, "рулета", 4), 2)).toBe("Получится около 1 рулет.");
    expect(yieldLine(r(4, "шницели", 4), 2)).toBe("Получится около 2 шницеля.");
    expect(yieldLine(r(7, "шт.", 2), 3)).toBe("Получится около 11 шт.");
    expect(yieldLine(r(4, "форма 400 мл", 4), 2)).toBe("Получится около 2 формы 400 мл.");
  });
  it("litres keep a tenth", () => {
    expect(yieldLine(r(3, "л", 6), 4)).toBe("Получится около 2 л.");
    expect(yieldLine(r(1.3, "л", 2), 3)).toBe("Получится около 2 л.");
    expect(yieldLine(r(1, "л", 2), 3)).toBe("Получится около 1,5 л.");
  });
});
