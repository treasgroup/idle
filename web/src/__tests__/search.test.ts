import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, expect, test } from "vitest";
import { buildCatalog, searchRecipes, useCatalog } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));

const first = (q: string) => searchRecipes(q)[0]?.title ?? "";

test("a short word of a dish's name counts: «том ям» is not every tomato dish", () => {
  expect(first("том ям")).toMatch(/^Том ям/);
  expect(searchRecipes("том ям").length).toBeLessThan(10);
  expect(first("том")).toMatch(/^Том ям/); // the word itself before «Томатный»
  expect(first("щи с капустой")).toMatch(/^Щи /);
  expect(searchRecipes("щи с капустой").every((r) => /щи/i.test(r.title + " " + (r.aliases ?? []).join(" ")))).toBe(true);
});

test("joining words still do not narrow the search", () => {
  expect(first("суп с курицей")).toMatch(/суп/i);
  expect(searchRecipes("суп с курицей").length).toBeGreaterThan(5);
  expect(first("оладьи на кефире")).toBe("Оладьи на кефире");
  expect(first("паста с томатами")).toMatch(/^Паста с томатами/);
  expect(first("суп из тыквы")).toMatch(/тыкв/i);
  expect(first("борщ")).toMatch(/^Борщ/);
});

test("a typo in the last letter of a short word («борш», «плоф»)", () => {
  expect(first("борш")).toMatch(/^Борщ/);
  expect(first("плоф")).toMatch(/^Плов/);
});
