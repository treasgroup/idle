// «Вопрос Шефу» in a recipe answers from the recipe's own steps and products (app/recipeAsk).
import { describe, expect, it } from "vitest";
import { answerFromRecipe } from "../app/recipeAsk";
import type { Recipe } from "../engine";

const soup = {
  id: "s", title: "Суп капустный с фрикадельками", servings: 4, minServings: 1, maxServings: 8,
  ingredients: [
    { id: "minced-beef", name: "Фарш говяжий", amount: 300, unit: "г", optional: false },
    { id: "cabbage", name: "Капуста", amount: 300, unit: "г", optional: false },
    { id: "onion", name: "Лук", amount: 100, unit: "г", optional: false, swap: ["leek"] },
  ],
  steps: [
    { text: "Сформуйте фрикадельки размером с вишню.", uses: ["minced-beef"] },
    { text: "Вскипятите воду. Добавьте картофель и варите при слабом кипении 10 минут.", timerSeconds: 600 },
    { text: "Опустите фрикадельки, добавьте капусту и варите на слабом огне 15 минут.", timerSeconds: 900, uses: ["minced-beef", "cabbage"] },
    { text: "Добавьте зажарку и варите ещё 5 минут. Фрикадельки должны стать полностью готовыми, без розового внутри.", timerSeconds: 300 },
  ],
} as unknown as Recipe;

const baked = {
  ...soup, id: "b", title: "Курица с картошкой в духовке",
  ingredients: [{ id: "chicken-fillet", name: "Куриное филе", amount: 500, unit: "г", optional: false }, { id: "potato", name: "Картофель", amount: 500, unit: "г", optional: false }],
  steps: [{ text: "Нарежьте картофель и курицу." }, { text: "Поставьте картофель в разогретую духовку на 25 минут.", timerSeconds: 1500, uses: ["potato"] }],
} as unknown as Recipe;

describe("answers from the recipe itself", () => {
  it("takes the time from the recipe's steps, not a general note", () => {
    expect(answerFromRecipe("Сколько варить фрикадельки со свининой", soup)?.text)
      .toBe("Варите фрикадельки 15 минут на слабом огне (шаг 3), затем ещё 5 минут (шаг 4). Со свининой — столько же. Как понять, что готово: фрикадельки должны стать полностью готовыми, без розового внутри.");
  });
  it("reads a short follow-up as the previous question again", () => {
    expect(answerFromRecipe("Так я про варёные фрикадельки", soup, "Сколько варить фрикадельки?")?.text).toMatch(/^Варите фрикадельки 15 минут/);
    expect(answerFromRecipe("Так я про варёные фрикадельки", soup, "Чем заменить лук?")).toBeNull();
  });
  it("uses the recipe's own way of cooking", () => {
    expect(answerFromRecipe("Сколько варить картошку", baked)?.text).toBe("Запекайте картошку 25 минут (шаг 2).");
  });
  it("says yes to meat for meat, no to fish for meat", () => {
    expect(answerFromRecipe("Можно ли заменить говядину на свинину", soup)?.text).toBe("Да, можно — со свининой получится мягче и чуть жирнее. Время то же — 15 минут (шаг 3).");
    const fish = answerFromRecipe("Можно ли заменить говядину на рыбу?", soup);
    expect(fish?.text).toMatch(/^Лучше не стоит/);
    expect(fish?.search).toBe("блюдо с рыбой");
  });
  it("leaves other questions to the usual answers", () => {
    expect(answerFromRecipe("Сколько хранится?", soup)).toBeNull();
    expect(answerFromRecipe("Можно ли заменить рис на гречку", soup)).toBeNull();
  });
});
