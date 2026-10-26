// «Напоминание накануне»: what this person cooks or brings to a table, kept on the device when they look at the table,
// so the evening's reminder (app/reminders) can say «Завтра «Шашлыки»: вы готовите салат, начните в 12:10».
// Small on purpose: reminders load with the app, the table's own code does not.

export interface Eve { token: string; title: string; date: string; time: string; dishes: string[]; things: string[]; start: string | null; early: string[] }

const KEY = "cook-party-eve";
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

export function eves(): Eve[] {
  try { const l = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(l) ? l.filter((x) => x && typeof x.token === "string" && typeof x.date === "string") : []; } catch { return []; }
}
function save(list: Eve[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list.filter((x) => x.date >= today()).slice(0, 10))); } catch { /* private mode */ }
}
/** Null: nothing of mine at that table (or I don't come) — nothing to remind. */
export function keepEve(token: string, e: Omit<Eve, "token"> | null): void {
  const rest = eves().filter((x) => x.token !== token);
  const before = eves().find((x) => x.token === token);
  if (!e) { if (before) save(rest); return; }
  const next = { token, ...e };
  if (JSON.stringify(before) !== JSON.stringify(next)) save([next, ...rest]);
}
export const dropEve = (token: string) => keepEve(token, null);

const list = (l: string[]) => (l.length > 1 ? l.slice(0, -1).join(", ") + " и " + l[l.length - 1] : l[0] ?? "");
/** The evening before: «Завтра «Шашлыки» в 15:00: вы готовите салат, начните в 12:10. Холодец — лучше сегодня.» */
export function eveText(tomorrow: string): string | null {
  const e = eves().find((x) => x.date === tomorrow);
  if (!e) return null;
  const dishes = e.dishes.map((t) => t.toLowerCase()), things = e.things.map((t) => t.toLowerCase());
  const head = "Завтра «" + e.title + "»" + (e.time ? " в " + e.time : "");
  const cook = dishes.length ? ": вы готовите " + list(dishes) + (e.start ? " — начните в " + e.start : "") + "." : "";
  const bring = things.length ? (cook ? " Ещё берёте " : ": вы берёте ") + list(things) + "." : "";
  return head + (cook || bring ? cook + bring : ".") + (e.early.length ? " " + list(e.early) + " — лучше приготовить сегодня." : "");
}
