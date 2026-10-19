import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, expect, test } from "vitest";
import { monthLook } from "../app/month";
import { buildCatalog, courseOf, recipes, useCatalog, type BookEntry } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));

test("the month before, in the first week of the next", () => {
  const soups = recipes().filter((r) => courseOf(r) === "soup").slice(0, 3);
  const at = (d: number, h = 19) => new Date(2026, 9, d, h).getTime();
  const e = (r: (typeof soups)[0], t: number): BookEntry => ({ id: r.id + t, recipeId: r.id, title: r.title, at: t });
  const book = [e(soups[0], new Date(2026, 8, 20).getTime()), e(soups[0], at(3)), e(soups[0], at(3, 20)), e(soups[1], at(10)), e(soups[0], at(17)), e(soups[2], at(24))];
  const look = monthLook(book, new Date(2026, 10, 2))!;
  expect(look.name).toBe("октябрь");
  expect(look.cooked).toBe(4); // the same dish twice on the 3rd counts once
  expect(look.firstTime).toBe(2); // soups[0] was cooked in September already
  expect(look.course).toBe("супы");
  expect(look.favorite?.times).toBe(2);
  expect(monthLook(book, new Date(2026, 10, 9))).toBeNull(); // after the first week
  expect(monthLook(book.slice(0, 2), new Date(2026, 10, 2))).toBeNull(); // too little to say
});
