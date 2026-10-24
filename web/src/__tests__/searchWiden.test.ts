// A word too many in the search (app/searchWiden), a family recipe into the shopping list (app/myRecipes), and the
// answers about a recipe that agree with its title (app/recipeQuestions).
import { beforeAll, expect, test } from "vitest";
import { basics, ingredientOptions, recipes, searchRecipes } from "../engine";
import { familiesFirst, widen } from "../app/searchWiden";
import { ingredientRows, newRecipe } from "../app/myRecipes";
import { agree, extraAnswer } from "../app/recipeQuestions";
import { loadCatalog } from "./chefTurn";

beforeAll(loadCatalog);
const find = (q: string) => widen(q, familiesFirst(q, searchRecipes(q, recipes())), recipes());

test("a word too many: similar dishes instead of «Ничего не нашлось»", () => {
  const plov = find("плов узбекский");
  expect(plov.near).toBe(true);
  expect(plov.list.length).toBeGreaterThanOrEqual(4);
  expect(plov.list.every((r) => /^Плов/.test(r.title))).toBe(true);
  expect(find("суп гороховый с копченостями").list[0].title).toMatch(/Гороховый суп с копч/);
  expect(find("торт наполеон классический").list.map((r) => r.title)).toEqual(["Наполеон домашний"]);
  expect(find("котлеты по-киевски").list.some((r) => /по-китайски/.test(r.title))).toBe(false);
  expect(find("оливье").near).toBe(false); // enough found: as it was
});

test("a word being typed: the larger family first; a whole word as it was", () => {
  expect(find("сырн").list[0].title).toMatch(/^Сырники/);
  expect(find("сыр").list[0].title).toBe(searchRecipes("сыр", recipes())[0].title);
});

test("a family recipe's lines into the shopping list", () => {
  const r = { ...newRecipe(), title: "Пирог", ingredients: "Мука — 300 г\nЯйца 2 шт\n2 луковицы\n1. Кефир 0,5 л\nсоль по вкусу\nВанилин на кончике ножа" };
  const rows = ingredientRows(r, ingredientOptions().map((o) => o.id), basics());
  expect(rows.map((x) => [x.id.startsWith("custom") ? x.name : x.id, x.amount, x.unit])).toEqual([
    ["wheat-flour", 300, "г"], ["egg", 2, "шт."], ["onion", 2, "шт."], ["kefir", 0.5, "л"], ["Ванилин", 1, "шт."],
  ]);
});

test("answers agree with the title; a frying pan gets its own «подгорело»", () => {
  expect(agree("«Котлеты домашние» хранится в холодильнике 3 дня.", "Котлеты домашние")).toBe("«Котлеты домашние» хранятся в холодильнике 3 дня.");
  expect(agree("«Хачапури по-аджарски» подходит детям.", "Хачапури по-аджарски")).toBe("«Хачапури по-аджарски» подходит детям.");
  const cutlets = recipes().find((x) => x.title === "Котлеты домашние")!;
  expect(extraAnswer("что делать если подгорело?", cutlets)?.text).toMatch(/сковороду/);
  const borsch = recipes().find((x) => x.title === "Борщ с говядиной")!;
  expect(extraAnswer("сколько варить без крышки?", borsch)?.text).toMatch(/^Варите 1 ч 30 мин/);
});
