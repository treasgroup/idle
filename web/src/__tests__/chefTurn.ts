// One Шеф turn as the app makes it without the server AI (app/assistant.tsx): the service navigator, kitchen math,
// leftovers, sides and drinks, the parser and engine, the fallbacks and the last sorting. For chef.test.ts and the bench.
import { readFileSync, readdirSync } from "node:fs";
import {
  DEFAULT_CONDITIONS, DEFAULT_PREFERENCES, buildCatalog, classifyIntent, cleanMessage,
  parseMessage, rankRecipes, recipes, respond, useCatalog, type Conditions, type Match,
} from "../engine";
import { navigatorAnswer } from "../app/navigator";
import { DEFAULT_PROFILE } from "../app/profile";
import { measureAnswer, roastAnswer } from "../app/kitchenMath";
import { leftoverAnswer } from "../app/leftovers";
import { drinkAnswer, sideAnswer } from "../app/pairing";
import { dropDates, occasionAnswer } from "../app/occasions";
import { byMethod, cookingMethod } from "../app/methods";
import { caloriesAnswer } from "../app/calories";
import { saidAnswer, saidPick, titleAnswer } from "../app/chefFallback";
import { fixBySound, plainWords, saidWithout } from "../app/colloquial";
import { HEALTH, healthOf, withHealth } from "../app/topic";
import { namedFirst, tidyResults, titleSounds } from "../app/assistant";
import { DEFAULT_STATE } from "../engine";

const dir = new URL("../../../server/data/catalog/", import.meta.url);
/** The real catalog of the site (server/data/catalog). */
export const loadCatalog = () => useCatalog(buildCatalog(readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((name) => ({ name, data: JSON.parse(readFileSync(new URL(name, dir), "utf8")) }))));

export const NOW = new Date(2026, 9, 23, 19, 0);
const prefs = DEFAULT_PREFERENCES;
const MEMORIAL = /кутья|кутью|кути|канун|поминал/i;
const found = (c: Conditions, limit = 5) => rankRecipes(recipes(), c, prefs, limit + 3).filter((m) => !MEMORIAL.test(m.recipe.title)).slice(0, limit);

type Turn = { kind: string; text: string; results: Match[]; conditions: Conditions; via: string };
/** `p`: the person's «не ем» and the rest (the default — eats everything). */
export function turn(text: string, p: typeof prefs = prefs): Turn {
  const nav = navigatorAnswer(text, DEFAULT_STATE, DEFAULT_PROFILE);
  const c0 = { ...DEFAULT_CONDITIONS, servings: 2 };
  if (nav) return { kind: "nav", text: nav.text, results: [], conditions: c0, via: "nav" };
  const local = measureAnswer(text) ?? roastAnswer(text);
  if (local) return { kind: "talk", text: local, results: [], conditions: c0, via: "math" };
  const left = leftoverAnswer(text);
  if (left) return { kind: "talk", text: left.text, results: [], conditions: c0, via: "left" };
  const pair = sideAnswer(text) ?? drinkAnswer(text, NOW);
  if (pair) return { kind: "found", text: pair.text, results: pair.results, conditions: c0, via: "pair" };
  const kcal = caloriesAnswer(text);
  if (kcal) return { kind: "found", text: kcal.text, results: kcal.results, conditions: c0, via: "kcal" };
  const occ = occasionAnswer(text, recipes(), (list) => rankRecipes(list, c0, prefs, 400).map((m) => m.recipe).filter((r) => !MEMORIAL.test(r.title)));
  if (occ) return { kind: "found", text: occ.text, results: occ.results.map((recipe) => ({ recipe, available: [], missing: [], unknown: [], toBuy: [], reason: recipe.summary })), conditions: c0, via: occ.go ? "feast" : "occasion" };
  const health = healthOf(text);
  const st = health ? withHealth(c0, health) : c0;
  const method = cookingMethod(text);
  const cleaned = cleanMessage(fixBySound(plainWords(saidWithout(dropDates(method ? method.text : text))), titleSounds()));
  const patch = parseMessage(cleaned, st);
  const run = (conditions: Conditions) => respond({ message: cleaned, patch, reply: patch.reply, local: true, conditions, preferences: p,
    conversation: [], guess: classifyIntent(cleaned), focus: null, voice: false, now: NOW } as Parameters<typeof respond>[0]);
  let out = run(st);
  if (health) Object.assign(out, { kind: "found", text: HEALTH[health].reply, results: out.results.length && out.kind !== "unclear" ? out.results : found({ ...out.conditions, health }) });
  if (out.kind === "unclear") {
    const said = saidAnswer(text), titled = said ? null : titleAnswer(text);
    if (said) { const pool = found({ ...c0, ...said.conditions }, said.only ? 400 : 5); const res = saidPick(said, pool.map((m) => m.recipe), NOW).map((r) => pool.find((m) => m.recipe.id === r.id)!).slice(0, 5); if (res.length) out = { ...out, kind: "found", text: said.text, results: res }; }
    else if (titled) out = { ...out, kind: "found", text: titled.text, results: titled.results.map((r) => ({ recipe: r, available: [], missing: [], unknown: [], toBuy: [], reason: r.summary })) };
  }
  if (out.results.length) out = { ...out, results: tidyResults(out.results, out.conditions, text, patch.mood === "comfort", found) };
  if (method && out.kind !== "talk") {
    const res = byMethod(out.results, out.conditions, method, found);
    if (res !== out.results && res.length) out = { ...out, kind: "found", results: res, text: out.kind === "found" && out.results.length ? out.text : "Вот " + method.say + ":" };
  }
  return { kind: out.kind, text: out.text, results: namedFirst(out.results, out.conditions).slice(0, 5), conditions: out.conditions, via: "chef" };
}

