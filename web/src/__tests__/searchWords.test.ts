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
