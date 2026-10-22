import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, expect, test } from "vitest";
import { fixBySound, soundBook } from "../app/colloquial";
import { buildCatalog, recipes, useCatalog } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));

test("dish names written as heard become the recipe words", () => {
  const book = soundBook(recipes().map((r) => r.title), recipes().flatMap((r) => [r.summary ?? "", ...r.steps.map((x) => x.text), ...(r.tips ?? [])]));
  expect(fixBySound("Хочу хочопури", book)).toBe("Хочу хачапури");
  expect(fixBySound("пильмени на ужин", book)).toBe("пельмени на ужин");
  expect(fixBySound("хочу чибуреки", book)).toBe("хочу чебуреки");
});

test("ordinary requests stay as they are", () => {
  const book = soundBook(recipes().map((r) => r.title), recipes().flatMap((r) => [r.summary ?? "", ...r.steps.map((x) => x.text), ...(r.tips ?? [])]));
  const asked = [
    "есть курица и картошка", "что приготовить на ужин быстро", "хочу что-нибудь сладкое", "нет духовки, есть фарш", "сколько варить гречку",
    "2 стакана муки это сколько грамм", "сколько запекать курицу 1,5 кг", "чем заменить сметану", "у меня диабет, что можно", "рецепт без мяса на 4 человека",
    "что приготовить ребенку 3 года", "у меня осталось варёное рис и яйца", "пп ужин до 400 ккал", "хочется чего-нибудь сытного и горячего",
    "приготовить вкусно для гостей", "праздничный стол на новый год", "завтрак побыстрее", "вегетарианское блюдо сегодня вечером", "килограмм говядины",
    "сделать котлеты из фарша", "обжарка лука", "печеная картошка", "тесто для пирожков", "побыстрее", "горячей воды", "мультиварка", "аэрогриль", "давление", "гастрит", "картошку пожарить", "макароны по-флотски", "сырники из творога",
  ];
  const changed = asked.map((q) => [q, fixBySound(q, book)]).filter(([a, b]) => a !== b);
  expect(changed).toEqual([]);
});
