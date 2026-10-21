// New tabs in the old admin panel (a prebuilt bundle without its source): they are added to its top menu as
// links like its own (#collections…), and while one is open its page is shown in the panel's main area
// instead of the old one. The old tabs keep working as they were.
import { createRoot, type Root } from "react-dom/client";
import type { ComponentType } from "react";
import { Collections } from "./Collections";
import { Messages, Vk } from "./Legacy";
import { CSS } from "./ui";

interface Tab { hash: string; label: string; after: string; page: ComponentType }
// Where each goes in the menu: messages next to the statistics, collections next to the recipes, VK before the catalog.
const TABS: Tab[] = [
  { hash: "#messages", label: "Сообщения", after: "#stats", page: Messages },
  { hash: "#collections", label: "Подборки", after: "#recipes", page: Collections },
  { hash: "#vk", label: "ВКонтакте", after: "#teach", page: Vk },
];

/** New messages from people: a number on «Сообщения», counted once the panel is open (and after a reply). */
let counted = false;
function countMessages(): void {
  if (counted) return;
  counted = true;
  fetch("../api/index.php?r=admin.insights&days=90", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).then((d: { messages?: { seen?: number | string }[] } | null) => {
    const n = (d?.messages ?? []).filter((m) => !+(m.seen ?? 0)).length;
    const a = document.querySelector('nav.adm-nav a[data-extra="#messages"]');
    if (!a) return;
    a.querySelector(".cx-count")?.remove();
    if (n) { const b = document.createElement("span"); b.className = "cx-count"; b.textContent = String(n); a.append(b); }
  }).catch(() => { counted = false; });
}

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
  countMessages();
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
    // Leaving «Сообщения» (read, answered): the number on the tab is counted again.
    if (shown === "#messages") { counted = false; countMessages(); }
    root?.unmount(); root = null; box?.remove(); box = null; shown = null;
    if (main.classList.contains("cook-extra-on")) main.classList.remove("cook-extra-on");
  }
}

// «Прочитано», «Ответить», «Удалить» in the messages: the number on the tab follows a moment later.
document.addEventListener("click", (e) => {
  if ((e.target as Element | null)?.closest?.("#cook-extra #out button")) window.setTimeout(() => { counted = false; countMessages(); }, 900);
});

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
