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

test("holidays and occasions are dishes for the day, not portions", () => {
  const t = turn("на 8 марта");
  expect(t.via).toBe("feast"); // with the «Собрать праздничный стол» button
  expect(t.results.some((m) => /хот-дог/i.test(m.recipe.title))).toBe(false);
  expect(turn("на 23 февраля").conditions.servings).not.toBe(12);
  expect(titles("на новый год")[0]).toMatch(/Оливье/);
  expect(titles("салаты на новый год").every((x) => /салат|оливье|шуб|мимоз|винегрет/i.test(x))).toBe(true);
  expect(titles("на масленицу").every((x) => /^Блин/.test(x))).toBe(true);
  expect(turn("на пикник").kind).toBe("found");
  expect(turn("день рождения ребенка").results.some((m) => /омлет на пару/i.test(m.recipe.title))).toBe(false);
  // Anything more said goes to the usual search, which reads it all.
  expect(turn("на пикник без мяса").via).toBe("chef");
});

test("a week of meals is the plan", () => {
  for (const q of ["меню на неделю", "план питания на неделю", "что приготовить на неделю", "что готовить всю неделю"]) expect(turn(q).via, q).toBe("nav");
});

test("«кроме», «только не» and «без» take out only what was said", () => {
  const potato = turn("из картошки кроме пюре");
  expect(potato.results[0].recipe.ingredients.some((i) => i.id === "potato")).toBe(true);
  expect(potato.results.some((m) => /пюре/i.test(m.recipe.title))).toBe(false);
  expect(turn("только не суп").results.some((m) => courseOf(m.recipe) === "soup")).toBe(false);
  expect(turn("без лука из курицы").results[0].recipe.ingredients.some((i) => i.id.startsWith("chicken"))).toBe(true);
  expect(turn("главное не острое").results.some((m) => /остр/i.test(m.recipe.title))).toBe(false);
});
