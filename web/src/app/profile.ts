// What the person told us about themselves: who they cook for, how confident they are, what they aim for.
// Kept on the device next to the engine state (the engine's own state schema stays untouched for sync).
import type { Conditions } from "../engine";
import { normalizeDates, type FamilyDate } from "./familyCalendar";
import { normalizeFixes, type KitchenFix } from "./kitchenFit";

export type Level = "beginner" | "confident" | "pro";
export type Goal = "tasty" | "quick" | "budget" | "light" | "protein" | "family";

export interface Profile {
  /** How many people usually eat. */
  eaters: number;
  level: Level;
  goals: Goal[];
  kids: boolean;
  /** Lessons of the beginner course already done. */
  lessonsDone: string[];
  /** Cooking reminder after the first cooked dish was offered (asked once). */
  remindAsked: boolean;
  /** Second dish cooked in parallel with the first (cooking mode). */
  parallel: { recipeId: string; servings: number; step: number; timerEnd: number | null } | null;
  setUp: boolean;
  /** Light by default; dark only on request. "system" follows the device. */
  theme: "light" | "dark" | "contrast" | "system";
  /** Simple mode: bigger text and only the main things (Главная, Шеф, Избранное). */
  simple: boolean;
  /** Text size: normal, large, very large. */
  textSize: "m" | "l" | "xl";
  /** Who else eats and what they do not: their products are left out of every suggestion. */
  members: Member[];
  /** Short sounds and vibration (the timer's alarm rings anyway). */
  sounds: boolean;
  /** Reading steps aloud: the voice (id of a phone or browser voice; none — the best one) and the speed. */
  voice?: string;
  voiceRate: number;
  /** «Семейный календарь»: birthdays and the family's own dates (app/familyCalendar). */
  familyDates: FamilyDate[];
  /** «Под вашу кухню»: the oven, the salt, the water for grains, from what went wrong before (app/kitchenFit). */
  kitchen: KitchenFix[];
}

export interface Member { name: string; excluded: string[] }

export const DEFAULT_PROFILE: Profile = {
  eaters: 2,
  level: "confident",
  goals: ["tasty"],
  kids: false,
  lessonsDone: [],
  remindAsked: false,
  parallel: null,
  setUp: false,
  theme: "light",
  simple: false,
  textSize: "m",
  members: [],
  sounds: true,
  voiceRate: 1.1,
  familyDates: [],
  kitchen: [],
};

export const GOALS: { id: Goal; label: string; hint: string; emoji: string }[] = [
  { id: "tasty", label: "Просто вкусно", hint: "Без подсчётов", emoji: "😋" },
  { id: "quick", label: "Быстро", hint: "Будни до 30 минут", emoji: "⚡" },
  { id: "budget", label: "Экономно", hint: "Простые продукты, план без остатков", emoji: "🧺" },
  { id: "light", label: "Полегче", hint: "До 500 ккал на порцию", emoji: "🥗" },
  { id: "protein", label: "Больше белка", hint: "От 25 г белка на порцию — для спорта", emoji: "💪" },
  { id: "family", label: "Накормить семью", hint: "Сытно, просто, можно детям", emoji: "👨‍👩‍👧" },
];

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "beginner", label: "Только учусь", hint: "Покажу простые блюда и объясню каждый шаг" },
  { id: "confident", label: "Готовлю иногда", hint: "Обычные домашние рецепты" },
  { id: "pro", label: "Готовлю много", hint: "Покажу и сложные блюда" },
];

/** Conditions the goals add on top of a request (only where the person did not say otherwise). */
export function goalConditions(p: Profile, c: Conditions): Conditions {
  const out = { ...c };
  if (p.goals.includes("light") && out.maxKcal == null) out.maxKcal = 500;
  if (p.goals.includes("protein") && out.minProtein == null) out.minProtein = 25;
  if (p.goals.includes("quick") && out.maxMinutes == null) out.maxMinutes = 30;
  return out;
}

export function normalizeProfile(raw: unknown): Profile {
  const p = { ...DEFAULT_PROFILE };
  if (!raw || typeof raw !== "object") return p;
  const r = raw as Record<string, unknown>;
  if (Number.isInteger(r.eaters) && (r.eaters as number) >= 1 && (r.eaters as number) <= 12) p.eaters = r.eaters as number;
  if (LEVELS.some((l) => l.id === r.level)) p.level = r.level as Level;
  if (Array.isArray(r.goals)) {
    const g = r.goals.filter((x): x is Goal => GOALS.some((d) => d.id === x));
    p.goals = g.length ? [...new Set(g)] : ["tasty"];
  }
  p.kids = r.kids === true;
  if (Array.isArray(r.lessonsDone)) p.lessonsDone = r.lessonsDone.filter((x): x is string => typeof x === "string").slice(0, 100);
  p.remindAsked = r.remindAsked === true;
  const par = r.parallel as Profile["parallel"];
  if (par && typeof par === "object" && typeof par.recipeId === "string" && Number.isInteger(par.servings) && Number.isInteger(par.step))
    p.parallel = { recipeId: par.recipeId, servings: par.servings, step: par.step, timerEnd: typeof par.timerEnd === "number" ? par.timerEnd : null };
  p.setUp = r.setUp === true;
  if (r.theme === "dark" || r.theme === "contrast" || r.theme === "system") p.theme = r.theme;
  p.simple = r.simple === true;
  if (r.textSize === "l" || r.textSize === "xl") p.textSize = r.textSize;
  p.sounds = r.sounds !== false;
  if (typeof r.voice === "string" && r.voice.length < 120) p.voice = r.voice;
  p.voiceRate = typeof r.voiceRate === "number" && r.voiceRate >= 0.7 && r.voiceRate <= 1.6 ? r.voiceRate : 1.1;
  if (Array.isArray(r.members)) p.members = r.members
    .filter((m): m is Member => !!m && typeof m === "object" && typeof (m as Member).name === "string" && Array.isArray((m as Member).excluded))
    .slice(0, 10).map((m) => ({ name: m.name.slice(0, 30), excluded: m.excluded.filter((x): x is string => typeof x === "string").slice(0, 40) }));
  p.familyDates = normalizeDates(r.familyDates);
  p.kitchen = normalizeFixes(r.kitchen);
  return p;
}

const KEY = "cook-profile-v1";
export function loadProfile(): Profile {
  try { return normalizeProfile(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { return { ...DEFAULT_PROFILE }; }
}
export function saveProfile(p: Profile): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: the profile lives for this visit only */ }
}

/** Puts the chosen theme on <html> (and keeps "Авто" in step with the device). Light unless dark was chosen. */
export function applyTheme(theme: Profile["theme"]): () => void {
  const root = document.documentElement;
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const set = () => {
    const dark = theme === "dark" || (theme === "system" && !!media?.matches);
    root.dataset.theme = dark ? "dark" : theme === "contrast" ? "contrast" : "light";
    // "only light" also keeps Chrome's Auto Dark and Yandex Browser's dark sites mode away.
    root.style.colorScheme = dark ? "dark" : "only light";
    document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", dark ? "dark" : "only light");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#181513" : theme === "contrast" ? "#FFFFFF" : "#FAF7F0");
  };
  set();
  if (theme !== "system" || !media) return () => {};
  media.addEventListener("change", set);
  return () => media.removeEventListener("change", set);
}

/** The family's «не едим» joined into the shared list: what a member added comes off when nobody needs it any more. */
export function withMembers(excluded: string[], before: Member[], after: Member[]): string[] {
  const had = new Set(before.flatMap((m) => m.excluded));
  const now = new Set(after.flatMap((m) => m.excluded));
  return [...new Set([...excluded.filter((x) => !had.has(x) || now.has(x)), ...now])];
}
