import { describe, expect, it } from "vitest";
import { keepsText, overdueList, type Frozen } from "../app/freezer";

const D = 86400000, now = Date.UTC(2026, 9, 26);
const item = (title: string, days: number, extra: Partial<Frozen> = {}): Frozen => ({ id: title, title, portions: null, at: now - days * D, ...extra });

describe("морозилка: пора съесть", () => {
  it("сверху то, что пролежало дольше срока сильнее всего; свежее не трогает", () => {
    const list = [item("Фарш", 5), item("Пельмени", 120), item("Котлеты", 100, { title: "Котлеты" })];
    expect(overdueList(list, now).map((f) => f.title)).toEqual(["Пельмени", "Котлеты"]);
  });
  it("срок словами", () => {
    expect(keepsText(item("Пельмени", 0))).toBe("до 3 месяцев");
  });
});
