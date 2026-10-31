// What the first people of RuStore asked and got nothing (admin «Последние запросы», 30–31.10.2026). The app guesses
// the intent with a small model (server/intent-model.json) — loaded here as in the app.
import { beforeAll, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_PREFERENCES, loadIntentModel } from "../engine";
import { loadCatalog, turn } from "./chefTurn";

beforeAll(async () => {
  loadCatalog();
  const model = JSON.parse(readFileSync(new URL("../../../server/intent-model.json", import.meta.url), "utf8"));
  const real = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: true, json: async () => model })) as unknown as typeof fetch;
  await loadIntentModel("intent-model.json");
  globalThis.fetch = real;
});

test("«из печени» is liver dishes, not «поострее» (the model heard «острое»)", () => {
  for (const q of ["А что с печени куриной приготовить", "что приготовить из куриной печени"]) {
    const t = turn(q);
    expect(t.text).not.toMatch(/остр/);
    expect(t.results.length).toBeGreaterThanOrEqual(3);
    expect(t.results.slice(0, 3).every((m) => /печен/i.test(m.recipe.title))).toBe(true);
  }
});

test("a guessed wish is still added when the words say it", () => {
  expect(turn("хочу что-нибудь острое с курицей").text).toMatch(/остр/);
});

test("a dish asked by name and hidden by «не ем» is shown with the reason", () => {
  for (const ex of [["fish"], ["eggs"]]) {
    const t = turn("Селёдка под шубой", { ...DEFAULT_PREFERENCES, excluded: ex });
    expect(t.kind).toBe("found");
    expect(t.results[0]?.recipe.title).toBe("Сельдь под шубой");
    expect(t.text).toMatch(/не ем/);
  }
  // Without «не ем» nothing changes.
  expect(turn("Сельдь под шубой").text).toMatch(/^Нашёл по запросу/);
});
