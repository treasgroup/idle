// Amounts the way people measure at home: eggs and garlic in pieces, a pinch of pepper «по вкусу»,
// one row per product. The catalog keeps grams (for nutrition); this is only how they are shown.
import { aisleOf, formatAmount, ingredient, type RecipeIngredient } from "../engine";

type Item = Pick<RecipeIngredient, "id" | "name" | "amount" | "unit">;

export interface HomeAmount {
  amount: number;
  unit: string;
  /** «2 шт.», «150 г», «по вкусу». */
  text: string;
  toTaste: boolean;
  /** The same in spoons or glasses, for kitchens without scales: «2 ст. л.», «1½ стакана». */
  hint?: string;
}

// Grams (or ml) in a teaspoon, a tablespoon and a 250 ml glass, for products measured that way at home.
const SPOONS: [RegExp, number | null, number, number | null][] = [
  [/^salt$/, 10, 30, null],
  [/^sugar$/, 8, 25, 200],
  [/flour$/, 8, 25, 160],
  [/^semolina$/, 8, 25, 200],
  [/oil$/, 5, 17, null],
  [/^(milk|kefir|cream|heavy-cream|water)$/, 5, 18, 250],
  [/^(sour-cream|mayonnaise|tomato-ketchup)$/, 10, 25, null],
  [/^tomato-paste$/, 10, 30, null],
  [/^honey$|condensed-milk$/, 12, 30, null],
  [/starch$/, 10, 30, null],
  [/^cocoa-powder$/, 7, 20, null],
  [/^prepared-mustard$/, 7, 20, null],
  [/soy-sauce$|vinegar/, 5, 15, null],
  [/rice$|^pearl-barley$|^millet$/, null, 25, 230],
  [/^buckwheat$|lentil$/, null, 25, 210],
  [/^(couscous|bulgur)$/, null, 25, 200],
  [/^oat-flakes$/, null, 12, 90],
];

const frac = (n: number) => {
  const whole = Math.floor(n + 1e-9), rest = n - whole;
  const f = rest < 0.125 ? "" : rest < 0.375 ? "¼" : rest < 0.625 ? "½" : rest < 0.875 ? "¾" : "";
  const w = rest >= 0.875 ? whole + 1 : whole;
  return (w ? String(w) : "") + f || "0";
};
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const glasses = (n: number) => frac(n) + " " + (n <= 1 && n !== 1 ? "стакана" : n === 1 ? "стакан" : n < 5 ? "стакана" : "стаканов");

/** «2 ст. л.» / «1½ стакана» for flour, sugar, oil, milk, grains…; nothing when it would be a rough guess. */
export function spoonHint(id: string, amount: number, unit: string): string | undefined {
  if ((unit !== "г" && unit !== "мл") || amount <= 0) return undefined;
  const row = SPOONS.find(([re]) => re.test(id));
  if (!row) return undefined;
  const [, tsp, tbsp, glass] = unit === "мл" ? [null, 5, 15, 250] as const : row;
  const ok = (got: number, per: number) => Math.abs(got * per - amount) / amount <= 0.26;
  if (glass && amount >= glass * 0.45) {
    const g = roundTo(amount / glass, 0.25);
    if (g <= 5 && ok(g, glass)) return glasses(g);
    return undefined;
  }
  if (tsp && amount < tbsp * 0.75) {
    const n = roundTo(amount / tsp, 0.5);
    return n >= 0.5 && ok(n, tsp) ? frac(n) + " ч. л." : undefined;
  }
  const n = roundTo(amount / tbsp, 0.5);
  return n >= 0.5 && n <= 8 && ok(n, tbsp) ? frac(n) + " ст. л." : undefined;
}

/** Grams in one piece, for products people count rather than weigh. */
const PIECE_GRAMS: Record<string, number> = { egg: 55, "egg-yolk": 20, "egg-white": 33, "bay-leaf": 0.2 };
/** Small amounts that must stay exact even though the shop files them under spices. */
const EXACT = /дрожж|разрыхл|сода|ванил|желатин|агар|кислот|пектин|крахмал|какао/;

const grams = (unit: string) => unit.trim() === "г";

export function homeQuantity(i: Item): HomeAmount {
  const id = i.id;
  if (grams(i.unit) && i.amount > 0) {
    // Eggs: round up to whole ones (a 55 g egg; 60 g still counts as one).
    const piece = PIECE_GRAMS[id];
    if (piece) {
      const n = Math.max(1, id === "bay-leaf" ? Math.round(i.amount / piece) : Math.ceil(i.amount / piece - 0.2));
      return { amount: n, unit: "шт.", text: formatAmount(n, "шт."), toTaste: false };
    }
    // Garlic and the like: the catalog knows how much one clove weighs.
    const per = ingredient(id)?.gramsPerUnit;
    const unit = per && Object.keys(per).find((k) => k !== "мл" && k !== "г" && k !== "шт.");
    if (unit && per![unit] > 0) {
      const n = Math.max(1, Math.round(i.amount / per![unit]));
      return { amount: n, unit, text: formatAmount(n, unit), toTaste: false };
    }
    // Salt, pepper, ground spices under 5 g: nobody weighs them at home.
    const name = (ingredient(id)?.name ?? i.name).toLowerCase();
    if (i.amount < 5 && !EXACT.test(name) && aisleOf({ ingredientId: id, name: i.name }) === "spices")
      return { amount: i.amount, unit: i.unit, text: "по вкусу", toTaste: true };
  }
  return { amount: i.amount, unit: i.unit, text: formatAmount(i.amount, i.unit), toTaste: false, hint: spoonHint(id, i.amount, i.unit) };
}

/** «2 шт.», «150 г · 6 ст. л.», «по вкусу» — the amount as it is shown on a recipe. */
export function homeAmount(i: Item): string {
  const q = homeQuantity(i);
  return q.hint ? q.text + " · " + q.hint : q.text;
}

/** The same product with the same unit listed twice («масло для жарки» and «масло в соус») becomes one row. */
export function mergeSame<T extends RecipeIngredient>(list: T[]): T[] {
  const out: T[] = [];
  for (const i of list) {
    const k = out.findIndex((x) => x.id === i.id && x.unit === i.unit);
    if (k < 0) { out.push({ ...i }); continue; }
    const x = out[k];
    const swap = [...new Set([...(x.swap ?? []), ...(i.swap ?? [])])];
    out[k] = { ...x, amount: Math.round((x.amount + i.amount) * 100) / 100, optional: x.optional && i.optional, ...(swap.length ? { swap } : {}) };
  }
  return out;
}
