// Without internet at the dacha or in the shop: the photos of what the person is going to cook — Избранное, the week's
// plan, the last dishes cooked — are loaded ahead, quietly, while there is a connection. The browser (and the app's
// WebView) keeps them for weeks, so these recipes open with their pictures offline; the recipes themselves are on the
// device already. Not on «экономия трафика» or a slow mobile connection; full-size photos only on a good connection.
import { useEffect } from "react";
import { photoSmallUrl, photoUrl, type EngineState } from "../engine";

const KEY = "cook-offline-photos";
const LIMIT = 48;

type Conn = { saveData?: boolean; effectiveType?: string; type?: string };
const conn = (): Conn | undefined => (navigator as unknown as { connection?: Conn }).connection;

/** The recipes to keep: the week's plan first, then Избранное, then the last cooked. */
export function offlineIds(s: Pick<EngineState, "menu" | "favorites" | "book">): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const plan = s.menu.filter((d) => d.date >= today).flatMap((d) => d.items.map((i) => i.recipeId));
  const out = new Set<string>([...plan, ...s.favorites.map((r) => r.id), ...[...s.book].sort((a, b) => b.at - a.at).slice(0, 8).map((b) => b.recipeId)]);
  return [...out].slice(0, LIMIT);
}

function load(url: string): Promise<void> {
  return new Promise((done) => { const img = new Image(); img.decoding = "async"; img.onload = img.onerror = () => done(); img.src = url; });
}

let running = false;
async function keep(ids: string[]) {
  if (running || !navigator.onLine) return;
  const c = conn();
  if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? "")) return;
  const full = !c || c.type === "wifi" || c.type === "ethernet" || (c.type === undefined && c.effectiveType === "4g");
  let done: Record<string, true> = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* ignore */ }
  const urls = ids.flatMap((id) => [photoSmallUrl(id), full ? photoUrl(id) : null]).filter((u): u is string => !!u && !done[u]);
  if (!urls.length) return;
  running = true;
  try {
    for (const u of urls) {
      if (!navigator.onLine) break;
      await load(u);
      done[u] = true;
      // One at a time and with a pause: the app stays quick while this goes on.
      await new Promise((r) => setTimeout(r, 150));
    }
  } finally {
    running = false;
    // Only the addresses still wanted are remembered (a photo replaced by the owner gets a new address).
    const want = new Set(ids.flatMap((id) => [photoSmallUrl(id), photoUrl(id)]));
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.keys(done).filter((u) => want.has(u)).map((u) => [u, true])))); } catch { /* ignore */ }
  }
}

/** Keeps the photos up to date a few seconds after the plan or Избранное changes (and once after the app opens). */
export function useOfflinePhotos(s: Pick<EngineState, "menu" | "favorites" | "book">, ready: boolean) {
  const ids = ready ? offlineIds(s).join(",") : "";
  useEffect(() => {
    if (!ids) return;
    const t = window.setTimeout(() => { void keep(ids.split(",")); }, 6000);
    const online = () => void keep(ids.split(","));
    window.addEventListener("online", online);
    return () => { window.clearTimeout(t); window.removeEventListener("online", online); };
  }, [ids]);
}
