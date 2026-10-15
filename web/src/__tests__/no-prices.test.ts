// The owner's rule: no prices or cost estimates anywhere in the interface (people use the service everywhere,
// and prices differ). Regular expressions that parse a pasted receipt may still mention ₽ — those are skipped.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const root = new URL("../", import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
});
const BANNED = /₽|бюджет|стоимост|дешевл|\bруб\.|\bцена\b|\bцены\b/i;
// Regex literals (/…/flags) are input parsing, not interface text.
const stripRegex = (line: string) => line.replace(/\/(?![/*])(?:\\.|\[[^\]]*\]|[^/\\\n])+\/[gimsuy]*/g, "");

it("has no price wording in screens, components and app code", () => {
  const hits: string[] = [];
  for (const dir of ["screens", "components", "app"])
    for (const f of files(join(root, dir)))
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        const code = stripRegex(line);
        if (BANNED.test(code)) hits.push(f.replace(root, "") + ":" + (i + 1) + "  " + line.trim().slice(0, 120));
      });
  expect(hits).toEqual([]);
});
