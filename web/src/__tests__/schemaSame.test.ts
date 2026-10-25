// The catalog through the engine's checker: how many recipes and ingredients pass, and every problem it reports
// (run with SCHEMA_DUMP=<file> to write them out — used to compare the small checker with the library it replaced).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { buildCatalog } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
test.skipIf(!process.env.SCHEMA_DUMP)("catalog check dump", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) }));
  const b = buildCatalog(files) as unknown as Record<string, unknown>;
  const pick = (k: string) => (Array.isArray(b[k]) ? (b[k] as unknown[]).length : b[k]);
  writeFileSync(process.env.SCHEMA_DUMP!, JSON.stringify({ keys: Object.keys(b), sizes: Object.fromEntries(Object.keys(b).map((k) => [k, pick(k)])), errors: b.errors, warnings: b.warnings, broken: (buildCatalog([...files.slice(0, 1), { name: "broken.json", data: { recipes: [{ id: "Bad Id", title: "", servings: "4", difficulty: "hardest", ingredients: [{ id: "salt", amount: -1, unit: "g", extra: 1 }], steps: [] }, { id: "ok-one", title: "x" }] } }]) as unknown as Record<string, unknown>).errors, recipes: ((b.recipes ?? []) as { id: string }[]).map((r) => JSON.stringify(r)).join("\n").length }, null, 1));
});
