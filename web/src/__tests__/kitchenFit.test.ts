// «Под вашу кухню»: marks after cooking turn into hints in similar dishes; the recipe itself stays (app/kitchenFit).
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildCatalog, recipeById, scaleIngredient, useCatalog, type Recipe } from "../engine";
import { addFix, isGrain, kitchenHints, normalizeFixes, troubleChips, usesOven, type FixId } from "../app/kitchenFit";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));

const hints = (id: string, fixes: FixId[], servings?: number) => {
  const r = recipeById(id) as Recipe;
  return kitchenHints(r, fixes.map((f) => ({ id: f, at: 1 })), r.ingredients.map((i) => scaleIngredient(i, r, servings ?? r.servings)));
};

describe("kitchen fit", () => {
  it("knows an oven dish and a grain dish", () => {
    expect(usesOven(recipeById("apple-charlotte-classic")!)).toBe(true);
    expect(isGrain(recipeById("buckwheat-mushrooms")!)).toBe(true);
    expect(isGrain(recipeById("apple-charlotte-classic")!)).toBe(false);
    expect(troubleChips(recipeById("apple-charlotte-classic")!).map((c) => c.label))
      .toEqual(["Верх подгорел", "Внутри сыровато", "Пересолено", "Пресно", "Непонятный шаг", "Слишком сложно", "Просто не наше"]);
    expect(troubleChips(recipeById("buckwheat-mushrooms")!).map((c) => c.label).slice(0, 3)).toEqual(["Не доварилось", "Разварилось", "Вода осталась"]);
  });
  it("a new mark replaces the opposite one and the same one", () => {
    let l = addFix([], "oven-hot", 1);
    l = addFix(l, "salt-less", 2);
    l = addFix(l, "oven-weak", 3);
    expect(l.map((f) => f.id)).toEqual(["salt-less", "oven-weak"]);
    expect(normalizeFixes([{ id: "oven-hot", at: 1 }, { id: "nope", at: 2 }, { id: "oven-weak", at: 3 }, null])).toEqual([{ id: "oven-weak", at: 3 }]);
  });
  it("a hot oven: lower and check earlier, at the steps with the oven", () => {
    const h = hints("apple-charlotte-classic", ["oven-hot"]).steps;
    expect(h[0].text).toBe("В прошлый раз верх подгорал — включите на 170° вместо 180°.");
    expect(h[4].text).toBe("В прошлый раз верх подгорал. Поставьте 170° и загляните на 40-й минуте.");
    expect(Object.keys(h)).toEqual(["0", "4"]);
    const c = hints("oven-chicken-potatoes", ["oven-hot"]).steps;
    expect(c[2].text).toBe("Ваша духовка печёт сильнее — загляните на 20-й минуте.");
  });
  it("a weak oven: longer, only where it bakes for a while", () => {
    const h = hints("apple-charlotte-classic", ["oven-weak"]).steps;
    expect(Object.keys(h)).toEqual(["4"]);
    expect(h[4].text).toBe("В прошлый раз внутри было сыровато — держите на 10 минут дольше и проверьте середину.");
  });
  it("grains: more or less water, under the water and where it goes in", () => {
    const more = hints("buckwheat-mushrooms", ["water-more"]);
    expect(more.products.water.text).toBe("в прошлый раз вода ушла раньше — налейте 750 мл");
    expect(more.steps[0].text).toBe("Воды — 750 мл вместо 600 мл, огонь — самый маленький, крышку не открывать.");
    const less = hints("buckwheat-mushrooms", ["water-less"], 2);
    expect(less.products.water.text).toBe("в прошлый раз разварилось — налейте 250 мл");
    expect(hints("apple-charlotte-classic", ["water-more"]).products.water).toBeUndefined();
  });
  it("salt: half under the salt, or a pinch more at the end", () => {
    const salt = { id: "salt", name: "соль", amount: 10, unit: "г", optional: false };
    expect(kitchenHints(recipeById("buckwheat-mushrooms")!, [{ id: "salt-less", at: 1 }], [salt]).products.salt.text).toBe("обычно у вас солоно — положите ½ ч. л., досолите в конце");
    expect(hints("apple-charlotte-classic", ["salt-less"]).products.salt.text).toBe("обычно у вас солоно — солите вдвое меньше и досолите в конце");
    expect(hints("buckwheat-mushrooms", ["salt-more"]).products.salt.text).toBe("в прошлый раз было пресно — попробуйте в конце и досолите");
    expect(hints("buckwheat-mushrooms", []).products).toEqual({});
  });
});
