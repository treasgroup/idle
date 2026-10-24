import { expect, test } from "vitest";
import { readQuery } from "../app/searchWords";

test("filter words become filters, the rest stays text", () => {
  expect(readQuery("суп без мяса")).toMatchObject({ text: "суп", on: ["veg"], said: ["без мяса"] });
  expect(readQuery("без мяса")).toMatchObject({ text: "", on: ["veg"] });
  expect(readQuery("десерт")).toMatchObject({ text: "", dish: "sweet" });
  expect(readQuery("что-нибудь на завтрак")).toMatchObject({ text: "", dish: "breakfast" });
  expect(readQuery("быстрый ужин с курицей")).toMatchObject({ text: "курицей", time: 30 });
  expect(readQuery("пп ужин")).toMatchObject({ text: "", on: ["light"], tag: "light" });
  expect(readQuery("плов в мультиварке")).toMatchObject({ text: "плов", on: ["multicooker"] });
  expect(readQuery("Котлеты для детей")).toMatchObject({ text: "котлеты", on: ["kids"] });
  expect(readQuery("рыба на ужин")).toMatchObject({ text: "рыба", on: [], said: [] });
});

test("a plain query is left as typed", () => {
  expect(readQuery("Борщ с говядиной").text).toBe("Борщ с говядиной");
  expect(readQuery("сладкий перец фаршированный").text).toBe("сладкий перец фаршированный");
  expect(readQuery("том ям").text).toBe("том ям");
});

test("«без молока», «без лактозы»: the dishes without it, not the ones named after it", async () => {
  const { loadCatalog } = await import("./chefTurn");
  const { recipes, searchRecipes } = await import("../engine");
  const { hasAny } = await import("../app/searchWords");
  loadCatalog();
  const milk = readQuery("без молока");
  expect(milk).toMatchObject({ text: "", without: ["milk"], said: ["без молока"] });
  expect(recipes().filter((r) => !hasAny(r, milk.without)).some((r) => r.ingredients.some((i) => i.id === "milk" && !i.optional))).toBe(false);
  const soup = readQuery("суп без лука");
  expect(soup.text).toBe("суп");
  expect(searchRecipes(soup.text).filter((r) => !hasAny(r, soup.without)).every((r) => !r.ingredients.some((i) => i.id === "onion" && !i.optional))).toBe(true);
  expect(readQuery("без лактозы").without).toContain("dairy");
  expect(readQuery("без варки").text).toBe("без варки"); // not a product: searched as typed
});
