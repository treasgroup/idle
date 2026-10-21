// The catalog's recipes made easier to cook from: timers from the text, plain checks instead of thermometers,
// frying oil, honest time, amounts in «две пятых масла».
import { describe, expect, it } from "vitest";
import { tidyRecipe } from "../engine/tidy";
import { hasWait, timeLong, timeShort } from "../app/recipeTime";
import { withAmounts } from "../app/stepAmounts";
import type { Recipe } from "../engine";

const base = (over: Partial<Recipe>): Recipe => ({
  id: "x", title: "Курица в сметане", summary: "Нежная курица в соусе.", servings: 4, minServings: 1, maxServings: 8, totalMinutes: 40, activeMinutes: 30,
  difficulty: "easy", ingredients: [{ id: "chicken-fillet", name: "Куриное филе", amount: 500, unit: "г", optional: false }], appliances: ["pan"], tags: [], allergens: [],
  steps: [{ text: "Нарежьте курицу." }, { text: "Тушите" }], tips: [], version: "t", ...over,
});

describe("tidyRecipe", () => {
  it("puts a timer on a step that says how long, the longest one", () => {
    const r = tidyRecipe(base({ steps: [{ text: "Обжарьте лук 3 минуты, затем добавьте грибы и готовьте 7–8 минут." }, { text: "Варите полчаса на слабом огне." }, { text: "Храните в холодильнике не более 2 часов." }] }));
    expect(r.steps.map((s) => s.timerSeconds)).toEqual([7 * 60, 30 * 60, undefined]);
  });
  it("turns a thermometer into a check anyone can do", () => {
    const r = tidyRecipe(base({ steps: [{ text: "Перемешайте и проверьте курицу кухонным термометром: в центре самого толстого кусочка должно быть не менее 74 °C. Разложите по тарелкам." }, { text: "Жарьте 4 минуты, до 75 °C в центре." }] }));
    expect(r.steps[0].text).toBe("Проверьте готовность: надрежьте самый толстый кусочек — сок прозрачный, мясо внутри без розового. Разложите по тарелкам.");
    expect(r.steps[1].text).not.toMatch(/°C/);
    expect(r.steps[1].text).toMatch(/без розового/);
  });
  it("drops an optional thermometer after a check that is already there", () => {
    const r = tidyRecipe(base({ steps: [{ text: "Мякоть должна быть белой, без розовой середины. При наличии термометра проверьте температуру внутри — 75 °C." }, { text: "Тушите 5 минут." }] }));
    expect(r.steps[0].text).toBe("Мякоть должна быть белой, без розовой середины.");
  });
  it("says «в холодильнике» instead of degrees and drops the tip the storage line already says", () => {
    const r = tidyRecipe(base({ storageDays: 3, tips: ["Остатки уберите в холодильник в течение 2 часов. Храните при температуре не выше 4 °C до 3 дней.", "Сметану берите 15%. Храните при 0–4 °C."] }));
    expect(r.tips).toEqual(["Сметану берите 15%."]);
    expect(tidyRecipe(base({ tips: ["Храните при температуре не выше 4 °C до 3 дней."] })).tips).toEqual(["Храните в холодильнике до 3 дней."]);
  });
  it("counts only the oil the food takes in when deep frying", () => {
    const r = tidyRecipe(base({ ingredients: [{ id: "vegetable-oil", name: "Растительное масло, весь запас для фритюра", amount: 700, unit: "г", optional: false }, { id: "vegetable-oil", name: "Растительное масло", amount: 15, unit: "г", optional: false }] }));
    expect((r.ingredients[0] as { absorbed?: number }).absorbed).toBe(0.12);
    expect((r.ingredients[1] as { absorbed?: number }).absorbed).toBeUndefined();
  });
  it("takes «Детям» off spicy dishes and alcohol, not off «без вина»", () => {
    expect(tidyRecipe(base({ kids: true, tags: ["spicy"] })).kids).toBe(false);
    expect(tidyRecipe(base({ kids: true, ingredients: [{ id: "wine", name: "Сухое белое вино", amount: 100, unit: "мл", optional: false }] })).kids).toBe(false);
    expect(tidyRecipe(base({ kids: true, title: "Луковый суп без вина" })).kids).toBe(true);
    expect(tidyRecipe(base({ kids: true, title: "Свинина с картошкой" })).kids).toBe(true);
  });
});

describe("time and amounts on screen", () => {
  it("says the waiting apart from the work", () => {
    const r = base({ totalMinutes: 1500, activeMinutes: 40 });
    expect(hasWait(r)).toBe(true);
    expect(timeShort(r)).toBe("40 мин + ждать сутки");
    expect(timeLong(r)).toBe("40 мин у плиты, потом ждать сутки");
    expect(timeShort(base({ totalMinutes: 35, activeMinutes: 25 }))).toBe("35 мин");
  });
  it("adds the amount right after the product", () => {
    const lines = [{ id: "vegetable-oil", name: "Растительное масло", amount: 50, unit: "г", optional: false }, { id: "water", name: "Питьевая вода", amount: 1200, unit: "мл", optional: false }, { id: "potato", name: "Картофель", amount: 600, unit: "г", optional: false }];
    expect(withAmounts("Нагрейте две пятых растительного масла, выложите лук.", lines)).toBe("Нагрейте две пятых растительного масла (≈ 20 г, 1 ст. л.), выложите лук.");
    expect(withAmounts("Отложите одну шестую питьевой воды для соуса.", lines)).toBe("Отложите одну шестую питьевой воды (≈ 200 мл) для соуса.");
    expect(withAmounts("Подлейте одну десятую картофельного отвара.", lines)).toBe("Подлейте одну десятую картофельного отвара.");
  });
});
