// «Стол в складчину» (server: api/_private/parties.php): the formats with their dishes and things to bring, who is
// coming, what a dish holds that a guest can't eat, and — when the organiser turned it on — who sends whom how much.
// The tables this device made or opened are remembered here, so they are one tap away from Профиль.
import { apiUrl, courseOf, freshConditions, inGroup, rankRecipes, recipeById, recipes, type Preferences, type Recipe } from "../engine";
import { photoFirst } from "./photoFirst";

export type PartyFormat = "dinner" | "bbq" | "kids" | "newyear" | "match" | "birthday";
export type Status = "yes" | "no" | "maybe";
export interface PartyItem { key: string; title: string; by: string | null; id?: string | null; slot?: string; added?: string }
export interface Guest { key: string; name: string; status: Status; plus: number; cant: string[]; spent: number | null }
export interface Party {
  title: string; format: PartyFormat; date: string; time: string; place: string; note: string; host: string | null;
  dishes: PartyItem[]; things: PartyItem[]; expenses: boolean; split: number | null; guests: Guest[];
  me: string | null; admin: boolean; version: number;
}

/** A place on the table: the courses it takes, words its title should have, and «sweet» for the sweet ones only
 *  (baking also holds pies with cabbage and кутабы). */
type Slot = { label: string; courses: string[]; title?: RegExp; sweet?: boolean };
export const FORMATS: { id: PartyFormat; label: string; emoji: string; hour: string; slots: Slot[]; things: string[] }[] = [
  { id: "dinner", label: "Просто ужин", emoji: "🍽️", hour: "19:00", slots: [
    { label: "Салат", courses: ["salad"] }, { label: "Закуска", courses: ["snack"] }, { label: "Горячее", courses: ["main"] }, { label: "Сладкое", courses: ["dessert", "baking"], sweet: true },
  ], things: ["Хлеб", "Напитки"] },
  { id: "bbq", label: "Шашлыки", emoji: "🔥", hour: "14:00", slots: [
    { label: "Шашлык", courses: ["main"], title: /шашлык|кебаб|мангал/i }, { label: "Овощи", courses: [], title: /овощ\S*[^,]*(гриль|мангал|запеч|печ[её]н)|(гриль|мангал|запеч[её]нн|печ[её]н)\S* овощ|(баклажан|перц|кабачк|картоф)\S* на (гриле|мангале|углях)/i },
    { label: "Салат", courses: ["salad"] }, { label: "Соус", courses: [], title: /^(соус|аджика|ткемали|сацебели|чимичурри|тартар)|аджик|ткемали/i },
  ], things: ["Мангал", "Угли и розжиг", "Шампуры или решётка", "Одноразовая посуда", "Напитки", "Пакеты для мусора"] },
  { id: "kids", label: "Детский праздник", emoji: "🎈", hour: "13:00", slots: [
    { label: "Закуска", courses: ["snack"] }, { label: "Горячее", courses: ["main"], title: /пицц|наггетс|котлет|тефтел/i }, { label: "Сладкое", courses: ["dessert", "baking"], title: /торт|кекс|маффин|печень/i, sweet: true },
  ], things: ["Свечи для торта", "Шарики", "Одноразовая посуда", "Сок и вода", "Игры и призы"] },
  { id: "newyear", label: "Новый год", emoji: "🎄", hour: "21:00", slots: [
    { label: "Оливье", courses: ["salad"], title: /оливье/i }, { label: "Шуба", courses: ["salad"], title: /шуб/i }, { label: "Закуска", courses: ["snack"] },
    { label: "Горячее", courses: ["main"] }, { label: "Сладкое", courses: ["dessert", "baking"], sweet: true },
  ], things: ["Напитки", "Мандарины", "Бенгальские огни", "Хлопушки", "Гирлянда"] },
  { id: "match", label: "Матч", emoji: "⚽", hour: "20:00", slots: [
    { label: "Крылышки", courses: ["main", "snack"], title: /крыл|наггетс/i }, { label: "Закуска", courses: ["snack"] }, { label: "Пицца", courses: ["main", "baking"], title: /пицц/i },
  ], things: ["Напитки", "Чипсы и снеки", "Большой экран"] },
  { id: "birthday", label: "День рождения", emoji: "🎂", hour: "18:00", slots: [
    { label: "Салат", courses: ["salad"] }, { label: "Закуска", courses: ["snack"] }, { label: "Горячее", courses: ["main"] }, { label: "Торт", courses: ["dessert", "baking"], title: /торт/i, sweet: true },
  ], things: ["Свечи для торта", "Напитки", "Подарок от всех", "Шарики"] },
];
// Кутья is sweet, but it is the dish of Christmas Eve and of remembrance, not of a party.
const KUTYA = /кутья|сочиво/i;
export const formatOf = (id: string) => FORMATS.find((f) => f.id === id) ?? FORMATS[0];

/** What a guest may say they can't eat (the same groups as «Ограничения» in the profile). */
export const CANT = ["meat", "poultry", "fish", "seafood", "dairy", "eggs", "gluten", "nuts", "mushrooms", "legumes", "soy", "spicy"];

/** Candidates for each place of a format, the best first (suits the profile, then has a photo). */
export function candidates(format: PartyFormat, prefs: Preferences): Recipe[][] {
  const c = { ...freshConditions({ servings: 6, appliances: prefs.appliances, vegetarian: prefs.vegetarian }), occasion: "guests" as const };
  let ranked = rankRecipes(recipes(), c, prefs, 600).map((m) => m.recipe);
  if (ranked.length < 40) ranked = rankRecipes(recipes(), { ...c, occasion: null }, prefs, 600).map((m) => m.recipe);
  const all = [...ranked, ...recipes().filter((r) => !ranked.includes(r))];
  return formatOf(format).slots.map((sl) => {
    const inCourse = (r: Recipe) => (!sl.courses.length || sl.courses.includes(courseOf(r))) && (!sl.sweet || ((courseOf(r) === "dessert" || r.tags.includes("sweet")) && !KUTYA.test(r.title)));
    const named = sl.title ? all.filter((r) => sl.title!.test(r.title) && inCourse(r)) : [];
    const list = named.length ? named : sl.courses.length ? ranked.filter(inCourse) : [];
    return photoFirst(list, 60).slice(0, 12);
  });
}

/** How many people come: everybody who said «приду» with the ones they bring. */
export const headcount = (p: Party): number => p.guests.filter((g) => g.status === "yes").reduce((n, g) => n + 1 + g.plus, 0);
export const guestName = (p: Party, key: string | null): string => (key && p.guests.find((g) => g.key === key)?.name) || (key && key === p.host ? "Организатор" : "Гость");

/** «Оля не ест: орехи» — the guests who come and can't eat something in this dish. */
export function warnings(p: Party, item: PartyItem, labels: Record<string, string>): string[] {
  const r = item.id ? recipeById(item.id) : undefined;
  if (!r) return [];
  const out: string[] = [];
  for (const g of p.guests) {
    if (g.status === "no" || !g.cant.length) continue;
    const bad = g.cant.filter((m) => r.allergens.includes(m) || r.ingredients.some((i) => inGroup(i.id, m)));
    if (bad.length) out.push((g.name || "Гость") + " не ест: " + bad.map((m) => (labels[m] ?? m).toLowerCase()).join(", "));
  }
  return out;
}

/** The split: the total, what one person's share is, and the fewest transfers that settle it. */
export function settle(p: Party): { total: number; people: number; share: number; transfers: { from: string; to: string; sum: number }[]; outside: number } {
  const total = p.guests.reduce((n, g) => n + (g.spent ?? 0), 0);
  const people = p.split ?? Math.max(1, headcount(p));
  const share = total / people;
  const balance = p.guests.map((g) => ({ key: g.key, b: (g.spent ?? 0) - (g.status === "yes" ? share * (1 + g.plus) : 0) }));
  // With «разделить на N» more than the guests here, the rest is paid by people who are not in the list.
  const outside = Math.max(0, Math.round(balance.reduce((n, x) => n + x.b, 0)));
  const give = balance.filter((x) => x.b < -0.5).map((x) => ({ ...x, b: -x.b })).sort((a, b) => b.b - a.b);
  const get = balance.filter((x) => x.b > 0.5).sort((a, b) => b.b - a.b);
  const transfers: { from: string; to: string; sum: number }[] = [];
  let i = 0, j = 0;
  while (i < give.length && j < get.length) {
    const sum = Math.min(give[i].b, get[j].b);
    if (Math.round(sum) > 0) transfers.push({ from: give[i].key, to: get[j].key, sum: Math.round(sum) });
    give[i].b -= sum; get[j].b -= sum;
    if (give[i].b < 0.5) i++;
    if (get[j].b < 0.5) j++;
  }
  return { total, people, share: Math.round(share), transfers, outside };
}

/** A table started from elsewhere: «Праздничный стол» hands over its dishes. */
export interface PartyDraft { format?: PartyFormat; dishes?: { id: string; title: string; slot?: string }[] }
/** Opens «Стол в складчину» from anywhere (Профиль, «Праздничный стол»): App listens and shows the layer. */
export const OPEN_PARTY = "cook-open-party";
export function openParty(x: { token?: string; draft?: PartyDraft } = {}): void {
  window.dispatchEvent(new CustomEvent(OPEN_PARTY, { detail: x }));
}

// ---------- This device: the guest's secret and the tables it knows ----------
const GUEST_KEY = "cook-party-guest";
const LIST_KEY = "cook-parties";
let memoryGuest = "";
export function guestSecret(): string {
  try {
    let g = localStorage.getItem(GUEST_KEY);
    if (!g) { g = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, g); }
    return g;
  } catch { return memoryGuest || (memoryGuest = crypto.randomUUID()); }
}
export interface KnownParty { token: string; admin?: string; title: string; date: string; at: number }
export function knownParties(): KnownParty[] {
  try { const l = JSON.parse(localStorage.getItem(LIST_KEY) || "[]"); return Array.isArray(l) ? l.filter((x) => x && typeof x.token === "string") : []; } catch { return []; }
}
export function rememberParty(x: Omit<KnownParty, "at">): void {
  const before = knownParties().find((k) => k.token === x.token);
  const list = [{ ...before, ...x, admin: x.admin ?? before?.admin, at: Date.now() }, ...knownParties().filter((k) => k.token !== x.token)].slice(0, 20);
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch { /* private mode */ }
}
export function forgetParty(token: string): void {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(knownParties().filter((k) => k.token !== token))); } catch { /* ignore */ }
}

export async function partyCall<T = Party>(route: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(apiUrl(route), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j as { error?: string }).error || "Не удалось связаться с сервером."), { status: r.status });
  return j as T;
}

/** The next Saturday (or today, if it is Saturday) — the usual day to gather. */
export function nextSaturday(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
/** «сб, 7 ноября, 15:00» */
export function whenLine(p: { date: string; time: string }): string {
  const d = new Date(p.date + "T12:00");
  if (isNaN(+d)) return p.time;
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" }) + (p.time ? ", " + p.time : "");
}
