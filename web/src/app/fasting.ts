// «Соблюдаю пост»: the Orthodox fasting days (new style, as the Russian Church keeps them) and what a fasting day lets
// into the plan, the day's dish and Шеф. The rule is the simple common one — no meat, milk or eggs; fish only when
// the person allows it — the finer rules (oil, fish days) are left to them and their priest.
import { inGroup, isLenten, type Recipe } from "../engine";
import { orthodoxEaster } from "./seasonal";
import type { Profile } from "./profile";

export interface FastDay { name: string; kind: "long" | "weekly" | "day" | "nomeat" }
export interface FastSettings { on: boolean; weekly: boolean; fish: boolean }
export const DEFAULT_FAST: FastSettings = { on: false, weekly: true, fish: false };

const DAY = 86400000;
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const plus = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const within = (d: Date, from: Date, to: Date) => +d >= +from && +d <= +to;

/** The multi-day fasts that touch a year (the Nativity fast of the year before runs into its first days). */
function longFasts(y: number): { name: string; from: Date; to: Date }[] {
  const e = orthodoxEaster(y);
  const peter = plus(e, 57), peterEnd = at(y, 7, 11);
  return [
    { name: "Рождественский пост", from: at(y - 1, 11, 28), to: at(y, 1, 6) },
    { name: "Великий пост", from: plus(e, -48), to: plus(e, -1) },
    ...(+peter <= +peterEnd ? [{ name: "Петров пост", from: peter, to: peterEnd }] : []),
    { name: "Успенский пост", from: at(y, 8, 14), to: at(y, 8, 27) },
    { name: "Рождественский пост", from: at(y, 11, 28), to: at(y + 1, 1, 6) },
  ];
}
/** Weeks without the Wednesday and Friday fast. */
function freeWeeks(y: number): [Date, Date][] {
  const e = orthodoxEaster(y);
  return [
    [at(y, 1, 7), at(y, 1, 17)], // Святки
    [plus(e, -69), plus(e, -63)], // after the Publican and the Pharisee
    [plus(e, 1), plus(e, 6)], // Светлая седмица
    [plus(e, 50), plus(e, 56)], // Троицкая седмица
  ];
}

/** The church's fast on a day, whatever the person keeps; null on an ordinary day. */
export function fastOn(date: Date): FastDay | null {
  const d = dayOf(date), y = d.getFullYear(), e = orthodoxEaster(y);
  const long = longFasts(y).find((f) => within(d, f.from, f.to));
  if (long) return { name: long.name, kind: "long" };
  if ((d.getMonth() === 0 && d.getDate() === 18)) return { name: "Крещенский сочельник", kind: "day" };
  if (d.getMonth() === 8 && d.getDate() === 11) return { name: "Усекновение главы Иоанна Предтечи", kind: "day" };
  if (d.getMonth() === 8 && d.getDate() === 27) return { name: "Воздвижение", kind: "day" };
  // Масленица: no meat all week, milk and eggs still eaten (Wednesday and Friday too).
  if (within(d, plus(e, -55), plus(e, -49))) return { name: "Масленица", kind: "nomeat" };
  if (freeWeeks(y).some(([a, b]) => within(d, a, b))) return null;
  if (d.getDay() === 3) return { name: "среда", kind: "weekly" };
  if (d.getDay() === 5) return { name: "пятница", kind: "weekly" };
  return null;
}

/** The fast the person keeps that day (nothing when «Соблюдаю пост» is off; Wednesday and Friday only if chosen). */
export function keepsFast(p: Profile, date: Date): FastDay | null {
  if (!p.fast.on) return null;
  const f = fastOn(date);
  return f && (f.kind !== "weekly" || p.fast.weekly) ? f : null;
}

const NO_MEAT = ["meat", "poultry", "chicken"];
const ANIMAL = [...NO_MEAT, "dairy", "eggs"];
/** What a fasting day leaves out (the groups of «не едим»). */
export function fastExcluded(p: Profile, f: FastDay): string[] {
  if (f.kind === "nomeat") return ["meat", "poultry"];
  return ["meat", "poultry", "dairy", "eggs", ...(p.fast.fish ? [] : ["fish", "seafood"])];
}
/** Whether a dish fits the fasting day. */
export function fitsFast(p: Profile, f: FastDay): (r: Recipe) => boolean {
  const groups = f.kind === "nomeat" ? NO_MEAT : ANIMAL;
  if (f.kind !== "nomeat" && !p.fast.fish) return isLenten;
  return (r) => r.ingredients.filter((i) => !i.optional).every((i) => !groups.some((g) => inGroup(i.id, g)))
    && !r.allergens.some((a) => (f.kind === "nomeat" ? ["meat", "poultry"] : ["meat", "poultry", "dairy", "eggs"]).includes(a));
}

/** «Завтра начинается Рождественский пост»: the eve of a multi-day fast the person keeps. */
export function fastTomorrow(p: Profile, now = new Date()): string | null {
  if (!p.fast.on) return null;
  const t = fastOn(plus(dayOf(now), 1)), today = fastOn(now);
  return t?.kind === "long" && today?.name !== t.name ? t.name : null;
}

/** The coming multi-day fasts, for the profile: «Рождественский пост — 28 ноября – 6 января». */
export function comingFasts(now = new Date(), n = 4): { name: string; from: Date; to: Date; now: boolean }[] {
  const d = dayOf(now), y = d.getFullYear();
  const all = [...longFasts(y), ...longFasts(y + 1)].filter((f) => +f.to >= +d);
  const seen = new Set<string>();
  return all.filter((f) => { const k = f.name + +f.from; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => +a.from - +b.from).slice(0, n).map((f) => ({ ...f, now: within(d, f.from, f.to) }));
}
export const daysLeft = (to: Date, now = new Date()) => Math.round((+dayOf(to) - +dayOf(now)) / DAY);
