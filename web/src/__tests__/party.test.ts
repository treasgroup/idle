import { beforeAll, expect, it } from "vitest";
import { recipes, courseOf } from "../engine";
import { myStart, partyIcs, settle, tableHints } from "../app/partyTable";
import type { Party } from "../app/party";
import { loadCatalog } from "./chefTurn";

beforeAll(loadCatalog);
const party = (over: Partial<Party>): Party => ({
  title: "Шашлыки", format: "bbq", date: "2026-11-07", time: "15:00", place: "Дача", note: "", host: "h",
  dishes: [], things: [], expenses: false, split: null, me: "g", admin: false, version: 1,
  guests: [{ key: "h", name: "Анна", status: "yes", plus: 0, cant: [], spent: null }, { key: "g", name: "Оля", status: "yes", plus: 1, cant: ["meat"], spent: null }],
  ...over,
});
const find = (re: RegExp, course?: string) => recipes().find((r) => re.test(r.title) && (!course || courseOf(r) === course))!;

it("says what the table lacks", () => {
  const mayo = recipes().filter((r) => courseOf(r) === "salad" && r.ingredients.some((i) => i.id === "mayonnaise")).slice(0, 3);
  const hints = tableHints(party({ dishes: mayo.map((r, i) => ({ key: "d" + i, title: r.title, id: r.id, by: null })) }));
  expect(hints.join(" ")).toMatch(/Нет горячего/);
  expect(hints.join(" ")).toMatch(/3 салата с майонезом/);
  const meat = find(/шашлык/i, "main");
  const h2 = tableHints(party({ dishes: [meat, mayo[0]].map((r, i) => ({ key: "e" + i, title: r.title, id: r.id, by: null })) }));
  expect(h2.join(" ")).toMatch(/Оля не ест мясо/);
});
it("tells a guest when to start, 45 minutes before the table", () => {
  const r = recipes().find((x) => courseOf(x) === "main" && x.totalMinutes > 30 && x.totalMinutes < 120)!;
  const st = myStart(party({}), [r])!;
  expect(st.readyBy.getHours() * 60 + st.readyBy.getMinutes()).toBe(14 * 60 + 15);
  expect(+st.start).toBeLessThan(+st.readyBy);
  const ics = partyIcs(party({}), [r], "https://shefly.ru/#party=x");
  expect(ics).toMatch(/DTSTART:20261107T150000/);
  expect(ics).toMatch(/Готовить к столу/);
  // A dish of more than four hours (a marinade overnight) is for the day before.
  const long = recipes().find((x) => x.totalMinutes > 240)!;
  expect(myStart(party({}), [long])!.dayBefore).toEqual([long]);
});
it("splits the expenses with the fewest transfers", () => {
  const p = party({ guests: [
    { key: "a", name: "Аня", status: "yes", plus: 0, cant: [], spent: null },
    { key: "o", name: "Оля", status: "yes", plus: 1, cant: [], spent: 3200 },
    { key: "m", name: "Маша", status: "yes", plus: 0, cant: [], spent: 1800 },
  ] });
  const s = settle(p);
  expect(s.share).toBe(1250);
  expect(s.transfers).toEqual([{ from: "a", to: "o", sum: 700 }, { from: "a", to: "m", sum: 550 }]);
});

import { newsOf } from "../app/partyNews";
it("tells the organiser what changed since the last look", () => {
  const before = party({ me: "h", host: "h", dishes: [{ key: "d1", title: "Салат", by: null }], guests: [{ key: "h", name: "Анна", status: "yes", plus: 0, cant: [], spent: null }] });
  const seen = { g: {}, i: { d1: "" } };
  const now = { ...before, guests: [...before.guests, { key: "o", name: "Оля", status: "yes" as const, plus: 1, cant: [], spent: null }], dishes: [{ key: "d1", title: "Салат", by: "o" }] };
  expect(newsOf(now, seen)).toEqual(["Оля придёт +1", "Оля возьмёт: салат"]);
  expect(newsOf(now, { g: { o: "yes+1" }, i: { d1: "o" } })).toEqual([]);
});
