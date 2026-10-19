import { expect, test } from "vitest";
import { didYouMean } from "../app/didYouMean";

test("close requests when Шеф did not understand", () => {
  const labels = (t: string) => didYouMean(t).map((o) => o.label.toLowerCase());
  expect(labels("чем кормить мужа после работы").some((l) => /ужин|обед/.test(l))).toBe(true);
  expect(labels("чем кормить мужа после работы").some((l) => /сметан/.test(l))).toBe(false);
  expect(labels("абырвалг")).toEqual([]);
  expect(didYouMean("тыквенное что-то").some((o) => /тыкв/i.test(o.label))).toBe(true);
});
