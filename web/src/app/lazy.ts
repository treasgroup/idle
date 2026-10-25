// Screens that are not needed for the first look (chat, recipe, cooking, plan…) load when first opened, so the
// site starts faster on weak phones. If a piece is gone after an update (an old tab), the page reloads once.
import { lazy, type ComponentType } from "react";

const KEY = "cook-chunk-reload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyScreen<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => load().then((m) => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } return m; }, (err) => {
    let reloaded = false;
    try { reloaded = sessionStorage.getItem(KEY) === "1"; sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    if (!reloaded && navigator.onLine) { location.reload(); return new Promise<never>(() => {}); }
    throw err;
  }));
}

/** Starts loading the usual next screens while the person looks at the first one. */
export function preload(loads: (() => Promise<unknown>)[]): void {
  // «Экономия трафика» or a slow mobile connection: each screen loads when opened, nothing ahead.
  const net = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (net?.saveData || /(^|-)(2g|3g)$/.test(net?.effectiveType ?? "")) return;
  const go = () => loads.forEach((l) => { l().catch(() => {}); });
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(go); else window.setTimeout(go, 1500);
}
