// The search pages get the recipe in the app's words, worked out in the admin panel (admin/searchTexts.ts).
import { beforeAll, describe, expect, it } from "vitest";
import { recipeById } from "../engine";
import { searchTexts } from "../admin/searchTexts";
import { loadCatalog } from "./chefTurn";

beforeAll(() => loadCatalog());

describe("searchTexts", () => {
  it("says products and steps as the recipe page does", () => {
    const t = searchTexts(recipeById("borsch-classic")!);
    expect(t.time).toBe("35 мин у плиты, потом ждать 2 ч");
    expect(t.ing.find((i) => i.id === "garlic")?.text).toMatch(/зубч/);
    expect(t.ing.find((i) => i.id === "bay-leaf")?.text).toBe("1 шт.");
    expect(t.steps[0].text).toMatch(/\d+ мл воды/);
    expect(t.steps[0].text).not.toMatch(/двадцат/);
    expect(t.steps[1].timer).toBe(90 * 60);
  });
  it("keeps the same hash for the same texts, so unchanged recipes are not sent again", () => {
    const r = recipeById("borsch-classic")!;
    expect(searchTexts(r).hash).toBe(searchTexts(r).hash);
    expect(searchTexts({ ...r, summary: r.summary + " Вкусно." }).hash).not.toBe(searchTexts(r).hash);
  });
});
