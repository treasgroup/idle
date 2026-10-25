// «Морозилка»: what lies frozen — cooked dishes (заготовки, остатки) and products bought ahead — with portions and how
// long each has been there. In the evening Главная offers to take a dish out for tomorrow; one tap puts it into
// tomorrow's plan as «Разогреть». Kept on this device for now (the family's shared list is «Мои продукты»).
import { useSyncExternalStore } from "react";
import { dateKey, ingredient, plural, recipeById, type EngineState, type MenuDay } from "../engine";

export interface Frozen { id: string; title: string; recipeId?: string; productId?: string; portions: number | null; at: number }

const KEY = "cook-freezer-v1";
const EVENT = "cook-freezer";
const DAY = 86400000;
let cache: Frozen[] | null = null;
function read(): Frozen[] {
  if (cache) return cache;
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(l) ? l.filter((x: Frozen) => x && typeof x.id === "string" && typeof x.title === "string" && typeof x.at === "number") : [];
  } catch { cache = []; }
  return cache;
}
function write(l: Frozen[]): void {
  cache = l.slice(0, 80);
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode */ }
  window.dispatchEvent(new Event(EVENT));
}
const subscribe = (f: () => void) => { window.addEventListener(EVENT, f); return () => window.removeEventListener(EVENT, f); };
export const useFreezer = (): Frozen[] => useSyncExternalStore(subscribe, read, read);

export function addFrozen(x: Omit<Frozen, "id" | "at">): Frozen {
  // The same dish frozen again: the portions add up, the date is the older one (it is eaten first anyway).
  const same = read().find((f) => (x.recipeId && f.recipeId === x.recipeId) || (!x.recipeId && f.title.toLowerCase() === x.title.toLowerCase()));
  if (same) {
    const merged = { ...same, portions: same.portions != null && x.portions != null ? same.portions + x.portions : same.portions ?? x.portions };
    write(read().map((f) => (f.id === same.id ? merged : f)));
    return merged;
  }
  const item: Frozen = { ...x, id: crypto.randomUUID().slice(0, 8), at: Date.now() };
  write([item, ...read()]);
  return item;
}
export const removeFrozen = (id: string) => write(read().filter((f) => f.id !== id));
export const restoreFrozen = (item: Frozen) => write([item, ...read().filter((f) => f.id !== item.id)]);
/** Takes `n` portions out (all of it when the portions are not counted). */
export function takeOut(id: string, n: number): void {
  write(read().flatMap((f) => (f.id !== id ? [f] : f.portions != null && f.portions > n ? [{ ...f, portions: f.portions - n }] : [])));
}

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
export function thawOffer(s: EngineState, list: Frozen[], now = new Date()): Frozen | null {
  if (now.getHours() < 16) return null;
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const day = s.menu.find((d) => d.date === tomorrow);
  if (day?.items.some((i) => (i.meal ?? "dinner") === "dinner")) return null;
  return [...list].filter((f) => f.recipeId && recipeById(f.recipeId)).sort((a, b) => a.at - b.at)[0] ?? null;
}
/** Out of the freezer onto tomorrow's dinner: «Разогреть» in the plan, the portions taken. */
export function thawForTomorrow(menu: MenuDay[], f: Frozen, eaters: number, now = new Date()): MenuDay[] {
  const date = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const n = f.portions != null ? Math.min(f.portions, eaters) : eaters;
  takeOut(f.id, n);
  const item = { recipeId: f.recipeId!, servings: n, meal: "dinner" as const, leftover: true, prepped: "freezer" as const };
  const has = menu.some((d) => d.date === date);
  return has ? menu.map((d) => (d.date === date ? { ...d, items: [...d.items, item] } : d)) : [...menu, { date, items: [item] }];
}
