// Prints the dishes each «Стол в складчину» format suggests (run with PARTY_PICK=1).
import { beforeAll, test } from "vitest";
import { DEFAULT_PREFERENCES } from "../engine";
import { FORMATS, candidates } from "../app/partyTable";
import { loadCatalog } from "./chefTurn";

beforeAll(loadCatalog);
test.skipIf(!process.env.PARTY_PICK)("party picks", () => {
  for (const f of FORMATS) {
    const c = candidates(f.id, DEFAULT_PREFERENCES);
    console.log("\n== " + f.label);
    f.slots.forEach((sl, i) => console.log("  " + sl.label + ": " + c[i].slice(0, 5).map((r) => r.title).join(" | ")));
  }
});
