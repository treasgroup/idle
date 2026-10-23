// «Под вашу кухню»: what went wrong last time — the oven, the salt, the water for grains — remembered from «Что не
// так?» after cooking and from «Спасти блюдо», and offered as a quiet hint in similar dishes. The recipe itself never
// changes: an oven at the dacha or one bad day must not rewrite it. Kept in the profile, on this device only.
import type { Recipe, RecipeIngredient } from "../engine";
import { homeQuantity, spoonHint } from "./amounts";

export type FixId = "oven-hot" | "oven-weak" | "salt-less" | "salt-more" | "water-more" | "water-less";
export interface KitchenFix { id: FixId; at: number }

const OPPOSITE: Record<FixId, FixId> = {
  "oven-hot": "oven-weak", "oven-weak": "oven-hot", "salt-less": "salt-more", "salt-more": "salt-less", "water-more": "water-less", "water-less": "water-more",
};

/** What «Что я про вас понял» says about each one. */
export const FIX_INFO: Record<FixId, { icon: string; title: string; line: string }> = {
  "oven-hot": { icon: "🔥", title: "Духовка печёт сильнее", line: "В выпечке и запеканках — на 10° ниже и проверить раньше" },
  "oven-weak": { icon: "🔥", title: "Духовка печёт слабее", line: "Держать дольше и проверять середину" },
  "salt-less": { icon: "🧂", title: "Солите меньше", line: "Подскажу класть соли вдвое меньше и досаливать в конце" },
  "salt-more": { icon: "🧂", title: "Любите посолонее", line: "Подскажу пробовать в конце и досаливать" },
  "water-more": { icon: "🍚", title: "Крупам нужно больше воды", line: "Гречка, рис, пшено — воды на четверть больше" },
  "water-less": { icon: "🍚", title: "Крупы развариваются", line: "Гречка, рис, пшено — воды чуть меньше и проверить раньше" },
};

/** A new mark replaces the opposite one: the hint went too far, or the oven was changed. */
export function addFix(list: KitchenFix[], id: FixId, now = Date.now()): KitchenFix[] {
  return [...list.filter((f) => f.id !== id && f.id !== OPPOSITE[id]), { id, at: now }];
}
export const removeFix = (list: KitchenFix[], id: FixId) => list.filter((f) => f.id !== id);

export function normalizeFixes(raw: unknown): KitchenFix[] {
  if (!Array.isArray(raw)) return [];
  let out: KitchenFix[] = [];
  for (const f of raw) if (f && typeof f === "object" && (f as KitchenFix).id in OPPOSITE && typeof (f as KitchenFix).at === "number") out = addFix(out, (f as KitchenFix).id, (f as KitchenFix).at);
  return out;
}

// What a dish is, for the chips after cooking and for the hints.
const TEMP = /(\d{3})\s*°/;
const ovenTemp = (text: string) => { const m = /духовк|выпека|запека/i.test(text) ? text.match(TEMP) : null; const t = m ? Number(m[1]) : 0; return t >= 150 && t <= 260 ? t : 0; };
/** Baked at a real temperature (not only kept warm at 80°). */
export const usesOven = (r: Pick<Recipe, "steps">) => r.steps.some((s) => ovenTemp(s.text) > 0);
// Grains that take in their water; not porridge on milk, not noodles, not rice that is already cooked.
const GRAIN = /^(buckwheat|rice|short-grain-rice|arborio-rice|brown-rice|millet|pearl-barley|barley-groats|wheat-groats|bulgur|couscous|quinoa)$/;
const water = (r: Pick<Recipe, "ingredients">) => r.ingredients.find((i) => i.id === "water" && i.unit === "мл" && i.amount >= 100);
export const isGrain = (r: Pick<Recipe, "mainIngredient" | "course" | "ingredients">) => GRAIN.test(r.mainIngredient ?? "") && r.course !== "soup" && !!water(r);
export const salted = (r: Pick<Recipe, "ingredients">) => r.ingredients.some((i) => i.id === "salt");

/** The chips under «Так себе»: the kitchen ones fit the dish; the last ones tell the owner what to rewrite. */
export function troubleChips(r: Recipe): { label: string; fix?: FixId; atStep?: boolean }[] {
  return [
    ...(usesOven(r) ? [{ label: "Верх подгорел", fix: "oven-hot" as const }, { label: "Внутри сыровато", fix: "oven-weak" as const }] : []),
    ...(isGrain(r) ? [{ label: "Не доварилось", fix: "water-more" as const }, { label: "Разварилось", fix: "water-less" as const }, { label: "Вода осталась", fix: "water-less" as const }] : []),
    ...(!usesOven(r) && !isGrain(r) ? [{ label: "Пригорело или не прожарилось", atStep: true }] : []),
    ...(salted(r) ? [{ label: "Пересолено", fix: "salt-less" as const }, { label: "Пресно", fix: "salt-more" as const }] : []),
    { label: "Непонятный шаг", atStep: true },
    { label: "Слишком сложно" },
    { label: "Просто не наше" },
  ];
}
/** «✓ Запомнил: …» after a chip. */
export const REMEMBERED: Record<FixId, string> = {
  "oven-hot": "ваша духовка печёт сильнее. В следующей выпечке подскажу.",
  "oven-weak": "ваша духовка печёт слабее. В следующий раз подскажу держать дольше.",
  "salt-less": "солить меньше. Подскажу у соли в рецептах.",
  "salt-more": "соли можно больше. Подскажу досолить в конце.",
  "water-more": "крупе нужно больше воды. Подскажу, сколько налить.",
  "water-less": "крупа разваривается. Подскажу налить меньше воды.",
};

/** «Спасти блюдо» (app/rescue) during cooking: the same marks. */
export const RESCUE_FIX: Record<string, FixId> = {
  salty: "salt-less", "salty-soup": "salt-less", "soup-bland": "salt-more", "bake-top": "oven-hot", "casserole-raw": "oven-weak",
  "rice-hard": "water-more", "grain-hard": "water-more", "grain-mushy": "water-less", "grain-water": "water-less",
};

// Minutes of a step: its timer, or «40 минут», «30–35 минут» (the lower one).
function minutesOf(step: Recipe["steps"][number]): number {
  if (step.timerSeconds) return Math.round(step.timerSeconds / 60);
  const m = step.text.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*мин/);
  return m ? Number(m[1]) : 0;
}
const earlier = (m: number) => (m >= 60 ? m - 10 : m >= 20 ? m - 5 : m >= 10 ? m - 3 : 0);
const longer = (m: number) => (m >= 60 ? 15 : m >= 20 ? 10 : 5);
const BAKES = /запека|выпека|запеч|выпеч|духовк/i;
const roundTo50 = (n: number) => Math.max(50, Math.round(n / 50) * 50);

export interface StepHint { fix: FixId; text: string }

/**
 * The hints for this recipe. `lines`: its products for the servings being cooked (for the water and the salt).
 * steps: step index → hint; products: product id → a short line under it.
 */
export function kitchenHints(r: Recipe, fixes: KitchenFix[], lines: RecipeIngredient[]): { steps: Record<number, StepHint>; products: Record<string, StepHint> } {
  const steps: Record<number, StepHint> = {}, products: Record<string, StepHint> = {};
  const has = (id: FixId) => fixes.some((f) => f.id === id);
  if (usesOven(r) && (has("oven-hot") || has("oven-weak"))) {
    r.steps.forEach((s, n) => {
      const t = ovenTemp(s.text), m = BAKES.test(s.text) ? minutesOf(s) : 0;
      if (has("oven-hot")) {
        const check = earlier(m);
        if (t && check) steps[n] = { fix: "oven-hot", text: "В прошлый раз верх подгорал. Поставьте " + (t - 10) + "° и загляните на " + check + "-й минуте." };
        else if (t) steps[n] = { fix: "oven-hot", text: "В прошлый раз верх подгорал — включите на " + (t - 10) + "° вместо " + t + "°." };
        else if (check) steps[n] = { fix: "oven-hot", text: "Ваша духовка печёт сильнее — загляните на " + check + "-й минуте." };
      } else if (m >= 10) {
        steps[n] = { fix: "oven-weak", text: "В прошлый раз внутри было сыровато — держите на " + longer(m) + " минут дольше и проверьте середину." };
      }
    });
  }
  const w = isGrain(r) ? lines.find((i) => i.id === "water" && i.unit === "мл") : undefined;
  if (w && (has("water-more") || has("water-less"))) {
    const more = has("water-more");
    const to = roundTo50(w.amount * (more ? 1.25 : 0.85));
    const amount = (n: number) => homeQuantity({ ...w, amount: n }).text;
    if (to !== roundTo50(w.amount)) {
      products.water = { fix: more ? "water-more" : "water-less", text: (more ? "в прошлый раз вода ушла раньше — налейте " : "в прошлый раз разварилось — налейте ") + amount(to) };
      // The step where the water goes in, or else the one where it boils.
      const pour = r.steps.findIndex((s) => /(залейте|влейте|налейте|добавьте)[^.]*вод|вод[^.]*кипени/i.test(s.text));
      const boil = r.steps.findIndex((s) => /вар/i.test(s.text) && minutesOf(s) > 0);
      const at = pour >= 0 ? pour : boil;
      if (at >= 0) steps[at] = more
        ? { fix: "water-more", text: "Воды — " + amount(to) + " вместо " + amount(w.amount) + ", огонь — самый маленький, крышку не открывать." }
        : { fix: "water-less", text: "Воды — " + amount(to) + " вместо " + amount(w.amount) + ", и загляните на 3–5 минут раньше." };
    }
  }
  const salt = lines.find((i) => i.id === "salt");
  if (salt && has("salt-less")) {
    // In spoons when half of it makes a spoon measure; nobody weighs 3 г of salt.
    const spoons = spoonHint("salt", salt.amount / 2, salt.unit);
    products.salt = { fix: "salt-less", text: spoons ? "обычно у вас солоно — положите " + spoons + ", досолите в конце" : "обычно у вас солоно — солите вдвое меньше и досолите в конце" };
  } else if (salt && has("salt-more")) {
    products.salt = { fix: "salt-more", text: "в прошлый раз было пресно — попробуйте в конце и досолите" };
  }
  return { steps, products };
}
