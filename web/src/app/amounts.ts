// Amounts the way people measure at home: eggs and garlic in pieces, a pinch of pepper «по вкусу»,
// one row per product. The catalog keeps grams (for nutrition); this is only how they are shown.
import { aisleOf, formatAmount, ingredient, packageHint, shoppingName, type RecipeIngredient } from "../engine";

type Item = Pick<RecipeIngredient, "id" | "name" | "amount" | "unit">;

export interface HomeAmount {
  amount: number;
  unit: string;
  /** «2 шт.», «150 г», «по вкусу». */
  text: string;
  toTaste: boolean;
  /** The same in spoons or glasses, for kitchens without scales: «2 ст. л.», «1,5 стакана». */
  hint?: string;
  /** Under pieces and sprigs, the weight they stand for: «½ шт.» over «125 г». */
  grams?: string;
}

/** Grams in one medium piece of what is counted at home, not weighed: «½ шт.» of a beet, «6 шт.» of onions. */
const MEDIUM: Record<string, number> = {
  onion: 100, "red-onion": 100, carrot: 100, potato: 120, tomato: 120, "green-tomato": 120, cucumber: 120,
  "bell-pepper": 150, apple: 150, pear: 150, zucchini: 300, eggplant: 250, beet: 200, avocado: 150, banana: 120, kiwi: 70, "orange-flesh": 150,
};
/** Fresh herbs: sprigs in a dish, bunches of about 30 г in the shop. */
const HERB = /^(dill|parsley|cilantro|fresh-basil|green-onion)$/;
const BUNCH = 30;
const word = (n: number, one: string, few: string, many: string) => {
  if (!Number.isInteger(n)) return few;
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};
const sprigs = (id: string, g: number) => {
  const w = id === "green-onion" ? "пера" : "веточки";
  if (g <= 3) return "1–2 " + w;
  if (g <= 9) return "2–3 " + w;
  if (g <= 20) return "½ пучка";
  const n = Math.round((g / BUNCH) * 2) / 2;
  return frac(n) + " " + word(n, "пучок", "пучка", "пучков");
};

// Grams (or ml) in a teaspoon, a tablespoon and a 250 ml glass, for products measured that way at home.
const SPOONS: [RegExp, number | null, number, number | null][] = [
  [/^salt$/, 10, 30, null],
  [/^sugar$/, 8, 25, 200],
  [/flour$/, 8, 25, 160],
  [/^semolina$/, 8, 25, 200],
  [/oil$/, 5, 17, null],
  [/^(milk|kefir|cream|heavy-cream)$/, 5, 18, 250],
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

// «½ ч. л.» alone reads well; «1½» puzzles people (the owner asked to avoid it), so with a whole part it is «1,5».
const frac = (n: number) => {
  const whole = Math.floor(n + 1e-9), rest = n - whole;
  if (whole) return String(Math.round(n * 100) / 100).replace(".", ",");
  return rest < 0.125 ? "0" : rest < 0.375 ? "¼" : rest < 0.625 ? "½" : rest < 0.875 ? "¾" : "1";
};
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const glasses = (n: number) => frac(n) + " " + (n <= 1 && n !== 1 ? "стакана" : n === 1 ? "стакан" : n < 5 ? "стакана" : "стаканов");

/** «2 ст. л.» / «1,5 стакана» for flour, sugar, oil, milk, grains…; nothing when it would be a rough guess. */
export function spoonHint(id: string, amount: number, unit: string): string | undefined {
  if ((unit !== "г" && unit !== "мл") || amount <= 0 || id === "water") return undefined;
  const row = SPOONS.find(([re]) => re.test(id));
  if (!row) return undefined;
  const [, tsp, tbsp, glass] = unit === "мл" ? [null, 5, 15, 250] as const : row;
  const ok = (got: number, per: number) => Math.abs(got * per - amount) / amount <= 0.26;
  if (glass && amount >= glass * 0.45) {
    const g = roundTo(amount / glass, 0.5);
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
    // Vegetables and fruit in medium pieces, to the half: «½ шт.», «1,5 шт.»; a little of one (20 г of onion) stays in grams.
    const medium = MEDIUM[id];
    if (medium && i.amount >= medium * 0.3) {
      // To the half, a quarter goes down: 150 г of potato (1¼) is «1 шт.», not «1,5».
      const n = Math.max(0.5, Math.ceil((i.amount / medium) * 2 - 0.5) / 2);
      return { amount: n, unit: "шт.", text: frac(n) + " шт.", toTaste: false, grams: formatAmount(i.amount, i.unit) };
    }
    if (HERB.test(id)) return { amount: i.amount, unit: i.unit, text: sprigs(id, i.amount), toTaste: false, grams: formatAmount(i.amount, i.unit) };
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
  const more = q.grams ?? q.hint;
  return more ? q.text + " · " + more : q.text;
}

/**
 * How much to take in the shop, rounded up to what is sold: «6 шт.» of onions, «1 головка» of garlic, «2 пучка» of
 * parsley, «1 батон». `need` is the real amount under it; `name` replaces the product's name («Лимонный сок» → «Лимон»).
 * Null: the shop list keeps its own packs («десяток», «2 пачки по 400 г») or the plain amount.
 */
export function shopQuantity(id: string, amount: number, unit: string): { text: string; need?: string; name?: string } | null {
  if (!(amount > 0)) return null;
  const g = grams(unit) || unit.trim() === "мл";
  const medium = MEDIUM[id];
  if (medium && grams(unit)) {
    const n = Math.max(1, Math.ceil(amount / medium - 0.15));
    return { text: n + " шт.", need: "нужно " + formatAmount(amount, unit) };
  }
  if (HERB.test(id) && grams(unit)) {
    const n = Math.max(1, Math.ceil(amount / BUNCH - 0.1));
    return { text: n + " " + word(n, "пучок", "пучка", "пучков") };
  }
  if (id === "garlic") {
    const cloves = grams(unit) ? Math.max(1, Math.round(amount / 5)) : /^зубч/.test(unit.trim()) ? Math.ceil(amount) : 0;
    if (!cloves) return null;
    const heads = Math.ceil(cloves / 10);
    return { text: heads + " " + word(heads, "головка", "головки", "головок"), need: "нужно " + cloves + " " + word(cloves, "зубчик", "зубчика", "зубчиков") };
  }
  if ((id === "lemon-juice" || id === "lemon") && g) {
    const n = Math.max(1, Math.ceil(amount / (id === "lemon" ? 90 : 35) - 0.1));
    return { name: "Лимон", text: n + " шт.", need: (id === "lemon-juice" ? "на сок, нужно " : "нужно ") + formatAmount(amount, unit) };
  }
  if ((id === "white-bread" || id === "rye-bread") && grams(unit)) {
    const white = id === "white-bread", n = Math.max(1, Math.ceil(amount / (white ? 400 : 700) - 0.05));
    return { name: white ? "Белый хлеб" : "Ржаной хлеб", text: n + " " + (white ? word(n, "батон", "батона", "батонов") : word(n, "буханка", "буханки", "буханок")), need: "нужно " + formatAmount(amount, unit) };
  }
  return null;
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

/** A shopping row: the name, how much to take, and under it how much is really needed (when that differs). */
export function shopLine(i: { ingredientId: string; name: string; amount: number; unit: string }): { name: string; text: string; need?: string } {
  const q = shopQuantity(i.ingredientId, i.amount, i.unit);
  const name = q?.name ?? shoppingName(i.ingredientId, i.name);
  if (q) return { name, text: q.text, need: q.need };
  const pack = packageHint(i.ingredientId, i.amount, i.unit);
  return pack ? { name, text: pack, need: "нужно " + formatAmount(i.amount, i.unit) } : { name, text: formatAmount(i.amount, i.unit) };
}
