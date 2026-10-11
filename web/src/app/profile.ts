// What the person told us about themselves: who they cook for, how confident they are, what they aim for.
// Kept on the device next to the engine state (the engine's own state schema stays untouched for sync).
import type { Conditions } from "../engine";

export type Level = "beginner" | "confident" | "pro";
export type Goal = "tasty" | "quick" | "budget" | "light" | "protein" | "family";

export interface Profile {
  /** How many people usually eat. */
  eaters: number;
  level: Level;
  goals: Goal[];
  kids: boolean;
  /** Weekly grocery budget in roubles for the "уложиться в бюджет" menu; 0 = not set. */
  weeklyBudget: number;
  /** Lessons of the beginner course already done. */
  lessonsDone: string[];
  /** Cooking reminder after the first cooked dish was offered (asked once). */
  remindAsked: boolean;
  /** Second dish cooked in parallel with the first (cooking mode). */
  parallel: { recipeId: string; servings: number; step: number; timerEnd: number | null } | null;
  setUp: boolean;
}

export const DEFAULT_PROFILE: Profile = {
  eaters: 2,
  level: "confident",
  goals: ["tasty"],
  kids: false,
  weeklyBudget: 0,
  lessonsDone: [],
  remindAsked: false,
  parallel: null,
  setUp: false,
};

export const GOALS: { id: Goal; label: string; hint: string; emoji: string }[] = [
  { id: "tasty", label: "Просто вкусно", hint: "Без подсчётов", emoji: "😋" },
  { id: "quick", label: "Быстро", hint: "Будни до 30 минут", emoji: "⚡" },
  { id: "budget", label: "Экономно", hint: "Бюджетные блюда и меню без остатков", emoji: "💰" },
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
  if (typeof r.weeklyBudget === "number" && r.weeklyBudget >= 0 && r.weeklyBudget <= 100000) p.weeklyBudget = Math.round(r.weeklyBudget);
  if (Array.isArray(r.lessonsDone)) p.lessonsDone = r.lessonsDone.filter((x): x is string => typeof x === "string").slice(0, 100);
  p.remindAsked = r.remindAsked === true;
  const par = r.parallel as Profile["parallel"];
  if (par && typeof par === "object" && typeof par.recipeId === "string" && Number.isInteger(par.servings) && Number.isInteger(par.step))
    p.parallel = { recipeId: par.recipeId, servings: par.servings, step: par.step, timerEnd: typeof par.timerEnd === "number" ? par.timerEnd : null };
  p.setUp = r.setUp === true;
  return p;
}

const KEY = "cook-profile-v1";
export function loadProfile(): Profile {
  try { return normalizeProfile(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { return { ...DEFAULT_PROFILE }; }
}
export function saveProfile(p: Profile): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: the profile lives for this visit only */ }
}
