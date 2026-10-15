// Things people do from many screens: open a recipe, save it, put it into the list, cook it.
import { useCallback } from "react";
import {
  addToFridge, addToShopping, basics, clampServings, ingredientMatches, ingredientsToBuy, recipeById, track, updateTaste, useUpFromFridge,
  type EngineState, type Recipe,
} from "../engine";
import { useStore } from "./store";
import { openLayer, close, routeHash, parseRoute } from "./router";
import { stopTimersFor } from "./timers";
import { cue } from "./feedback";

/** Ingredient ids the person has: the conditions they named plus the home pantry and staples. */
export function haveIds(s: EngineState): string[] {
  const c = s.conditions;
  return [
    ...c.available.filter((id) => !c.absent.includes(id)),
    ...s.fridge.map((f) => f.id),
    ...basics(s.preferences),
  ].filter((id) => !c.absent.includes(id));
}

export function useActions() {
  const { s, update, toast, setProfile, catalog } = useStore();

  const openRecipe = useCallback((r: Recipe | string) => {
    const id = typeof r === "string" ? r : r.id;
    const recipe = recipeById(id);
    // Until the full catalog has arrived, the recipe page waits for it (a shared link to a newer recipe).
    if (!recipe && catalog.source === "server") return toast("Этот рецепт больше не в каталоге.");
    track({ type: "open", recipeId: id });
    if (recipe) update((st) => ({ ...st, engaged: true, recent: [recipe, ...st.recent.filter((x) => x.id !== id)].slice(0, 20) }));
    const route = parseRoute(location.hash);
    openLayer(routeHash({ tab: route.tab, recipe: id }));
  }, [update, toast, catalog.source]);

  const closeRecipe = useCallback(() => {
    const route = parseRoute(location.hash);
    close(routeHash({ tab: route.tab }));
  }, []);

  const isFavorite = useCallback((id: string) => s.favorites.some((f) => f.id === id), [s.favorites]);

  const toggleFavorite = useCallback((r: Recipe) => {
    const on = s.favorites.some((f) => f.id === r.id);
    cue(on ? "tap" : "success");
    if (!on) track({ type: "favorite", recipeId: r.id });
    update((st) => ({
      ...st,
      engaged: true,
      favorites: on ? st.favorites.filter((f) => f.id !== r.id) : [r, ...st.favorites],
      taste: on ? st.taste : updateTaste(st.taste, r.id, "liked"),
    }));
    if (on) toast("Убрано из сохранённого", { label: "Отменить", run: () => update((st) => (st.favorites.some((f) => f.id === r.id) ? st : { ...st, favorites: [r, ...st.favorites] })) });
    else toast("Сохранено");
  }, [s.favorites, update, toast]);

  /** Adds what is missing for the dish to the shopping list (scaled to servings). */
  const addRecipeToShopping = useCallback((r: Recipe, servings: number, have?: string[]) => {
    const has = have ?? haveIds(s);
    const items = ingredientsToBuy(r, clampServings(r, servings), has).filter((i) => !i.optional);
    if (!items.length) return toast("Всё для этого блюда уже есть дома.");
    track({ type: "cart", recipeId: r.id });
    cue("success");
    update((st) => ({ ...st, shopping: addToShopping(st.shopping, items, r.title) }));
    toast("В списке покупок: " + items.length + " " + (items.length === 1 ? "продукт" : items.length < 5 ? "продукта" : "продуктов"));
  }, [s, update, toast]);

  const startCooking = useCallback((r: Recipe, servings: number) => {
    const n = clampServings(r, servings);
    track({ type: "cook_start", recipeId: r.id });
    update((st) => ({
      ...st,
      engaged: true,
      cooking: { recipe: r, servings: n, step: 0, timerEnd: null, timerStep: null, startedAt: Date.now(), done: false },
    }));
    // A second dish belongs to the previous cooking session.
    setProfile((p) => (p.parallel ? { ...p, parallel: null } : p));
    openLayer(routeHash({ cook: true }));
  }, [update, setProfile]);

  /** The dish is done: into "Моя книга", taste profile, used-up perishables off the home list. */
  const finishCooking = useCallback((r: Recipe, fromMenu = false, markDone = true) => {
    track({ type: "cook_done", recipeId: r.id });
    stopTimersFor(r.id);
    let removed = 0;
    update((st) => {
      const used = useUpFromFridge(st, r);
      removed = used.removed.length;
      return {
        ...used.data,
        cooking: st.cooking && markDone ? { ...st.cooking, done: true } : st.cooking,
        taste: updateTaste(st.taste, r.id, "cooked"),
        book: [...st.book, { id: crypto.randomUUID().slice(0, 36), recipeId: r.id, title: r.title, at: Date.now(), ...(fromMenu ? { menu: true } : {}) }].slice(-300),
      };
    });
    if (removed) toast("Отметил в «Мои продукты»: продукты для блюда израсходованы");
  }, [update, toast, catalog.source]);

  const markHave = useCallback((ids: string[]) => {
    update((st) => ({ ...st, fridge: addToFridge(st.fridge, ids) }));
  }, [update]);

  const missingFor = useCallback((r: Recipe) => {
    const have = haveIds(s);
    return r.ingredients.filter((i) => !i.optional && !have.some((h) => ingredientMatches(i.id, h)));
  }, [s]);

  return { openRecipe, closeRecipe, isFavorite, toggleFavorite, addRecipeToShopping, startCooking, finishCooking, markHave, missingFor };
}
