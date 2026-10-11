// Approximate cost of a dish and of the week menu, from data/prices.json on the site (the owner edits it).
import { useEffect, useState } from "react";
import { aisleOf, ingredient, ingredientGrams, scaleIngredient, siteBase, type MenuDay, type Recipe, recipeById, clampServings } from "../engine";

interface Prices { perKg: Record<string, number>; perPiece: Record<string, number>; aisle: Record<string, number> }
let cache: Prices | null = null;
let pending: Promise<Prices | null> | null = null;

export function loadPrices(): Promise<Prices | null> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch(siteBase() + "data/prices.json").then((r) => (r.ok ? r.json() : null)).then((j) => (cache = j && j.perKg ? j : null)).catch(() => null);
  return pending;
}

export function usePrices(): Prices | null {
  const [p, setP] = useState<Prices | null>(cache);
  useEffect(() => { if (!p) void loadPrices().then(setP); }, [p]);
  return p;
}

const FREE = new Set(["water", "salt", "black-pepper"]);

/** Roubles for the dish at this number of servings, or null without prices. */
export function recipeCost(p: Prices | null, r: Recipe, servings: number): number | null {
  if (!p) return null;
  let sum = 0;
  for (const raw of r.ingredients) {
    if (raw.optional || FREE.has(raw.id)) continue;
    const i = scaleIngredient(raw, r, clampServings(r, servings));
    if (i.unit === "шт." && p.perPiece[i.id]) { sum += i.amount * p.perPiece[i.id]; continue; }
    const g = ingredientGrams(i);
    if (g === null) continue;
    const kg = p.perKg[i.id] ?? p.aisle[aisleOf({ ingredientId: i.id, name: ingredient(i.id)?.name ?? i.name })] ?? 300;
    sum += (g / 1000) * kg;
  }
  return Math.max(10, Math.round(sum / 10) * 10);
}

export function menuCost(p: Prices | null, menu: MenuDay[]): number | null {
  if (!p) return null;
  let sum = 0;
  for (const d of menu) for (const it of d.items) {
    if (it.leftover) continue;
    const r = recipeById(it.recipeId);
    const c = r ? recipeCost(p, r, it.servings) : null;
    if (c) sum += c;
  }
  return Math.round(sum / 50) * 50;
}

export const rub = (n: number) => "≈ " + n.toLocaleString("ru-RU") + " ₽";
