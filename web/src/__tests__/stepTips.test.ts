// «Секрет шефа» for the oven step: the dough tip only where there is dough (app/stepTips).
import { describe, expect, it } from "vitest";
import { stepTips } from "../app/stepTips";

const steps = (...texts: string[]) => texts.map((text) => ({ text })) as Parameters<typeof stepTips>[0]["steps"];

describe("oven tip", () => {
  it("meat and vegetables get the hot-oven tip, not the dough one", () => {
    const [tip] = stepTips({ course: "main", steps: steps("Включите духовку на 200 °C. Очистите картофель и морковь.") });
    expect(tip).toMatch(/уже разогретую духовку/);
    expect(tip).not.toMatch(/тесто/);
  });

  it("baking keeps the dough tip", () => {
    const [tip] = stepTips({ course: "baking", steps: steps("Разогрейте духовку до 180 °C.", "Взбейте яйца с сахаром.") });
    expect(tip).toMatch(/тесто не поднимется/);
  });

  it("a main dish with dough in its steps keeps the dough tip too", () => {
    const [tip] = stepTips({ course: "main", steps: steps("Разогрейте духовку до 250 °C.", "Раскатайте тесто в лодочку.") });
    expect(tip).toMatch(/тесто не поднимется/);
  });
});
