// «Заготовить на неделю»: cook today — dinners for the next five days. Only dishes that keep: days 1–3 from the
// fridge (a dish whose storage days reach that day), days 4–5 from the freezer (dishes that freeze). Picked to share
// ingredients (one pack of mince for two dishes), without repeating the main product, at most two soups.
import type { Recipe } from "../engine";

export interface PrepDay { date: string; recipe: Recipe; from: "fridge" | "freezer" }

// Everyday basics do not count as «shared»: every dish has them.
const BASIC = new Set(["salt", "water", "black-pepper", "vegetable-oil", "sunflower-oil", "olive-oil", "sugar", "bay-leaf", "garlic", "onion"]);

// Dishes that mostly cook by themselves (soups, stews, the oven): five of them fit an afternoon, five fiddly ones do not.
export const prepCandidates = (pool: Recipe[]): Recipe[] =>
  pool.filter((r) => (r.course === "main" || r.course === "soup") && r.totalMinutes <= 150 && (r.activeMinutes || r.totalMinutes) <= 45
    && ((r.storageDays ?? 0) >= 1 || (r.freezerDays ?? 0) > 0));
const isCasserole = (r: Recipe) => /запеканк|лазань/i.test(r.title);

/** A steady «random» per dish and seed, so «Другой набор» changes the set but a re-render does not. */
const rnd = (id: string, seed: number) => { let h = seed | 0; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761); return ((h >>> 0) % 1000) / 1000; };

export function pickPrep(pool: Recipe[], dates: string[], seed: number, keep: Record<string, string> = {}): PrepDay[] {
  const cands = prepCandidates(pool);
  const chosen: PrepDay[] = [];
  // Dishes kept for later days are reserved: a replaced day must not take them (or their main product).
  const reserved = (date: string) => Object.entries(keep).filter(([d]) => d !== date && !chosen.some((c) => c.date === d)).map(([, id]) => cands.find((r) => r.id === id)).filter((r): r is Recipe => !!r);
  const used = (r: Recipe, date: string) => [...chosen.map((c) => c.recipe), ...reserved(date)]
    .some((c) => c.id === r.id || (!!r.mainIngredient && c.mainIngredient === r.mainIngredient));
  dates.forEach((date, i) => {
    const freezer = i >= 3;
    const fits = (r: Recipe) => (freezer ? (r.freezerDays ?? 0) > 0 : (r.storageDays ?? 0) >= i + 1)
      && !used(r, date) && !(isCasserole(r) && chosen.filter((c) => isCasserole(c.recipe)).length >= 2) && !(r.course === "soup" && [...chosen.map((c) => c.recipe), ...reserved(date)].filter((c) => c.course === "soup").length >= 2);
    const kept = keep[date] ? cands.find((r) => r.id === keep[date]) : undefined;
    // A kept dish only needs to keep fitting its own day (it is not «used» by its own reservation).
    const fitsKept = (r: Recipe) => (freezer ? (r.freezerDays ?? 0) > 0 : (r.storageDays ?? 0) >= i + 1) && !chosen.some((c) => c.recipe.id === r.id);
    const shared = new Set(chosen.flatMap((c) => c.recipe.ingredients.map((x) => x.id)).filter((x) => !BASIC.has(x)));
    const soups = chosen.filter((c) => c.recipe.course === "soup").length;
    const score = (r: Recipe) => r.ingredients.filter((x) => shared.has(x.id)).length * 2 + rnd(r.id, seed + i) * 3
      - (r.activeMinutes || r.totalMinutes) / 10 + (r.course === "soup" && soups === 0 ? 3 : 0);
    const best = kept && fitsKept(kept) ? kept : cands.filter(fits).sort((a, b) => score(b) - score(a))[0];
    if (best) chosen.push({ date, recipe: best, from: freezer ? "freezer" : "fridge" });
  });
  return chosen;
}
