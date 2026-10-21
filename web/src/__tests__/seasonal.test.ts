// Главная: the holiday shelf only while a holiday is near, the season's shelf always, themes by the time of year.
import { describe, expect, it } from "vitest";
import { holidayCollection, orthodoxEaster, seasonCollection, themesNow } from "../app/seasonal";

const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe("holidays", () => {
  it("shows a holiday about two weeks before it", () => {
    expect(holidayCollection(on(2026, 10, 21))?.key).toBe("halloween");
    expect(holidayCollection(on(2026, 10, 31))?.key).toBe("halloween");
    expect(holidayCollection(on(2027, 3, 5))?.key).toBe("mar8");
    expect(holidayCollection(on(2027, 2, 20))?.key).toBe("feb23");
    expect(holidayCollection(on(2026, 12, 20))?.key).toBe("newyear");
    expect(holidayCollection(on(2027, 1, 3))?.key).toBe("afterny");
  });
  it("shows nothing when no holiday is near", () => {
    expect(holidayCollection(on(2026, 7, 15))).toBeNull();
    expect(holidayCollection(on(2026, 11, 2))).toBeNull();
    expect(holidayCollection(on(2026, 10, 10))).toBeNull();
  });
  it("knows Easter and the fast before it", () => {
    const e = orthodoxEaster(2027);
    expect(holidayCollection(new Date(e.getTime() - 3 * 864e5))?.key).toBe("easter");
    expect(holidayCollection(new Date(e.getTime() - 20 * 864e5))?.key).toBe("lent");
  });
});

describe("seasons and themes", () => {
  it("always has a season", () => {
    expect(seasonCollection(on(2026, 10, 21)).key).toBe("autumn");
    expect(seasonCollection(on(2027, 1, 20)).key).toBe("winter");
    expect(seasonCollection(on(2027, 4, 10)).key).toBe("spring");
    expect(seasonCollection(on(2027, 7, 10)).key).toBe("summer");
  });
  it("swaps «Когда приболел» for «На пикник» in the warm months", () => {
    const keys = (d: Date) => themesNow(d).map((t) => t.key);
    expect(keys(on(2026, 11, 1))).toContain("sick");
    expect(keys(on(2026, 11, 1))).not.toContain("picnic");
    expect(keys(on(2027, 7, 1))).toContain("picnic");
    expect(keys(on(2027, 7, 1))).not.toContain("sick");
  });
});
