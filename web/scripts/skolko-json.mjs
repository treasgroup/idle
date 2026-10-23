// Справочник «Сколько…» for the pages search engines see (server/skolko.php): grams in a glass and a spoon, roasting
// and boiling times, taken from the same tables Шеф answers with (src/app/skolko.ts), written to
// server/api/_private/data/skolko.json on every build.
import { build } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "skolko-"));
const out = join(dir, "skolko.mjs");
await build({
  stdin: { contents: `export { MEASURE, ROAST_PAGES, BOIL } from "./src/app/skolko.ts";`, resolveDir: web, loader: "ts" },
  bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error",
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const data = { measure: m.MEASURE, roast: m.ROAST_PAGES, boil: m.BOIL };
writeFileSync(join(web, "..", "server", "api", "_private", "data", "skolko.json"), JSON.stringify(data));
console.log("skolko.json: " + data.measure.length + " products in a glass, " + data.roast.length + " to roast, " + data.boil.length + " to boil");
