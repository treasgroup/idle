// New tabs in the old admin panel (a prebuilt bundle without its source): they are added to its top menu as
// links like its own (#collections…), and while one is open its page is shown in the panel's main area
// instead of the old one. The old tabs keep working as they were.
import { createRoot, type Root } from "react-dom/client";
import type { ComponentType } from "react";
import { Collections } from "./Collections";
import { CSS } from "./ui";

interface Tab { hash: string; label: string; after: string; page: ComponentType }
const TABS: Tab[] = [
  { hash: "#collections", label: "Подборки", after: "#recipes", page: Collections },
];

let root: Root | null = null;
let shown: string | null = null;
let box: HTMLElement | null = null;

const base = () => "#" + (location.hash.slice(1).split("/")[0] || "stats");

function ensureTabs(): void {
  const nav = document.querySelector("nav.adm-nav");
  if (!nav) return;
  for (const t of TABS) {
    if (nav.querySelector(`a[data-extra="${t.hash}"]`)) continue;
    const a = document.createElement("a");
    a.href = t.hash; a.textContent = t.label; a.dataset.extra = t.hash;
    const ref = nav.querySelector(`a[href="${t.after}"]`);
    if (ref) ref.after(a); else nav.append(a);
  }
  sync();
}

function sync(): void {
  const nav = document.querySelector("nav.adm-nav");
  const main = document.querySelector<HTMLElement>("main.adm-main");
  if (!nav || !main) return;
  const h = base();
  const tab = TABS.find((t) => t.hash === h);
  // The menu: the old panel shows «Статистика» for any address it does not know — the right link is marked here.
  // Only what differs is touched: the observer below sees these changes too.
  for (const a of Array.from(nav.querySelectorAll<HTMLAnchorElement>("a"))) {
    const on = a.getAttribute("href") === h;
    if (a.classList.contains("active") !== on) a.classList.toggle("active", on);
    if (on && a.getAttribute("aria-current") !== "page") a.setAttribute("aria-current", "page");
    if (!on && a.hasAttribute("aria-current")) a.removeAttribute("aria-current");
  }
  if (tab) {
    if (!box || !main.contains(box)) { box = document.createElement("div"); box.id = "cook-extra"; main.prepend(box); root?.unmount(); root = createRoot(box); shown = null; }
    // classList.add of a class already there still counts as a change for the observer: checked first.
    if (!main.classList.contains("cook-extra-on")) main.classList.add("cook-extra-on");
    if (shown !== tab.hash) { const Page = tab.page; root!.render(<Page />); shown = tab.hash; window.scrollTo(0, 0); }
  } else if (shown) {
    root?.unmount(); root = null; box?.remove(); box = null; shown = null;
    if (main.classList.contains("cook-extra-on")) main.classList.remove("cook-extra-on");
  }
}

const style = document.createElement("style");
style.textContent = CSS;
document.head.append(style);
window.addEventListener("hashchange", sync);
// The old panel draws its menu after logging in and redraws it (marking «Статистика» for an address it does not
// know): the links are put back and the right one marked again each time.
new MutationObserver(() => {
  const nav = document.querySelector("nav.adm-nav");
  if (nav && TABS.some((t) => !nav.querySelector(`a[data-extra="${t.hash}"]`))) ensureTabs(); else sync();
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
ensureTabs();
