// «Семейный календарь»: how soon a date comes, how old someone turns, and what the reminder says (app/familyCalendar).
import { describe, expect, it } from "vitest";
import { comingSoon, daysUntil, eventPhrase, genitive, normalizeDates, reminderText, turning, whenText, years, type FamilyDate } from "../app/familyCalendar";

const mom: FamilyDate = { id: "1", kind: "birthday", who: "Мама", day: 27, month: 10, year: 1966 };
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);

describe("family calendar", () => {
  it("counts the days to the next time, today included, and turns to next year after it", () => {
    expect(daysUntil(mom, at(2026, 10, 24))).toBe(3);
    expect(daysUntil(mom, at(2026, 10, 27, 23))).toBe(0);
    expect(daysUntil(mom, at(2026, 10, 28))).toBe(364);
    expect(daysUntil({ day: 3, month: 1 }, at(2026, 12, 31))).toBe(3);
  });
  it("keeps 29 February on the 28th in other years", () => {
    expect(daysUntil({ day: 29, month: 2 }, at(2027, 2, 27))).toBe(1);
    expect(daysUntil({ day: 29, month: 2 }, at(2028, 2, 27))).toBe(2);
  });
  it("says how old someone turns on the coming date", () => {
    expect(turning(mom, at(2026, 10, 24))).toBe(60);
    expect(turning(mom, at(2026, 11, 1))).toBe(61);
    expect(turning({ ...mom, year: undefined }, at(2026, 10, 24))).toBeNull();
    expect([1, 2, 5, 11, 21, 22, 60].map(years)).toEqual(["1 год", "2 года", "5 лет", "11 лет", "21 год", "22 года", "60 лет"]);
    expect([0, 1, 2, 3, 5].map(whenText)).toEqual(["Сегодня", "Завтра", "Через 2 дня", "Через 3 дня", "Через 5 дней"]);
  });
  it("puts whose birthday it is in the right form", () => {
    expect(genitive("Мама")).toBe("Мамы");
    expect(genitive("сын Миша")).toBe("сына Миши");
    expect(genitive("Ольга")).toBe("Ольги");
    expect(genitive("Игорь")).toBe("Игоря");
    expect(genitive("дедушка Иван")).toBe("дедушки Ивана");
    expect(genitive("Наташа")).toBe("Наташи");
    expect(eventPhrase(mom)).toBe("день рождения мамы");
    expect(eventPhrase({ ...mom, who: "Сын Миша" })).toBe("день рождения сына Миши");
    expect(eventPhrase({ ...mom, who: "Ольга" })).toBe("день рождения Ольги");
    expect(eventPhrase({ id: "2", kind: "anniversary", who: "Наша годовщина", day: 14, month: 11 })).toBe("наша годовщина");
    expect(eventPhrase({ id: "3", kind: "other", who: "Встреча выпускников", day: 8, month: 3 })).toBe("встреча выпускников");
  });
  it("speaks of a date three days before and on the day, and only then", () => {
    const list = [mom, { id: "2", kind: "anniversary" as const, who: "Наша годовщина", day: 14, month: 11 }];
    expect(reminderText(list, at(2026, 10, 24))).toBe("Через 3 дня день рождения мамы — собрать праздничный стол?");
    expect(reminderText(list, at(2026, 10, 25))).toBeNull();
    expect(reminderText(list, at(2026, 10, 27))).toMatch(/^Сегодня день рождения мамы 🎉/);
    expect(reminderText(list, at(2026, 11, 11))).toBe("Через 3 дня наша годовщина — собрать праздничный стол?");
    expect(comingSoon(list, at(2026, 10, 25)).map((d) => d.id)).toEqual(["1"]);
    expect(comingSoon(list, at(2026, 10, 1))).toEqual([]);
  });
  it("drops a malformed saved date", () => {
    expect(normalizeDates([mom, { id: "x", kind: "birthday", who: "Б", day: 40, month: 1 }, { kind: "other" }, null, { ...mom, id: "4", year: 12 }]))
      .toEqual([mom, { id: "4", kind: "birthday", who: "Мама", day: 27, month: 10 }]);
    expect(normalizeDates("x")).toEqual([]);
  });
});
