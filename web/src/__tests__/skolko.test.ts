// Справочник «Сколько…»: every product of Шеф's tables gets a page, addresses are unique, the answers are filled in.
import { describe, expect, it } from "vitest";
import { BOIL, MEASURE, ROAST_PAGES } from "../app/skolko";
import { ROAST, roastMinutes } from "../app/kitchenMath";

describe("skolko", () => {
  it("one page per product, with unique addresses", () => {
    const slugs = [...MEASURE, ...ROAST_PAGES, ...BOIL].map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z]+(-[a-z]+)*$/);
    expect(MEASURE.length).toBeGreaterThanOrEqual(20);
    expect(BOIL.length).toBeGreaterThanOrEqual(25);
  });
  it("grams match what Шеф says; liquids are in millilitres", () => {
    expect(MEASURE.find((m) => m.slug === "gramm-muki")).toMatchObject({ glass: 130, tbsp: 25, tsp: 8, unit: "г", gen: "муки" });
    expect(MEASURE.find((m) => m.slug === "ml-moloka")?.unit).toBe("мл");
    expect(MEASURE.find((m) => m.slug === "gramm-slivochnogo-masla")?.unit).toBe("г");
  });
  it("roasting: the usual weight gives the same time as Шеф", () => {
    const chicken = ROAST_PAGES.find((r) => r.slug === "zapekat-kuricu-celikom")!;
    expect(roastMinutes(ROAST[0], chicken.usual)).toBe(80);
    for (const r of ROAST_PAGES) expect(r.perKg > 0 ? r.weights.length > 0 && r.usual > 0 : r.weights.length === 0).toBe(true);
  });
  it("every boiling page has an answer, ways and a tip", () => {
    for (const b of BOIL) {
      expect(b.big && b.small && b.text && b.tip).toBeTruthy();
      expect(b.rows.length).toBeGreaterThan(0);
    }
  });
});
