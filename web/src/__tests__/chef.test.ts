// What Шеф got wrong on the bench of real-life requests (chefBench.test.ts) and must not get wrong again.
import { beforeAll, expect, test } from "vitest";
import { courseOf, nutritionOf } from "../engine";
import { loadCatalog, turn } from "./chefTurn";

beforeAll(loadCatalog);
const first = (q: string) => turn(q).results[0]?.recipe.title ?? "";
const titles = (q: string) => turn(q).results.slice(0, 3).map((m) => m.recipe.title);

test("a dish asked by name comes first as it is usually made", () => {
  expect(first("хочу блины")).toMatch(/^Блины/);
  expect(first("хочу пирожки")).toMatch(/^Пирожки/);
  expect(first("хочу котлеты")).toMatch(/^Котлеты/);
  expect(first("хочу борщ")).not.toMatch(/постн|зелён/i);
  expect(first("хочу греческий салат")).toMatch(/Греческий/);
  expect(first("хочу пшённая каша")).toMatch(/пшённ/i);
});

test("dish words that look like a product with a typo are dishes", () => {
  expect(first("хочу ризотто")).toMatch(/^Ризотто/); // not «рикотта»
  expect(first("хочу бургер")).toMatch(/^Бургер/); // not «булочки для бургеров»
  expect(first("хочу суши")).toMatch(/суши/i);
  expect(turn("хочу салатик").results.every((m) => courseOf(m.recipe) === "salad")).toBe(true); // not lettuce
});

test("«печень» is the liver, not «печенье»", () => {
  const t = turn("что приготовить из печени");
  expect(t.text).toMatch(/печенью/);
  expect(t.results.slice(0, 3).every((m) => /печен/i.test(m.recipe.title) && !/печенье/i.test(m.recipe.title))).toBe(true);
});

test("short words, little forms and typos are found by title", () => {
  expect(first("хочу том ям")).toMatch(/^Том ям/);
  expect(first("хочу фо бо")).toMatch(/^Фо бо/);
  expect(first("тортик")).toMatch(/^Торт/);
  expect(first("пицу")).toMatch(/^Пицца/);
  expect(first("сварить уху")).toMatch(/^Уха/);
});

test("phrases without products or dishes", () => {
  expect(turn("что-нибудь вкусненькое").kind).toBe("found");
  expect(turn("нечего есть").results.every((m) => ["main", "soup"].includes(courseOf(m.recipe)))).toBe(true);
  expect(turn("блюда с белком").results.every((m) => nutritionOf(m.recipe).perServing.protein >= 25)).toBe(true);
  expect(turn("что взять на работу пообедать").kind).toBe("found");
  // «You choose» in a word: dishes, not «Не понял».
  for (const q of ["не знаю", "что-нибудь", "без разницы", "Всё равно!"]) {
    const t = turn(q);
    expect(t.kind, q).toBe("found");
    expect(t.results.every((m) => ["main", "soup"].includes(courseOf(m.recipe))), q).toBe(true);
  }
});

test("what the person does not eat, and the meal said in words", () => {
  expect(turn("ребенок не ест мясо, что приготовить").results.every((m) => m.recipe.tags.includes("vegetarian"))).toBe(true);
  expect(turn("ужин до 400 ккал").results.every((m) => !["breakfast", "side", "drink"].includes(courseOf(m.recipe)))).toBe(true);
  expect(courseOf(turn("что приготовить в аэрогриле").results[0].recipe)).not.toBe("side");
});

test("words in the answer are said right", () => {
  expect(turn("есть сметана и брокколи").text).not.toMatch(/брокколями/);
  expect(turn("есть креветки и молоко").text).not.toMatch(/молочноем/);
  expect(turn("есть кефир и фасоль").text).not.toMatch(/\d/);
});

test("no cold soup out of season unless asked", () => {
  // The ranking looks at today's month: checked October to April; «окрошка» asked by name is there all year.
  if ([9, 10, 11, 0, 1, 2, 3].includes(new Date().getMonth())) expect(titles("что приготовить из свёклы")[0]).not.toMatch(/холодн|окрошк/i);
  expect(first("хочу окрошку")).toMatch(/Окрошка/);
});

test("the first word of a title is the dish, not a product with a typo", () => {
  expect(first("хочу карбонару")).toMatch(/^Карбонара/); // not «карбонад», the pork cut
});
