// "Неделя без остатков": what will be left in the packs after cooking the week's menu, and dishes that use it up.
import {
  freshConditions, isPerishable, menuShopping, packageFor, rankRecipes, recipes, shortName, type EngineState, type MenuDay, type Recipe,
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
