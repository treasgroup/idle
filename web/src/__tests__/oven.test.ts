// The oven is turned on a step before baking when the recipe never says so (app/oven), and figures for shares of a
// product become amounts (app/stepAmounts).
import { expect, test } from "vitest";
import type { Recipe, RecipeIngredient } from "../engine";
import { ovenAhead, ovenLine } from "../app/oven";
import { withAmounts } from "../app/stepAmounts";

const recipe = (...steps: string[]) => ({ steps: steps.map((text) => ({ text })) } as unknown as Recipe);

test("turn the oven on a step ahead", () => {
  const r = recipe("Нарежьте курицу.", "Сверните энчиладас.", "Запекайте при 190 °C 25 минут.");
  expect(ovenLine(ovenAhead(r), 1)).toBe("Включите духовку на 190 °C — она понадобится на следующем шаге.");
  expect(ovenLine(ovenAhead(r), 0)).toBeNull();
  expect(ovenLine(ovenAhead(recipe("Запеките свёклу в фольге при 200 °C 60 минут.")), 0)).toMatch(/сразу/);
});

test("not when the recipe says it in time", () => {
  expect(ovenAhead(recipe("Разогрейте духовку до 180 °C. Нарежьте.", "Запекайте 20 минут."))).toBeNull();
  expect(ovenAhead(recipe("Поставьте горшочки в холодную духовку и включите 180 °C."))).toBeNull();
  expect(ovenAhead(recipe("Замаринуйте.", "За 15 минут до конца маринования разогрейте духовку до 180 °C и запекайте."))).toBeNull();
  expect(ovenAhead(recipe("Нарежьте.", "Выпекайте в заранее разогретой духовке при 180 °C."))).not.toBeNull();
});

test("«11/13 муки» is grams of flour", () => {
  const lines = [{ id: "wheat-flour", name: "Мука", amount: 260, unit: "г" }, { id: "water", name: "Вода", amount: 1130, unit: "мл" }] as RecipeIngredient[];
  expect(withAmounts("Смешайте 11/13 муки с разрыхлителем.", lines)).toMatch(/^Смешайте 220 г муки/);
  expect(withAmounts("Для варки используйте 100/113 всей воды, остальные 13/113 сохраните для теста.", lines))
    .toBe("Для варки используйте 1 л воды, остальные 130 мл воды сохраните для теста.");
});
