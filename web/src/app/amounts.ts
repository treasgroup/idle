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
  return { amount: i.amount, unit: i.unit, text: formatAmount(i.amount, i.unit), toTaste: false };
}

/** «2 шт.», «150 г», «по вкусу» — the amount as it is shown on a recipe. */
export function homeAmount(i: Item): string {
  return homeQuantity(i).text;
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
