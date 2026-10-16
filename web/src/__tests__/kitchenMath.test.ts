import { describe, expect, it } from "vitest";
import { gramsHint, measureAnswer, roastAnswer } from "../app/kitchenMath";

describe("cups and spoons", () => {
  it("reads family-book lines", () => {
    expect(gramsHint("Мука — 2 стакана")).toBe("≈ 260 г");
    expect(gramsHint("2 стакана муки")).toBe("≈ 260 г");
    expect(gramsHint("3 ст. л. сахара")).toBe("≈ 75 г");
    expect(gramsHint("полстакана молока")).toBe("≈ 100 мл");
    expect(gramsHint("Соль — 1 ч. л.")).toBe("≈ 8 г");
    expect(gramsHint("Масло сливочное — 200 г")).toBeNull();
    expect(gramsHint("Яйца — 3 шт.")).toBeNull();
  });
  it("answers questions", () => {
    expect(measureAnswer("сколько грамм в стакане муки?")).toContain("130 г");
    expect(measureAnswer("2 ст. л. сахара это сколько")).toContain("50 г");
    expect(measureAnswer("что приготовить на ужин")).toBeNull();
  });
});

describe("roasting", () => {
  it("counts by weight", () => {
    expect(roastAnswer("сколько запекать курицу 1,8 кг")).toContain("190 °C");
    expect(roastAnswer("сколько запекать курицу 1,8 кг")).toContain("1 ч 30 мин");
    expect(roastAnswer("сколько запекать свинину")).toContain("на каждый килограмм");
    expect(roastAnswer("сколько запекать картошку в духовке")).toContain("35 мин");
    expect(roastAnswer("рецепт курицы")).toBeNull();
  });
});

import { minutesIn } from "../app/timers";
describe("minutes in a reply", () => {
  it("counts hours and ignores teaspoons", () => {
    expect(minutesIn("примерно 1 ч 30 мин. Дайте полежать")).toBe(90);
    expect(minutesIn("варить 2 часа")).toBe(120);
    expect(minutesIn("добавьте 1 ч. л. соли и варите 10 мин")).toBe(10);
    expect(minutesIn("4 четверти и 15 минут")).toBe(15);
    expect(minutesIn("варите 5–7 минут")).toBe(7);
  });
});
