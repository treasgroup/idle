// «Для блюд» in «Покупки»: each row remembers how much of it every recipe asked for (app/shoppingDishes).
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildCatalog, recipeById, useCatalog, type ShoppingItem } from "../engine";
import { addRecipeLines, dishesInList, removeDish, rowsFor } from "../app/shoppingDishes";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));

const soup = { id: "cabbage-meatball-soup", title: "Суп капустный с фрикадельками" };
const chicken = { id: "oven-chicken-potatoes", title: "Курица с картошкой в духовке" };
const line = (id: string, amount: number, unit = "г") => ({ id, name: id, amount, unit, optional: false });

describe("dishes in the shopping list", () => {
  it("keeps what was added by hand and for another dish when one dish is taken off", () => {
    const own: ShoppingItem = { key: "own", ingredientId: "onion", name: "Лук", amount: 100, unit: "г", checked: false };
    let list = addRecipeLines([own], [line("onion", 100), line("cabbage", 300)], soup);
    list = addRecipeLines(list, [line("onion", 50)], chicken);
    const onion = list.find((i) => i.ingredientId === "onion")!;
    expect(onion.amount).toBe(250);
    expect(onion.parts).toEqual({ [soup.id]: 100, [chicken.id]: 50 });
    expect(dishesInList(list).map((d) => d.id)).toEqual([soup.id, chicken.id]);
    expect(rowsFor(list, soup)).toBe(2);
    const left = removeDish(list, soup);
    expect(left.find((i) => i.ingredientId === "onion")?.amount).toBe(150);
    expect(left.some((i) => i.ingredientId === "cabbage")).toBe(false);
    expect(dishesInList(left).map((d) => d.id)).toEqual([chicken.id]);
  });
  it("finds the recipe of an older row by its title", () => {
    const old: ShoppingItem[] = [{ key: "a", ingredientId: "cabbage", name: "Капуста", amount: 300, unit: "г", checked: false, recipes: [soup.title] }];
    expect(recipeById(soup.id)).toBeTruthy();
    expect(dishesInList(old).map((d) => d.title)).toEqual([soup.title]);
    expect(removeDish(old, soup)).toEqual([]);
  });
  it("forgets dishes whose products are all bought", () => {
    const list = addRecipeLines([], [line("cabbage", 300)], soup).map((i) => ({ ...i, checked: true }));
    expect(dishesInList(list)).toEqual([]);
    expect(rowsFor(list, soup)).toBe(0);
  });
});
