import { beforeEach, describe, expect, it } from "vitest";

// The node test environment has no localStorage: a small one for the eve's notes.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k),
};
const { dropEve, eveText, keepEve } = await import("../app/partyEve");

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

describe("напоминание накануне стола", () => {
  beforeEach(() => store.clear());

  it("говорит, что готовить и когда начать", () => {
    keepEve("a", { title: "Шашлыки", date: day(1), time: "15:00", dishes: ["Салат овощной", "Лаваш с сыром"], things: ["Угли"], start: "12:10", early: [] });
    expect(eveText(day(1))).toBe("Завтра «Шашлыки» в 15:00: вы готовите салат овощной и лаваш с сыром — начните в 12:10. Ещё берёте угли.");
    expect(eveText(day(2))).toBeNull();
  });

  it("только вещи, и блюдо, которое лучше сделать сегодня", () => {
    keepEve("a", { title: "Матч", date: day(1), time: "", dishes: [], things: ["Стулья"], start: null, early: [] });
    expect(eveText(day(1))).toBe("Завтра «Матч»: вы берёте стулья.");
    keepEve("a", { title: "Матч", date: day(1), time: "", dishes: [], things: [], start: null, early: ["Холодец"] });
    expect(eveText(day(1))).toBe("Завтра «Матч». Холодец — лучше приготовить сегодня.");
  });

  it("забывает стол, где я больше ничего не несу, и прошедшие", () => {
    keepEve("a", { title: "Ужин", date: day(1), time: "", dishes: ["Пирог"], things: [], start: null, early: [] });
    keepEve("b", { title: "Старый", date: day(-2), time: "", dishes: ["Суп"], things: [], start: null, early: [] });
    expect(eveText(day(-1))).toBeNull();
    keepEve("a", null);
    expect(eveText(day(1))).toBeNull();
    keepEve("a", { title: "Ужин", date: day(1), time: "", dishes: ["Пирог"], things: [], start: null, early: [] });
    dropEve("a");
    expect(eveText(day(1))).toBeNull();
  });
});
