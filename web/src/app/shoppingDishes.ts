// «Для блюд» in «Покупки»: which recipes the list was filled from, so the person can get back to a recipe they don't
// remember the name of, or take a dish's products off the list when they change their mind. Each row keeps how much
// of its amount every recipe asked for (`parts`, recipe id → amount in the row's unit); what was added by hand or for
// another dish stays when one dish is taken off. Rows from before `parts` know only recipe titles (`recipes`).
import { addToShopping, recipeById, recipes, type Recipe, type RecipeIngredient, type ShoppingItem } from "../engine";

const round = (n: number) => Math.round(n * 100) / 100;

/** The products of a recipe added to the list, each row remembering this recipe's share. */
export function addRecipeLines(list: ShoppingItem[], items: RecipeIngredient[], r: Pick<Recipe, "id" | "title">): ShoppingItem[] {
  const before = new Map(list.map((i) => [i.key, i.amount]));
  return addToShopping(list, items, r.title).map((i) => {
    const grew = round(i.amount - (before.get(i.key) ?? 0));
    return grew > 0 ? { ...i, parts: { ...i.parts, [r.id]: round((i.parts?.[r.id] ?? 0) + grew) } } : i;
  });
}

export interface ListDish { id: string; title: string; rows: number }

/** The dishes with products still to buy, in the order they were added. */
export function dishesInList(list: ShoppingItem[]): ListDish[] {
  const out = new Map<string, ListDish>();
  const byTitle = (title: string) => recipes().find((r) => r.title === title);
  for (const i of list) {
    if (i.checked) continue;
    const ids = new Set(Object.keys(i.parts ?? {}));
    // An older row: only titles; the recipe is found by its title.
    for (const t of i.recipes ?? []) { const r = byTitle(t); if (r && ![...ids].some((id) => recipeById(id)?.title === t)) ids.add(r.id); }
    for (const id of ids) {
      const r = recipeById(id);
      if (!r) continue;
      const d = out.get(id) ?? { id, title: r.title, rows: 0 };
      d.rows++;
      out.set(id, d);
    }
  }
  return [...out.values()];
}

/** How many rows still to buy came from this recipe: «✓ 5 продуктов в покупках» on its page. */
export function rowsFor(list: ShoppingItem[], r: Pick<Recipe, "id" | "title">): number {
  return list.filter((i) => !i.checked && (i.parts?.[r.id] !== undefined || (!i.parts && (i.recipes ?? []).includes(r.title)))).length;
}

/** The dish taken off the list: only its share of each row; a row left with nothing goes. */
export function removeDish(list: ShoppingItem[], r: Pick<Recipe, "id" | "title">): ShoppingItem[] {
  return list.flatMap((i) => {
    if (i.checked) return [i];
    const part = i.parts?.[r.id];
    const recipesLeft = (i.recipes ?? []).filter((t) => t !== r.title);
    if (part !== undefined) {
      const { [r.id]: _, ...parts } = i.parts!;
      const amount = round(i.amount - part);
      if (amount <= 0.01) return [];
      return [{ ...i, amount, parts, recipes: recipesLeft }];
    }
    // An older row without shares: it goes only when this dish was its only reason.
    if ((i.recipes ?? []).includes(r.title)) return recipesLeft.length ? [{ ...i, recipes: recipesLeft }] : [];
    return [i];
  });
}
