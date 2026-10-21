// "Неделя без остатков": what will be left in the packs after cooking the week's menu, and dishes that use it up.
import {
  basics, freshConditions, isPerishable, menuShopping, packageFor, rankRecipes, recipes, scaleIngredient, shortName, type EngineState, type MenuDay, type Recipe,
} from "../engine";
import { haveIds } from "./actions";

export interface Leftover { id: string; name: string; need: number; buy: string; left: number; unit: string; ideas: Recipe[] }

const fmt = (n: number, unit: string) =>
  unit !== "шт." && n >= 1000 ? (Math.round(n / 100) / 10).toLocaleString("ru") + (unit === "мл" ? " л" : " кг") : Math.round(n) + " " + unit;

export function weekLeftovers(s: EngineState, menu: MenuDay[]): Leftover[] {
  const list = menuShopping(menu, [], haveIds(s));
  const inMenu = new Set(menu.flatMap((d) => d.items.map((i) => i.recipeId)));
  const out: Leftover[] = [];
  for (const item of list) {
    if (!isPerishable(item.ingredientId)) continue;
    const pack = packageFor(item.ingredientId, item.amount, item.unit);
    if (!pack) continue;
    const left = pack.count * pack.size - item.amount;
    if (left < pack.size * 0.25) continue; // a spoon or two left is not worth a dish
    const c = { ...freshConditions({ servings: s.conditions.servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), desired: [item.ingredientId] };
    const ideas = rankRecipes(recipes(), c, s.preferences, 6).map((m) => m.recipe).filter((r) => !inMenu.has(r.id)).slice(0, 3);
    out.push({
      id: item.ingredientId, name: shortName(item.ingredientId), need: item.amount, unit: item.unit, left,
      buy: (pack.count > 1 ? pack.count + " × " : "") + fmt(pack.size, pack.unit), ideas,
    });
  }
  return out.sort((a, b) => b.left / b.need - a.left / a.need).slice(0, 6);
}

export const amountText = fmt;

// ---------- «Шеф помнит, что осталось» ----------
// After cooking: what is left in the packs (sour cream, cream, a piece of cheese) goes to «Мои продукты» by itself,
// with «Отменить», and for a few days Главная offers a dish that uses it up. Only things that spoil — not flour or rice.

export interface LeftAfter { id: string; name: string; left: string }

/** Perishable products of a cooked dish with a real remainder in the pack (a quarter of the pack or more), not already at home. */
export function leftoversOf(r: Recipe, servings: number, s: EngineState): LeftAfter[] {
  const skip = basics(s.preferences);
  const out: LeftAfter[] = [];
  for (const i of r.ingredients) {
    if (skip.has(i.id) || i.id === "water" || i.optional || !isPerishable(i.id) || s.fridge.some((f) => f.id === i.id) || out.some((x) => x.id === i.id)) continue;
    const x = scaleIngredient(i, r, servings);
    const pack = packageFor(i.id, x.amount, x.unit);
    if (!pack) continue;
    const left = pack.count * pack.size - x.amount;
    if (left >= pack.size * 0.25) out.push({ id: i.id, name: shortName(i.id).toLowerCase(), left: fmt(left, pack.unit) });
  }
  return out.slice(0, 4);
}

const LEFT = "cook-leftovers-v1";
interface LeftNote { id: string; from: string; at: number }
const readLeft = (): LeftNote[] => { try { const v = JSON.parse(localStorage.getItem(LEFT) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
export function rememberLeftovers(ids: string[], from: string): void {
  const now = Date.now();
  const keep = readLeft().filter((x) => now - x.at < 4 * 864e5 && !ids.includes(x.id));
  try { localStorage.setItem(LEFT, JSON.stringify([...keep, ...ids.map((id) => ({ id, from, at: now }))].slice(-12))); } catch { /* private mode */ }
}
/** Left over in the last three days and still at home: what Главная offers to use up first. */
export function recentLeftovers(s: EngineState): LeftNote[] {
  const now = Date.now();
  return readLeft().filter((x) => now - x.at < 3 * 864e5 && s.fridge.some((f) => f.id === x.id));
}
