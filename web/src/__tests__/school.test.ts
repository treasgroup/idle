import { describe, expect, it } from "vitest";
import { BEGINNER, LESSONS } from "../screens/learn-data";
import { RESCUE_GROUPS, ALL_TROUBLES } from "../app/rescue";

describe("Школа готовки", () => {
  it("lessons are short card decks with a question", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(l.cards.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.cards.length, l.id).toBeLessThanOrEqual(5);
      expect(l.quiz.length, l.id).toBeGreaterThanOrEqual(1);
      for (const c of l.cards) {
        expect(c.title.length, l.id + ": " + c.title).toBeLessThanOrEqual(60);
        expect(c.text.length, l.id + ": " + c.text).toBeLessThanOrEqual(160);
      }
      for (const q of l.quiz) expect(q.right, l.id).toBeLessThan(q.options.length);
      expect(l.recipes.length, l.id).toBeGreaterThan(0);
    }
  });
  it("the old lesson ids stay (progress is kept)", () => {
    for (const id of ["knife", "eggs", "grains", "pasta", "pan", "chicken", "soup", "salad", "batter", "oven", "sauce", "breakfast", "storage", "menu"])
      expect(LESSONS.some((l) => l.id === id), id).toBe(true);
    for (const id of BEGINNER) expect(LESSONS.some((l) => l.id === id), id).toBe(true);
  });
  it("«Спасение» shows every answer", () => {
    const shown = new Set(RESCUE_GROUPS.flatMap((g) => g.items.map((t) => t.id)));
    for (const t of ALL_TROUBLES) expect(shown.has(t.id), t.id).toBe(true);
  });
});
