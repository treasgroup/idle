// «Наша неделя»: a plan that went well, kept to repeat later with one tap. On this device, up to five.
import type { MenuDay, MenuItem } from "../engine";

const KEY = "cook-saved-weeks";
export interface SavedWeek { id: string; name: string; at: number; days: MenuItem[][] }

export function savedWeeks(): SavedWeek[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((w) => w && typeof w.id === "string" && Array.isArray(w.days)).slice(0, 5) : [];
  } catch { return []; }
}
const write = (list: SavedWeek[]) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5))); } catch { /* private mode */ } };

export function saveWeek(days: MenuDay[]): SavedWeek {
  const d = new Date(days[0]?.date ?? Date.now());
  const w: SavedWeek = {
    id: Math.random().toString(36).slice(2, 9),
    name: "Неделя с " + d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
    at: Date.now(),
    days: days.map((x) => x.items.map((i) => ({ ...i }))),
  };
  write([w, ...savedWeeks()]);
  return w;
}
export function removeWeek(id: string): void { write(savedWeeks().filter((w) => w.id !== id)); }

/** The saved dishes on the coming days, day by day. */
export function applyWeek(w: SavedWeek, days: MenuDay[], servings: number): MenuDay[] {
  return days.map((d, i) => ({ date: d.date, items: (w.days[i] ?? []).map((it) => ({ ...it, servings: it.leftover ? it.servings : servings })) }));
}
