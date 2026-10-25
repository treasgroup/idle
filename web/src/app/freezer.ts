// «Морозилка»: what lies frozen — cooked dishes (заготовки, остатки) and products bought ahead — with portions and how
// long each has been there. Shared by the family like the plan and the shopping list (state.freezer, synced with the
// household's document). In the evening Главная offers to take a dish out; one tap puts it into tomorrow's plan.
import { useCallback, useEffect } from "react";
import { dateKey, ingredient, plural, recipeById, type EngineState, type FrozenItem, type MenuDay } from "../engine";
import { useStore } from "./store";

export type Frozen = FrozenItem;
const DAY = 86400000;
const MAX = 80;

/** The freezer and what can be done with it; every change goes through the shared state (and so to the family). */
export function useFreezer() {
  const { s, update } = useStore();
  const list = s.freezer ?? [];
  const add = useCallback((x: Omit<Frozen, "id" | "at">) => update((st) => ({ ...st, freezer: withAdded(st.freezer ?? [], x) })), [update]);
  const remove = useCallback((id: string) => update((st) => ({ ...st, freezer: (st.freezer ?? []).filter((f) => f.id !== id) })), [update]);
  const take = useCallback((id: string, n: number) => update((st) => ({ ...st, freezer: takenOut(st.freezer ?? [], id, n) })), [update]);
  /** Puts back what was before (the plan too): for «Отменить». */
  const restore = useCallback((before: Pick<EngineState, "freezer" | "menu">) => update((st) => ({ ...st, freezer: before.freezer, menu: before.menu })), [update]);
  const thaw = useCallback((f: Frozen, eaters: number) => update((st) => thawForTomorrow(st, f, eaters)), [update]);
  return { list, add, remove, take, restore, thaw, snapshot: { freezer: list, menu: s.menu } };
}

function withAdded(list: Frozen[], x: Omit<Frozen, "id" | "at">): Frozen[] {
  // The same dish frozen again: the portions add up, the date stays the older one (it is eaten first anyway).
  const same = list.find((f) => (x.recipeId && f.recipeId === x.recipeId) || (!x.recipeId && f.title.toLowerCase() === x.title.toLowerCase()));
  if (same) return list.map((f) => (f.id === same.id ? { ...f, portions: f.portions != null && x.portions != null ? Math.min(99, f.portions + x.portions) : f.portions ?? x.portions } : f));
  const item: Frozen = { ...x, title: x.title.slice(0, 80), id: crypto.randomUUID().slice(0, 8), at: Date.now() };
  return [item, ...list].slice(0, MAX);
}
/** `n` portions out (all of it when the portions are not counted). */
const takenOut = (list: Frozen[], id: string, n: number): Frozen[] =>
  list.flatMap((f) => (f.id !== id ? [f] : f.portions != null && f.portions > n ? [{ ...f, portions: f.portions - n }] : []));

/** How long it keeps frozen: the recipe's own word, else by the kind of product (cooked food — two months). */
export function keepsDays(f: Frozen): number {
  const r = f.recipeId ? recipeById(f.recipeId) : undefined;
  if (r) return r.freezerDays || 60;
  const g = f.productId ? ingredient(f.productId)?.groups ?? [] : [];
  if (g.some((x) => ["meat", "poultry", "chicken"].includes(x))) return 180;
  if (g.some((x) => ["fish", "seafood"].includes(x))) return 90;
  if (g.some((x) => ["vegetable", "vegetables", "fruit", "berries", "berry", "greens"].includes(x))) return 240;
  return 90;
}
export const ageDays = (f: Frozen, now = Date.now()) => Math.max(0, Math.floor((now - f.at) / DAY));
export const overdue = (f: Frozen, now = Date.now()) => ageDays(f, now) > keepsDays(f);
/** «лежит 3 недели», «с сегодня» */
export function ageText(f: Frozen, now = Date.now()): string {
  const d = ageDays(f, now);
  if (d < 1) return "с сегодня";
  if (d < 14) return "лежит " + d + " " + plural(d, "день", "дня", "дней");
  if (d < 60) { const w = Math.floor(d / 7); return "лежит " + w + " " + plural(w, "неделю", "недели", "недель"); }
  const m = Math.floor(d / 30);
  return "лежит " + m + " " + plural(m, "месяц", "месяца", "месяцев");
}
export const portionsText = (n: number) => n + " " + plural(n, "порция", "порции", "порций");

/** The evening's offer: a frozen dish for tomorrow when tomorrow has no dinner yet — the oldest first. */
export function thawOffer(s: EngineState, now = new Date()): Frozen | null {
  if (now.getHours() < 16) return null;
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const day = s.menu.find((d) => d.date === tomorrow);
  if (day?.items.some((i) => (i.meal ?? "dinner") === "dinner")) return null;
  return [...(s.freezer ?? [])].filter((f) => f.recipeId && recipeById(f.recipeId)).sort((a, b) => a.at - b.at)[0] ?? null;
}
/** Out of the freezer onto tomorrow's dinner: «Из морозилки · разогреть» in the plan, the portions taken. */
export function thawForTomorrow<T extends Pick<EngineState, "menu" | "freezer">>(st: T, f: Frozen, eaters: number, now = new Date()): T {
  const date = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const n = f.portions != null ? Math.min(f.portions, eaters) : eaters;
  const item = { recipeId: f.recipeId!, servings: n, meal: "dinner" as const, leftover: true, prepped: "freezer" as const };
  const menu: MenuDay[] = st.menu.some((d) => d.date === date)
    ? st.menu.map((d) => (d.date === date ? { ...d, items: [...d.items, item].slice(0, 6) } : d))
    : [...st.menu, { date, items: [item] }];
  return { ...st, menu, freezer: takenOut(st.freezer ?? [], f.id, n) };
}

/** The first version kept the freezer on the device: moved once into the shared state, then the old copy is gone. */
const OLD_KEY = "cook-freezer-v1";
export function useMoveLocalFreezer(ready: boolean): void {
  const { update } = useStore();
  useEffect(() => {
    if (!ready) return;
    let old: Frozen[] = [];
    try { const l = JSON.parse(localStorage.getItem(OLD_KEY) || "[]"); if (Array.isArray(l)) old = l; } catch { /* ignore */ }
    if (!old.length) return;
    update((st) => ({ ...st, freezer: [...old.filter((f) => !(st.freezer ?? []).some((x) => x.id === f.id)).map((f) => ({ ...f, portions: f.portions ?? null })), ...(st.freezer ?? [])].slice(0, MAX) }));
    try { localStorage.removeItem(OLD_KEY); } catch { /* ignore */ }
  }, [ready, update]);
}
