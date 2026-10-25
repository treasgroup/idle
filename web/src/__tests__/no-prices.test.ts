// The owner's rule: no prices or cost estimates anywhere in the interface (people use the service everywhere,
// and prices differ). Regular expressions that parse a pasted receipt may still mention ₽ — those are skipped.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// fileURLToPath, not .pathname: the folder is then right on Windows too.
const root = fileURLToPath(new URL("../", import.meta.url));
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
});
const BANNED = /₽|бюджет|стоимост|дешевл|\bруб\.|\bцена\b|\bцены\b/i;
// Regex literals (/…/flags) are input parsing, not interface text.
// The one exception the owner agreed (25.10): in «Стол в складчину» guests type what THEY spent and see the split.
// Such a line carries the mark «own-sums»; the service still shows no prices of its own.
const OWN_SUMS = /own-sums/;
const stripRegex = (line: string) => line.replace(/\/(?![/*])(?:\\.|\[[^\]]*\]|[^/\\\n])+\/[gimsuy]*/g, "");

it("has no price wording in screens, components and app code", () => {
  const hits: string[] = [];
  for (const dir of ["screens", "components", "app"])
    for (const f of files(join(root, dir)))
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        const code = stripRegex(line);
        if (BANNED.test(code) && !OWN_SUMS.test(line)) hits.push(f.replace(root, "") + ":" + (i + 1) + "  " + line.trim().slice(0, 120));
      });
  expect(hits).toEqual([]);
});
