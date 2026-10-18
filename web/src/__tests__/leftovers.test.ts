import { expect, test } from "vitest";
import { leftoverAnswer } from "../app/leftovers";

test("what is left after the holiday", () => {
  expect(leftoverAnswer("осталось оливье, что с ним делать")?.text).toMatch(/не дольше суток/);
  expect(leftoverAnswer("куда деть остатки курицы")?.options?.[0].text).toMatch(/курицы/);
  expect(leftoverAnswer("сколько хранится холодец")?.text).toMatch(/3–5 дней/);
  expect(leftoverAnswer("что сделать с остатками после праздника")?.options?.length).toBe(3);
  expect(leftoverAnswer("что приготовить из курицы")).toBeNull();
  expect(leftoverAnswer("есть курица и картошка")).toBeNull();
});
