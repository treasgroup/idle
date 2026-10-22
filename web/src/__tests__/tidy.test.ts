// The catalog's recipes made easier to cook from: timers from the text, plain checks instead of thermometers,
// frying oil, honest time, amounts in «две пятых масла».
import { describe, expect, it } from "vitest";
import { tidyRecipe } from "../engine/tidy";
import { hasWait, timeLong, timeShort } from "../app/recipeTime";
import { withAmounts } from "../app/stepAmounts";
import { spoonHint } from "../app/amounts";
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
  it("takes «с температурой» away with the degrees", () => {
    const r = tidyRecipe(base({ title: "Суп с фрикадельками", steps: [{ text: "Нарежьте." }, { text: "Варите ещё 5 минут. Фрикадельки должны стать полностью готовыми, с температурой в центре не ниже 72 °C." }] }));
    expect(r.steps[1].text).toBe("Варите ещё 5 минут. Фрикадельки должны стать полностью готовыми, пока внутри не исчезнет розовый цвет.");
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

describe("lost spaces", () => {
  it("puts back the space between a word and a number", () => {
    const r = tidyRecipe(base({ steps: [{ text: "Обжарьте на слабом огне2 минуты, затем остудите10 минут.", uses: [] }] }));
    expect(r.steps[0].text).toBe("Обжарьте на слабом огне 2 минуты, затем остудите 10 минут.");
    expect(r.steps[0].timerSeconds).toBe(600); // the longest time in the step, as before
    const oven = tidyRecipe(base({ steps: [{ text: "Выпекайте на противне30×40 см при200 °C20 минут.", uses: [] }] }));
    expect(oven.steps[0].text).toBe("Выпекайте на противне 30×40 см при 200 °C 20 минут.");
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
  it("puts the amount in place of the fraction", () => {
    const lines = [{ id: "vegetable-oil", name: "Растительное масло", amount: 50, unit: "г", optional: false }, { id: "water", name: "Питьевая вода", amount: 1200, unit: "мл", optional: false }, { id: "potato", name: "Картофель", amount: 600, unit: "г", optional: false }];
    expect(withAmounts("Нагрейте две пятых растительного масла, выложите лук.", lines)).toBe("Нагрейте 20 г растительного масла (1 ст. л.), выложите лук.");
    expect(withAmounts("Отложите одну шестую питьевой воды для соуса.", lines)).toBe("Отложите 200 мл питьевой воды для соуса.");
    expect(withAmounts("Подлейте одну десятую картофельного отвара.", lines)).toBe("Подлейте одну десятую картофельного отвара.");
  });
  it("reads every kind of fraction the recipes use", () => {
    const water = { id: "water", name: "Вода", amount: 1050, unit: "мл", optional: false };
    const oil = { id: "vegetable-oil", name: "Растительное масло для теста и сковороды", amount: 30, unit: "г", optional: false };
    const butter = { id: "butter", name: "Сливочное масло, включая смазывание формы", amount: 105, unit: "г", optional: false };
    const salt = { id: "salt", name: "Соль", amount: 6, unit: "г", optional: false };
    expect(withAmounts("Отложите примерно одну двадцатую воды для свёклы; мясо залейте остальной водой.", [water])).toBe("Отложите примерно 55 мл воды для свёклы; мясо залейте остальной водой.");
    expect(withAmounts("Добавьте две трети масла и перемешайте.", [oil])).toBe("Добавьте 20 г масла (1 ст. л.) и перемешайте.");
    expect(withAmounts("Стенки смажьте двадцать первой частью масла.", [butter])).toBe("Стенки смажьте 5 г масла (1 ч. л.).");
    expect(withAmounts("Смешайте с двумя третями соли.", [salt])).toBe("Смешайте с 4 г соли (½ ч. л.).");
    expect(withAmounts("Отделите одну шестнадцатую всей воды для теста, остальными пятнадцатью шестнадцатыми залейте мясо.", [{ ...water, amount: 3200 }]))
      .toBe("Отделите 200 мл воды для теста, остальными 3 л воды залейте мясо.");
    // Butter and oil both say «масла»: without «сливочного» or «растительного» it stays a fraction.
    expect(withAmounts("Добавьте две трети масла.", [oil, butter])).toBe("Добавьте две трети масла.");
    expect(withAmounts("Добавьте две трети растительного масла.", [oil, butter])).toBe("Добавьте 20 г растительного масла (1 ст. л.).");
    // Not a product, and not fractions at all.
    expect(withAmounts("Заполните форму тестом не выше двух третей высоты.", [water])).toBe("Заполните форму тестом не выше двух третей высоты.");
    expect(withAmounts("Варите четверть часа, на пятой минуте посолите.", [water, salt])).toBe("Варите четверть часа, на пятой минуте посолите.");
  });
  it("writes one and a half as «1,5», never «1½»", () => {
    expect(spoonHint("vegetable-oil", 25, "г")).toBe("1,5 ст. л.");
    expect(spoonHint("milk", 375, "мл")).toBe("1,5 стакана");
    expect(spoonHint("vegetable-oil", 8, "г")).toBe("1,5 ч. л.");
    expect(spoonHint("vegetable-oil", 2.5, "г")).toBe("½ ч. л.");
  });
});
