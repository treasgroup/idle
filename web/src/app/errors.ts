// Errors from people's phones reach the owner: each one is sent once per visit to the site's own server
// and shows up in the admin panel («Как идут дела»). Nothing personal is sent: the message, where, the version.
import { apiUrl } from "../engine";

const sent = new Set<string>();
const version = () => (typeof document === "undefined" ? "" : (document.querySelector('script[type="module"][src*="assets/app-"]') as HTMLScriptElement | null)?.src.match(/app-([\w-]+)\.js/)?.[1] ?? "");
// Noise that is not ours: extensions, a browser quirk, scripts of other sites.
const IGNORE = /ResizeObserver loop|^Script error\.?$|chrome-extension:|moz-extension:|safari-extension:|Non-Error promise rejection|Load failed$|Failed to fetch$|NetworkError/i;

export function reportError(error: unknown, place = ""): void {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const message = (e.name && e.name !== "Error" ? e.name + ": " : "") + e.message;
    if (!message || IGNORE.test(message) || IGNORE.test(place) || !navigator.onLine) return;
    const where = place || (e.stack ?? "").split("\n").find((l) => /assets\/(app|chunk)-/.test(l))?.trim().slice(0, 300) || location.hash.slice(0, 60);
    const key = message + "|" + where;
    if (sent.has(key) || sent.size > 20) return;
    sent.add(key);
    void fetch(apiUrl("error"), {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", keepalive: true,
      body: JSON.stringify({ message: message.slice(0, 1500), place: where, version: version() }),
    }).catch(() => {});
  } catch { /* reporting must never break the page */ }
}

export function watchErrors(): void {
  window.addEventListener("error", (ev) => reportError(ev.error ?? ev.message, ev.filename ? ev.filename.replace(location.origin, "") + ":" + ev.lineno : ""));
  window.addEventListener("unhandledrejection", (ev) => reportError(ev.reason, "promise"));
}
