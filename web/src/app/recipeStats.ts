// «Готовили 120 раз · 9 из 10 понравилось»: honest numbers from people who cooked a dish to the end and rated it.
// The server lists only dishes cooked by enough people; one small request per hour, kept on the device.
import { useEffect, useState } from "react";
import { apiUrl } from "../engine";

export interface RecipeStat { cooked: number; liked?: number; rated?: number }
type Stats = Record<string, RecipeStat>;
const KEY = "cook-recipe-stats";
let cache: Stats | null = null;
let loading: Promise<Stats> | null = null;

function load(): Promise<Stats> {
  if (cache) return Promise.resolve(cache);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.at > Date.now() - 3600e3 && saved.stats) return Promise.resolve((cache = saved.stats));
  } catch { /* ignore */ }
  loading ??= fetch(apiUrl("recipe.stats"))
    .then((r) => (r.ok ? r.json() : { stats: {} }))
    .then((j) => {
      cache = j && typeof j.stats === "object" ? (j.stats as Stats) : {};
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), stats: cache })); } catch { /* ignore */ }
      return cache;
    })
    .catch(() => (cache = {}));
  return loading;
}

export function useRecipeStat(id: string): RecipeStat | null {
  const [stat, setStat] = useState<RecipeStat | null>(() => cache?.[id] ?? null);
  useEffect(() => { let on = true; void load().then((s) => { if (on) setStat(s[id] ?? null); }); return () => { on = false; }; }, [id]);
  return stat;
}

/** «9 из 10 понравилось» (rounded to tenths of the people who rated), or null when too few rated. */
export function likedShare(s: RecipeStat): string | null {
  if (!s.rated || s.liked == null) return null;
  const n = Math.round((s.liked / s.rated) * 10);
  return n >= 6 ? n + " из 10 понравилось" : null;
}
