// The shopping list as it is sent is the one on the screen (app/shoppingShare), and Шеф's buttons survive a reload.
import { beforeAll, expect, test } from "vitest";
import { normalizeState, type ShoppingItem } from "../engine";
import { listText } from "../app/shoppingShare";
import { loadCatalog } from "./chefTurn";

beforeAll(loadCatalog);
const item = (ingredientId: string, name: string, amount: number, unit = "г"): ShoppingItem =>
  ({ key: ingredientId + ":" + unit, ingredientId, name, amount, unit, checked: false } as ShoppingItem);

test("sent in the screen's words and amounts", () => {
  const text = listText([item("onion", "Репчатый лук", 340), item("cabbage", "Белокочанная капуста", 650), { ...item("salt", "Соль", 5), checked: true }]);
  expect(text).toMatch(/^Список покупок\n\n/);
  expect(text).toContain("• Лук — 4 шт. (нужно 340 г)");
  expect(text).toContain("• Капуста — 1 кочан");
  expect(text).not.toContain("Репчатый лук");
  expect(text).not.toContain("Соль"); // what is already bought is not sent
  expect(text).toMatch(/Собрано в «Шефли»/);
});

test("Шеф's button is kept with the conversation", () => {
  const s = normalizeState({ conversation: [{ role: "assistant", text: "План пока пустой.", go: { label: "Открыть план", to: "#/menu", icon: "plan" } }] });
  expect(s.conversation[0].go).toEqual({ label: "Открыть план", to: "#/menu", icon: "plan" });
});
