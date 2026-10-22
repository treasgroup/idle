import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, test } from "vitest";
import { buildCatalog, shortName, useCatalog } from "../engine";
const dir = new URL("../../../server/data/catalog/", import.meta.url);
beforeAll(() => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) })))));
test("p", () => { for (const id of ["chicken-liver", "beef-liver", "milk", "pork-liver", "cottage-cheese", "minced-meat", "canned-tuna"]) console.log("P " + id + " → " + shortName(id)); });
