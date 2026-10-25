// «Стол в складчину» (server: api/_private/parties.php): the types, the server calls, opening the table from anywhere,
// and the tables this device made or opened (one tap away from Профиль). The table's own logic — formats, the split,
// Шеф's hints — is in app/partyTable, loaded with the table.
import { apiUrl } from "../engine";

export type PartyFormat = "dinner" | "bbq" | "kids" | "newyear" | "match" | "birthday";
export type Status = "yes" | "no" | "maybe";
export interface PartyItem { key: string; title: string; by: string | null; id?: string | null; slot?: string; added?: string }
export interface Guest { key: string; name: string; status: Status; plus: number; cant: string[]; spent: number | null }
export interface Party {
  title: string; format: PartyFormat; date: string; time: string; place: string; note: string; host: string | null;
  dishes: PartyItem[]; things: PartyItem[]; expenses: boolean; split: number | null; guests: Guest[];
  me: string | null; admin: boolean; version: number;
  /** How many of the organiser's browsers hear of the answers (web push); 0 for guests. */
  notify?: number;
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
/** The tables changed (app/kept takes them to the account). */
export const PARTIES_EVENT = "cook-parties";
function saveList(list: KnownParty[]): void {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch { /* private mode */ }
  window.dispatchEvent(new Event(PARTIES_EVENT));
}
export function rememberParty(x: Omit<KnownParty, "at">): void {
  const before = knownParties().find((k) => k.token === x.token);
  // Seen again with nothing new: nothing to write (the table is looked at every 15 seconds while open).
  if (before && before.title === x.title && before.date === x.date && (x.admin ?? before.admin) === before.admin) return;
  saveList([{ ...before, ...x, admin: x.admin ?? before?.admin, at: before?.at ?? Date.now() }, ...knownParties().filter((k) => k.token !== x.token)].slice(0, 20));
}
export function forgetParty(token: string): void {
  saveList(knownParties().filter((k) => k.token !== token));
}
/** From the account (app/kept): the tables and the guest's secret of another device of the same person. */
export function replaceParties(list: KnownParty[], guest?: string): void {
  try { if (guest) localStorage.setItem(GUEST_KEY, guest); } catch { /* ignore */ }
  saveList(list);
}

export async function partyCall<T = Party>(route: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(apiUrl(route), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j as { error?: string }).error || "Не удалось связаться с сервером."), { status: r.status });
  return j as T;
}
