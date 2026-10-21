// «Ужин к сроку»: two or three dishes ready together at one time. Each dish is laid out backwards from the serving
// time by its steps; steps that need hands (cut, fry, mix) never overlap between dishes — when they would, a dish
// starts earlier — while waits (stewing, baking, soaking) may run side by side. The result is one timeline of
// steps, the free windows in it and the time spent at the stove. Pure logic: the screen is components/DinnerPlan.
import type { Recipe } from "../engine";

export interface DinnerDish { recipeId: string; servings: number }
/** What is kept on the device: the dishes, when to serve and which steps are done. */
export interface DinnerPlan { serveAt: number; dishes: DinnerDish[]; done: string[]; at: number }

export interface Item {
  key: string;
  dish: number;
  recipeId: string;
  step: number;
  text: string;
  start: number;
  /** End of the part that needs hands. */
  handsEnd: number;
  /** Seconds of waiting after it (a timer), 0 if none. */
  wait: number;
}
export interface Schedule { items: Item[]; start: number; serveAt: number; handsOn: number; free: { from: number; to: number }[] }

const MIN = 60e3;

/** Minutes of hands and of waiting for each step. A step with a timer: two minutes to set it going, then the wait.
 * The other steps share the recipe's active time by the length of their text (2–25 minutes each). */
export function stepTimes(r: Recipe): { hands: number; wait: number }[] {
  const timed = r.steps.map((s) => (s.timerSeconds ?? 0) > 0);
  const plain = r.steps.filter((_, i) => !timed[i]);
  const chars = plain.reduce((a, s) => a + s.text.length, 0) || 1;
  const budget = Math.max((r.activeMinutes || Math.round(r.totalMinutes / 2)) - 2 * timed.filter(Boolean).length, plain.length * 2);
  return r.steps.map((s, i) => timed[i]
    ? { hands: 2, wait: Math.round((s.timerSeconds ?? 0) / 60) }
    : { hands: Math.min(25, Math.max(2, Math.round((budget * s.text.length) / chars))), wait: 0 });
}

function layOut(r: Recipe, dish: number, serveAt: number): Item[] {
  const times = stepTimes(r);
  const items: Item[] = [];
  let t = serveAt;
  for (let k = r.steps.length - 1; k >= 0; k--) {
    const { hands, wait } = times[k];
    const start = t - (hands + wait) * MIN;
    items.unshift({ key: r.id + ":" + k, dish, recipeId: r.id, step: k, text: r.steps[k].text, start, handsEnd: start + hands * MIN, wait: wait * 60 });
    t = start;
  }
  return items;
}

const overlap = (a: Item, b: Item) => a.start < b.handsEnd && b.start < a.handsEnd;

/** Who keeps the exact serving time: a hot main first, then soup and sides; sweets and cold dishes can be ready earlier. */
const HOT: Record<string, number> = { main: 0, soup: 1, side: 2, breakfast: 3, baking: 4, dessert: 5, sauce: 6, salad: 7, snack: 7, drink: 8 };

export function schedule(recipes: Recipe[], serveAt: number): Schedule {
  // Placed in that order: the first ends exactly on time; the others fit their hands around what is placed.
  const order = recipes.map((r, i) => ({ r, i }))
    .sort((a, b) => (HOT[a.r.course ?? "main"] ?? 4) - (HOT[b.r.course ?? "main"] ?? 4) || b.r.totalMinutes - a.r.totalMinutes);
  const placed: Item[] = [];
  for (const { r, i } of order) {
    let items = layOut(r, i, serveAt);
    for (let guard = 0; guard < 40; guard++) {
      let shift = 0;
      for (const it of items) for (const p of placed) if (overlap(it, p)) shift = Math.max(shift, it.handsEnd - p.start);
      if (!shift) break;
      const by = Math.ceil(shift / MIN) * MIN;
      items = items.map((it) => ({ ...it, start: it.start - by, handsEnd: it.handsEnd - by }));
    }
    placed.push(...items);
  }
  const items = placed.sort((a, b) => a.start - b.start || a.dish - b.dish);
  const start = items[0]?.start ?? serveAt;
  // Free windows: no hands needed for 10 minutes or more.
  const free: { from: number; to: number }[] = [];
  let busyTill = start;
  for (const it of items) {
    if (it.start - busyTill >= 10 * MIN) free.push({ from: busyTill, to: it.start });
    busyTill = Math.max(busyTill, it.handsEnd);
  }
  if (serveAt - busyTill >= 10 * MIN) free.push({ from: busyTill, to: serveAt });
  const handsOn = Math.round(items.reduce((a, it) => a + (it.handsEnd - it.start), 0) / MIN);
  return { items, start, serveAt, handsOn, free };
}

// ---------- kept on the device ----------
const KEY = "cook-dinner-v1";
export function loadDinner(): DinnerPlan | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null") as DinnerPlan | null;
    // A plan lives until two hours after serving.
    return p && Array.isArray(p.dishes) && p.serveAt + 2 * 60 * MIN > Date.now() ? p : null;
  } catch { return null; }
}
export function saveDinner(p: DinnerPlan | null): void {
  try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch { /* private mode */ }
  window.dispatchEvent(new Event(KEY));
}
export const DINNER_EVENT = KEY;
