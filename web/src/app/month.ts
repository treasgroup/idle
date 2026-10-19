// «Ваш октябрь»: in the first week of a month, a quiet look back at the last one — how many dishes were cooked, how many
// of them for the first time, what kind of dish came up most and the dish cooked most often. From the book of cooked
// dishes on this device; nothing when fewer than three dishes were cooked.
import { courseOf, recipeById, type BookEntry } from "../engine";

const MONTH = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const IN_MONTH = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
const COURSE: Record<string, string> = { soup: "супы", main: "вторые блюда", salad: "салаты", baking: "выпечка", dessert: "сладкое", breakfast: "завтраки", snack: "закуски", side: "гарниры" };

export interface MonthLook {
  key: string; name: string; inName: string;
  cooked: number; firstTime: number; course: string | null;
  favorite: { id: string; title: string; times: number } | null;
}

/** The look back at the month before `now`, shown on days 1–7; null otherwise or when there is too little to say. */
export function monthLook(book: BookEntry[], now = new Date()): MonthLook | null {
  if (now.getDate() > 7) return null;
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  // One dinner per dish and day (started and finished the same evening is one).
  const seen = new Set<string>();
  const inMonth = book.filter((b) => b.at >= start && b.at < end).filter((b) => {
    const k = b.recipeId + "|" + new Date(b.at).toDateString();
    return seen.has(k) ? false : (seen.add(k), true);
  });
  if (inMonth.length < 3) return null;
  const before = new Set(book.filter((b) => b.at < start).map((b) => b.recipeId));
  const firstTime = new Set(inMonth.map((b) => b.recipeId).filter((id) => !before.has(id))).size;
  const count = new Map<string, number>();
  for (const b of inMonth) { const r = recipeById(b.recipeId); if (r) { const c = courseOf(r); count.set(c, (count.get(c) ?? 0) + 1); } }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  const times = new Map<string, number>();
  for (const b of inMonth) times.set(b.recipeId, (times.get(b.recipeId) ?? 0) + 1);
  const [favId, favTimes] = [...times.entries()].sort((a, b) => b[1] - a[1])[0];
  const m = new Date(start).getMonth();
  return {
    key: new Date(start).getFullYear() + "-" + (m + 1), name: MONTH[m], inName: IN_MONTH[m],
    cooked: inMonth.length, firstTime,
    course: top && top[1] >= 2 && top[1] / inMonth.length >= 0.3 ? COURSE[top[0]] ?? null : null,
    favorite: favTimes >= 2 ? { id: favId, title: recipeById(favId)?.title ?? inMonth.find((b) => b.recipeId === favId)!.title, times: favTimes } : null,
  };
}
