// «Вы смотрели: Борщ › Продолжить»: the last recipe opened in an earlier visit, so coming back does not start from
// a search. Only on this device; nothing is sent anywhere.
const KEY = "cook-last-recipe";
const started = Date.now(); // this visit

export function rememberRecipe(id: string): void {
  try { localStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() })); } catch { /* private mode */ }
}

/** The recipe from a previous visit (within three days), unless it was dismissed. */
export function lastRecipe(): { id: string; at: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v.id !== "string" || typeof v.at !== "number") return null;
    return v.at < started && started - v.at < 3 * 864e5 ? v : null;
  } catch { return null; }
}

export function forgetRecipe(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
