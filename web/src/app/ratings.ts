// The average mark of each recipe from its reviews («★ 4,8» on a card's photo). One small request per hour for all
// recipes at once, kept on the device; nothing is shown for a recipe without reviews.
import { useEffect, useState } from "react";
import { reviewsApi } from "../engine";

export interface Rating { avg: number; count: number }
type Ratings = Record<string, Rating>;
const KEY = "cook-ratings";
let cache: Ratings | null = null;
let loading: Promise<Ratings> | null = null;
const listeners = new Set<(r: Ratings) => void>();

/** The server sends {id: [average, count]}; older answers were {id: {avg, count}}. */
function normalize(raw: unknown): Ratings {
  const out: Ratings = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const avg = Array.isArray(v) ? Number(v[0]) : Number((v as Rating)?.avg);
    const count = Array.isArray(v) ? Number(v[1]) : Number((v as Rating)?.count);
    if (avg > 0 && count > 0) out[id] = { avg, count };
  }
  return out;
}

function load(): Promise<Ratings> {
  if (cache) return Promise.resolve(cache);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.at > Date.now() - 3600e3 && saved.ratings) return Promise.resolve((cache = normalize(saved.ratings)));
  } catch { /* ignore */ }
  loading ??= reviewsApi.ratings()
    .then((r) => {
      cache = normalize(r);
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), ratings: cache })); } catch { /* ignore */ }
      listeners.forEach((f) => f(cache!));
      return cache;
    })
    // Offline or the server is busy: nothing shown now, asked again on the next screen.
    .catch(() => { loading = null; return {}; });
  return loading;
}

/** All the averages (empty until loaded). */
export function useRatings(): Ratings {
  const [r, setR] = useState<Ratings>(() => cache ?? {});
  useEffect(() => { let on = true; listeners.add(setR); void load().then((x) => on && setR(x)); return () => { on = false; listeners.delete(setR); }; }, []);
  return r;
}

/** «4,8» */
export const ratingLabel = (r: Rating): string => r.avg.toFixed(1).replace(".", ",");
