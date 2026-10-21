// Школа готовки for the lesson pages search engines see (server/shkola.php): the lessons, «Спасение» and the kitchen
// words, taken from the same source the app uses, written to server/api/_private/data/school.json on every build.
import { build } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "school-"));
const out = join(dir, "school.mjs");
await build({
  stdin: {
    contents: `export { LESSONS, SECTIONS, BEGINNER } from "./src/screens/learn-data.ts";
export { RESCUE_GROUPS } from "./src/app/rescue.ts";
export { TERMS } from "./src/app/glossary.ts";`,
    resolveDir: web, loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error",
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const data = {
  sections: m.SECTIONS.filter((s) => s.id !== "rescue"),
  beginner: m.BEGINNER,
  lessons: m.LESSONS.map((l) => ({ id: l.id, section: l.section, title: l.title, skill: l.skill, cards: l.cards.map((c) => ({ title: c.title, text: c.text })), quiz: l.quiz, recipes: l.recipes })),
  rescue: m.RESCUE_GROUPS.map((g) => ({ title: g.title, items: g.items.map((t) => ({ id: t.id, title: t.title, steps: t.steps })) })),
  terms: m.TERMS.map((t) => ({ id: t.id, title: t.title, text: t.text, lesson: t.lesson ?? null })),
};
writeFileSync(join(web, "..", "server", "api", "_private", "data", "school.json"), JSON.stringify(data));
console.log("school.json: " + data.lessons.length + " lessons, " + data.rescue.length + " rescue groups, " + data.terms.length + " terms");
