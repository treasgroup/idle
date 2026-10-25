import { expect, it } from "vitest";
import { comingFasts, fastOffer, fastOn, fastTomorrow, keepsFast } from "../app/fasting";
import { DEFAULT_PROFILE } from "../app/profile";

const d = (s: string) => new Date(s + "T12:00");
const name = (s: string) => fastOn(d(s))?.name ?? null;

it("knows the multi-day fasts (new style)", () => {
  expect(name("2026-11-28")).toBe("Рождественский пост");
  expect(name("2027-01-06")).toBe("Рождественский пост");
  expect(fastOn(d("2026-11-27"))?.kind).toBe("weekly"); // the Friday before: only the weekly fast
  // Easter 2026: 12 April → Great Lent 23 February – 11 April, Petrov fast 8 June – 11 July.
  expect(name("2026-02-23")).toBe("Великий пост");
  expect(name("2026-04-11")).toBe("Великий пост");
  expect(name("2026-06-08")).toBe("Петров пост");
  expect(name("2026-08-14")).toBe("Успенский пост");
  expect(fastOn(d("2026-08-28"))?.kind).toBe("weekly"); // the day after: a Friday again
});
it("keeps Wednesday and Friday, but not in the weeks without them", () => {
  expect(fastOn(d("2026-10-28"))?.kind).toBe("weekly"); // Wednesday
  expect(fastOn(d("2026-10-30"))?.kind).toBe("weekly"); // Friday
  expect(fastOn(d("2026-10-29"))).toBe(null); // Thursday
  expect(fastOn(d("2026-04-15"))).toBe(null); // Wednesday of Светлая седмица (Easter 12 April)
  expect(fastOn(d("2027-01-08"))).toBe(null); // Святки
  expect(name("2027-01-18")).toBe("Крещенский сочельник");
  expect(fastOn(d("2026-02-18"))?.kind).toBe("nomeat"); // Масленица 2026: 16–22 February
});
it("follows the person's choice and says the eve", () => {
  const off = DEFAULT_PROFILE;
  const on = { ...DEFAULT_PROFILE, fast: { on: true, weekly: false, fish: false } };
  expect(keepsFast(off, d("2026-11-30"))).toBe(null);
  expect(keepsFast(on, d("2026-10-28"))).toBe(null); // Wednesday not chosen
  expect(keepsFast(on, d("2026-11-30"))?.name).toBe("Рождественский пост");
  expect(fastTomorrow(on, d("2026-11-27"))).toBe("Рождественский пост");
  expect(fastTomorrow(on, d("2026-11-28"))).toBe(null);
  expect(comingFasts(d("2026-10-25"))[0].name).toBe("Рождественский пост");
});
it("offers the fast a week before, once, only when it is off", () => {
  const off = DEFAULT_PROFILE;
  expect(fastOffer(off, d("2026-11-21"))?.name).toBe("Рождественский пост"); // a week before the 28th
  expect(fastOffer(off, d("2026-11-15"))).toBe(null);
  expect(fastOffer(off, d("2026-12-01"))?.name).toBe("Рождественский пост");
  expect(fastOffer(off, d("2026-12-05"))).toBe(null);
  expect(fastOffer({ ...off, fast: { on: true, weekly: true, fish: false } }, d("2026-11-21"))).toBe(null);
});
