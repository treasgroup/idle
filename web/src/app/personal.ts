// What the person likes, learnt quietly from what they do — and kept only on this device.
// Every action with a dish is a signal (opened and read, closed at once, saved, cooked, rated); a dish is a set of
// traits (the main product, the kind of dish, the cuisine, how long, in the oven…). The traits collect the signals,
// fading over a month, so a new dish with liked traits comes up even if it was never opened.
// On top of that: the moment (a weekday evening wants something quick) and variety (not what was cooked yesterday).
import { LABELS, courseOf, ingredient, recipeById, shortName, type BookEntry, type Recipe } from "../engine";

export type Signal = "open" | "read" | "bounce" | "save" | "plan" | "cook" | "done" | "liked" | "meh" | "not_this";
const WEIGHT: Record<Signal, number> = { open: 0.4, read: 0.8, bounce: -0.5, save: 2, plan: 1.5, cook: 1.5, done: 3, liked: 3, meh: -3, not_this: -0.6 };
interface Sig { id: string; w: number; at: number; f: string[] }
interface Store { sigs: Sig[]; muted: string[] }

const KEY = "cook-taste-v2";
export const PERSONAL_EVENT = "cook-taste";
const DAY = 864e5;
const HALF_LIFE = 30 * DAY;

function load(): Store {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && Array.isArray(v.sigs)) return { sigs: v.sigs, muted: Array.isArray(v.muted) ? v.muted : [] }; } catch { /* ignore */ }
  return { sigs: [], muted: [] };
}
function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify({ sigs: s.sigs.slice(-400), muted: s.muted.slice(-100) })); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PERSONAL_EVENT));
}

const COURSE: Record<string, string> = { soup: "супы", main: "вторые блюда", salad: "салаты", baking: "выпечка", dessert: "сладкое", breakfast: "завтраки", snack: "закуски", side: "гарниры" };
const CUISINE: Record<string, string> = { russian: "русская кухня", caucasian: "кавказская кухня", italian: "итальянская кухня", asian: "азиатская кухня", ukrainian: "украинская кухня", uzbek: "узбекская кухня", french: "французская кухня", mexican: "мексиканская кухня", japanese: "японская кухня", chinese: "китайская кухня", georgian: "грузинская кухня", european: "европейская кухня" };
const TAG: Record<string, string> = { cozy: "уютные блюда", hearty: "сытные блюда", light: "лёгкие блюда", spicy: "острое", sweet: "сладкое", fresh: "свежие блюда", vegetarian: "блюда без мяса" };
const APPLIANCE: Record<string, string> = { oven: "блюда в духовке", multicooker: "мультиварка", airfryer: "аэрогриль" };
const IMPORTANCE: Record<string, number> = { main: 1, grp: 0.5, course: 0.8, cuisine: 0.5, tag: 0.5, time: 0.4, app: 0.4 };

/** A dish's traits: «main:chicken», «course:soup», «tag:cozy», «time:quick»… */
export function traits(r: Recipe): string[] {
  const out = new Set<string>();
  if (r.mainIngredient) out.add("main:" + r.mainIngredient);
  for (const i of r.ingredients.slice(0, 4)) for (const g of ingredient(i.id)?.groups ?? []) if (["meat", "poultry", "fish", "seafood", "mushrooms", "legumes", "dairy", "eggs"].includes(g)) out.add("grp:" + g);
  out.add("course:" + courseOf(r));
  if (r.cuisine) out.add("cuisine:" + r.cuisine);
  for (const t of r.tags) if (t in TAG) out.add("tag:" + t);
  out.add(r.totalMinutes <= 25 ? "time:quick" : r.totalMinutes > 90 ? "time:long" : "time:mid");
  for (const a of r.appliances) if (a in APPLIANCE) out.add("app:" + a);
  return [...out];
}

/** Words for a trait in «Что я про вас понял» (null when it says nothing a person would recognise). */
export function traitLabel(t: string): string | null {
  const [k, v] = [t.slice(0, t.indexOf(":")), t.slice(t.indexOf(":") + 1)];
  if (k === "main") { const n = shortName(v); return n && n !== v ? n.toLowerCase() : null; }
  if (k === "grp") return (LABELS[v] ?? "").toLowerCase() || null;
  if (k === "course") return COURSE[v] ?? null;
  if (k === "cuisine") return CUISINE[v] ?? null;
  if (k === "tag") return TAG[v] ?? null;
  if (k === "time") return v === "quick" ? "быстрые блюда" : v === "long" ? "долгие блюда, когда есть время" : null;
  if (k === "app") return APPLIANCE[v] ?? null;
  return null;
}

/** Remembers what was done with a dish. Repeats of the same signal within an hour count once. */
export function signal(r: Recipe | undefined | null, kind: Signal): void {
  if (!r) return;
  const s = load();
  const now = Date.now();
  if (s.sigs.some((x) => x.id === r.id && x.w === WEIGHT[kind] && now - x.at < 3600e3)) return;
  s.sigs.push({ id: r.id, w: WEIGHT[kind], at: now, f: traits(r) });
  save(s);
}

/** Each trait's weight: the signals of its dishes, fading by half each month; muted traits are left out. */
export function traitWeights(now = Date.now()): Map<string, number> {
  const s = load();
  const muted = new Set(s.muted);
  const w = new Map<string, number>();
  for (const x of s.sigs) {
    const k = Math.pow(0.5, (now - x.at) / HALF_LIFE) * x.w;
    for (const f of x.f) if (!muted.has(f)) w.set(f, (w.get(f) ?? 0) + k * (IMPORTANCE[f.slice(0, f.indexOf(":"))] ?? 0.3));
  }
  return w;
}

export const signalCount = (): number => load().sigs.length;

/** «Что я про вас понял»: what comes up more often and what less, in words. */
export function understood(): { likes: { key: string; label: string }[]; less: { key: string; label: string }[]; count: number } {
  const w = traitWeights();
  const named = [...w.entries()].map(([key, v]) => ({ key, v, label: traitLabel(key) })).filter((x): x is { key: string; v: number; label: string } => !!x.label);
  const seen = new Set<string>();
  const uniq = (list: typeof named) => list.filter((x) => (seen.has(x.label) ? false : (seen.add(x.label), true)));
  const likes = uniq(named.filter((x) => x.v > 0.6).sort((a, b) => b.v - a.v)).slice(0, 6);
  const less = uniq(named.filter((x) => x.v < -0.6).sort((a, b) => a.v - b.v)).slice(0, 4);
  return { likes, less, count: load().sigs.length };
}
/** «Это не так»: the trait no longer counts (and stays out until the profile is reset). */
export function forgetTrait(key: string): void { const s = load(); if (!s.muted.includes(key)) s.muted.push(key); save(s); }
export function resetTaste(): void { save({ sigs: [], muted: [] }); }

// A small number from the dish and the day: lists are not exactly the same every day (a little exploration).
function jitter(id: string, day: number): number {
  let h = day;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 100) / 250;
}

/**
 * The extra points a dish gets in every list (added to the engine's own taste score): liked traits up, disliked down
 * (only after a few signals); quick on a weekday evening; not what was cooked in the last days.
 */
export function personalScorer(book: BookEntry[], now = new Date()): (r: Recipe) => number {
  const w = traitWeights(now.getTime());
  const max = Math.max(1, ...[...w.values()].map(Math.abs));
  const learnt = signalCount() >= 3;
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  const evening = now.getHours() >= 15;
  const day = Math.floor(now.getTime() / DAY);
  const recent = book.filter((b) => now.getTime() - b.at < 3 * DAY);
  const recentIds = new Set(recent.map((b) => b.recipeId));
  // The main product of what was cooked in the last two days: «курица вчера» — today a little less курица.
  const recentMain = new Set(recent.filter((b) => now.getTime() - b.at < 2 * DAY).map((b) => recipeById(b.recipeId)?.mainIngredient).filter(Boolean));
  const cache = new Map<string, number>();
  return (r) => {
    const hit = cache.get(r.id);
    if (hit !== undefined) return hit;
    let score = 0;
    if (learnt) {
      let raw = 0;
      for (const f of traits(r)) raw += w.get(f) ?? 0;
      score += Math.max(-2.5, Math.min(3, (raw / max) * 1.5));
    }
    if (weekday && evening) score += r.totalMinutes <= 40 ? 0.6 : r.totalMinutes > 90 ? -0.8 : 0;
    else if (!weekday && (r.tags.includes("cozy") || courseOf(r) === "baking")) score += 0.3;
    if (recentIds.has(r.id)) score -= 3;
    else if (r.mainIngredient && recentMain.has(r.mainIngredient)) score -= 0.5;
    score += jitter(r.id, day);
    cache.set(r.id, score);
    return score;
  };
}
