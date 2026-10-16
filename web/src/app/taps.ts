// «Где путаются» for the owner: taps on things that look tappable but are not (a picture, a heading, a short line),
// and three quick taps on one spot (a button that seems not to answer). Only a short label of the thing and the
// section are sent, in small batches; nothing typed by people, nothing inside [data-private].
import { apiUrl } from "../engine";

type Tap = { kind: "dead" | "rage"; route: string; label: string };
const ACTIVE = "button, a, input, select, textarea, label, summary, [role=button], [role=radio], [role=tab], [role=switch], [role=checkbox], [role=option], [role=link], [role=slider], [contenteditable]";
let queue: Tap[] = [];
let timer = 0;
let last: { x: number; y: number; t: number; n: number } | null = null;

function route(): string {
  const h = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (h[0] === "cook") return "cook";
  if (h.includes("r")) return "recipe";
  return h[0] && /^[a-z]+$/.test(h[0]) ? h[0] : "home";
}

function label(el: Element): string {
  if (el instanceof HTMLImageElement) return "картинка" + (el.closest("[data-photo], [data-photo-hero]") ? " блюда" : "");
  const aria = el.getAttribute("aria-label");
  const text = (aria || el.textContent || "").replace(/\s+/g, " ").trim();
  return text.slice(0, 40);
}

function flush() {
  timer = 0;
  if (!queue.length) return;
  const body = JSON.stringify({ taps: queue.splice(0, 20) });
  try {
    if (!navigator.sendBeacon?.(apiUrl("taps"), new Blob([body], { type: "application/json" })))
      void fetch(apiUrl("taps"), { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* ignore */ }
}
function add(t: Tap) {
  if (queue.some((q) => q.kind === t.kind && q.route === t.route && q.label === t.label)) return;
  queue.push(t);
  if (!timer) timer = window.setTimeout(flush, 20000);
}

export function watchTaps(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    const el = e.target as Element | null;
    if (!el || !(el instanceof Element) || el.closest("[data-private]")) return;
    const now = performance.now();
    // Three taps within a second on one spot.
    if (last && now - last.t < 1000 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40) {
      last = { x: e.clientX, y: e.clientY, t: now, n: last.n + 1 };
      if (last.n === 3) { const l = label(el.closest(ACTIVE) ?? el); if (l) add({ kind: "rage", route: route(), label: l }); }
    } else last = { x: e.clientX, y: e.clientY, t: now, n: 1 };
    // A tap on something that is not a control — only small, button-like things count (not empty space).
    if (el.closest(ACTIVE) || window.getSelection()?.toString()) return;
    const r = el.getBoundingClientRect();
    const small = r.width < window.innerWidth * 0.7 && r.height < 120;
    const looks = el instanceof HTMLImageElement || /^H[1-4]$/.test(el.tagName) || (small && (el.textContent ?? "").trim().length > 0 && (el.textContent ?? "").trim().length <= 40);
    if (!looks) return;
    const l = label(el);
    if (l) add({ kind: "dead", route: route(), label: l });
  }, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
}
