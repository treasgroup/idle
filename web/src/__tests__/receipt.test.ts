// Receipt import: product names come out whole, amounts and prices are cut off.
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import { buildCatalog, ingredientOptions, useCatalog } from "../engine";
import { parseReceipt } from "../screens/Pantry";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));
const ids = () => ingredientOptions().map((o) => o.id);

it("finds butter in a receipt line with fat, weight and price", () => {
  expect(parseReceipt("Масло сливочное 82,5% 180г 189.99", ids())).toContain("butter");
});
it("keeps the first letter of a name after a number", () => {
  const r = parseReceipt("2 лука", ids());
  expect(r).not.toContain("flour");
  expect(r).toContain("onion");
});
it("skips totals and reads several lines", () => {
  const r = parseReceipt("СМЕТАНА 20% 300Г 89,90\nИТОГО 1200,00\nморковь, кефир", ids());
  expect(r).toEqual(expect.arrayContaining(["sour-cream", "carrot", "kefir"]));
  expect(r.length).toBe(3);
});
