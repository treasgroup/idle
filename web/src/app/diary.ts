// «Дневник еды», stage 1: what was eaten today, in calories and БЖУ. Dishes count by our own recipes (a portion of
// ½ to 2), bought food by its label (Open Food Facts, by barcode), anything else as the person types it. The goal
// for the day is the person's own number — no questions about weight or height. Kept on this device only, 90 days.
import { useSyncExternalStore } from "react";
import { apiUrl, nutritionOf, type Recipe } from "../engine";
import type { Profile } from "./profile";
import { feature } from "./feature";

export type DiaryMeal = "breakfast" | "lunch" | "dinner" | "snack";
export type DiarySource = "recipe" | "plan" | "cook" | "barcode" | "manual";
export interface DiaryEntry {
  id: string; date: string; at: number; meal: DiaryMeal; title: string;
  kcal: number; protein: number; fat: number; carbs: number;
  /** Where it came from, kept for the second stage (a photo of the plate) and to know what to trust. */
  from: DiarySource; recipeId?: string; portion?: number; grams?: number;
}
export interface Diary { entries: DiaryEntry[]; goal?: number }

export const MEALS: { id: DiaryMeal; label: string }[] = [
  { id: "breakfast", label: "Завтрак" }, { id: "lunch", label: "Обед" }, { id: "dinner", label: "Ужин" }, { id: "snack", label: "Перекус" },
];
export const PORTIONS = [0.5, 1, 1.5, 2];
export const portionText = (n: number) => (n === 0.5 ? "½ порции" : String(n).replace(".", ",") + " " + (n === 1 ? "порция" : "порции"));

const KEY = "cook-diary-v1";
const EVENT = "cook-diary";
let cache: Diary | null = null;
function read(): Diary {
  if (cache) return cache;
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    cache = d && Array.isArray(d.entries) ? { entries: d.entries.filter((e: DiaryEntry) => e && typeof e.id === "string" && typeof e.kcal === "number"), goal: typeof d.goal === "number" ? d.goal : undefined } : { entries: [] };
  } catch { cache = { entries: [] }; }
  return cache;
}
function write(d: Diary): void {
  const cut = dateKeyOf(new Date(Date.now() - 90 * 86400000));
  cache = { ...d, entries: d.entries.filter((e) => e.date >= cut) };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode: for this visit only */ }
  window.dispatchEvent(new Event(EVENT));
}
/** For app/kept: the diary as it is, and the diary from the account (another device of the same person). */
export const DIARY_EVENT = EVENT;
export const readDiary = (): Diary => read();
export function replaceDiary(d: Diary): void {
  cache = null;
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ }
  cache = d;
  window.dispatchEvent(new Event(EVENT));
}
const subscribe = (f: () => void) => { window.addEventListener(EVENT, f); return () => window.removeEventListener(EVENT, f); };
/** The diary, re-rendering when an entry is added anywhere (the plan, the end of cooking). */
export const useDiary = (): Diary => useSyncExternalStore(subscribe, read, read);

export const dateKeyOf = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const mealByHour = (h = new Date().getHours()): DiaryMeal => (h >= 5 && h < 11 ? "breakfast" : h >= 11 && h < 16 ? "lunch" : h >= 16 && h < 22 ? "dinner" : "snack");

export function addEntry(e: Omit<DiaryEntry, "id" | "at" | "date"> & { date?: string }): DiaryEntry {
  const entry: DiaryEntry = { ...e, id: crypto.randomUUID().slice(0, 8), at: Date.now(), date: e.date ?? dateKeyOf(new Date()),
    kcal: Math.round(e.kcal), protein: Math.round(e.protein), fat: Math.round(e.fat), carbs: Math.round(e.carbs) };
  write({ ...read(), entries: [...read().entries, entry] });
  feature("diary_add");
  return entry;
}
export const removeEntry = (id: string) => write({ ...read(), entries: read().entries.filter((e) => e.id !== id) });
export const setGoal = (goal: number) => write({ ...read(), goal: Math.max(800, Math.min(5000, Math.round(goal / 50) * 50)) });

/** «Полегче» in the profile → 1 500 a day, otherwise 2 000 — until the person sets their own. */
export const goalOf = (d: Diary, p: Profile) => d.goal ?? (p.goals.includes("light") ? 1500 : 2000);
export const entriesOn = (d: Diary, date: string) => d.entries.filter((e) => e.date === date).sort((a, b) => a.at - b.at);
export function totals(list: DiaryEntry[]) {
  return list.reduce((t, e) => ({ kcal: t.kcal + e.kcal, protein: t.protein + e.protein, fat: t.fat + e.fat, carbs: t.carbs + e.carbs }), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
}

/** A portion of one of our dishes. Null when the recipe has no calories counted (then the person types them). */
export function recipeEntry(r: Recipe, portion: number, from: DiarySource, meal = mealByHour()) {
  const n = nutritionOf(r);
  if (!n.perServing.kcal) return null;
  return { meal, title: r.title, from, recipeId: r.id, portion,
    kcal: n.perServing.kcal * portion, protein: n.perServing.protein * portion, fat: n.perServing.fat * portion, carbs: n.perServing.carbs * portion };
}
/** One tap: a portion of a dish into today's diary. */
export function eatRecipe(r: Recipe, from: DiarySource, portion = 1): DiaryEntry | null {
  const e = recipeEntry(r, portion, from);
  return e ? addEntry(e) : null;
}

/** Opens «Дневник еды» from anywhere (Главная, Профиль): App listens and shows the layer. */
export const OPEN_DIARY = "cook-open-diary";
export const openDiary = () => window.dispatchEvent(new Event(OPEN_DIARY));

export interface Packaged { name: string | null; per100: { kcal: number; protein: number; fat: number; carbs: number } | null; serving: number | null; pack: number | null }
export async function lookupBarcode(code: string): Promise<Packaged> {
  const r = await fetch(apiUrl("barcode.food"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || "Не получилось узнать продукт.");
  return j as Packaged;
}

/** «Часто ем»: what was eaten on at least two days of the last 30 — one tap writes it again, the last time's numbers. */
export function frequent(d: Diary, limit = 6): DiaryEntry[] {
  const cut = dateKeyOf(new Date(Date.now() - 30 * 86400000));
  const seen = new Map<string, { last: DiaryEntry; days: Set<string> }>();
  for (const e of d.entries) {
    if (e.date < cut) continue;
    const k = (e.recipeId ?? e.title.toLowerCase()) + "|" + (e.portion ?? e.grams ?? "");
    const s = seen.get(k) ?? { last: e, days: new Set<string>() };
    s.days.add(e.date);
    if (e.at >= s.last.at) s.last = e;
    seen.set(k, s);
  }
  return [...seen.values()].filter((s) => s.days.size >= 2)
    .sort((a, b) => b.days.size - a.days.size || b.last.at - a.last.at).slice(0, limit).map((s) => s.last);
}
/** The same entry once more: on another day or meal, with the numbers it had. */
export function again(e: DiaryEntry, date: string, meal: DiaryMeal): DiaryEntry {
  const { id: _id, at: _at, date: _date, ...rest } = e;
  return addEntry({ ...rest, meal, date });
}
/** The seven days up to `end`, each with its calories (0 when nothing was written). */
export function week(d: Diary, end: string): { date: string; kcal: number; any: boolean }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(end + "T12:00"); t.setDate(t.getDate() - 6 + i);
    const date = dateKeyOf(t), list = entriesOn(d, date);
    return { date, kcal: totals(list).kcal, any: list.length > 0 };
  });
}
