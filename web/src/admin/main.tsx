// The admin panel's menu, grouped as in a marketplace seller's office: a few sections at the top, the section's
// own tabs in a row under the header. New tools go inside a section, so the header does not grow.
// The old panel (a prebuilt bundle without its source) keeps its pages and routes (#stats, #recipes…); its own menu
// is hidden and this one drawn in its place. The new pages (#messages, #collections…) are shown in its main area.
import { createRoot, type Root } from "react-dom/client";
import type { ComponentType } from "react";
import { Collections } from "./Collections";
import { Improve } from "./Improve";
import { Messages, Vk } from "./Legacy";
import { NewRecipes } from "./NewRecipes";
import { School } from "./School";
import { Opens } from "./Opens";
import { VkPosts } from "./VkPosts";
import { Photos } from "./Photos";
import { Security } from "./Security";
import { Searches } from "./Searches";
import { prepareSearchTexts } from "./searchTexts";
import { CSS } from "./ui";
import { installFormShim } from "../app/formShim";

// Photos, covers and School pictures go as JSON — the old panel's uploads too: the hosting blocks forms with files.
installFormShim();

/** The new pages; the other addresses are the old panel's. */
// «ВКонтакте»: the old page (the dish of the day, posts for the week) and under it the ready posts.
const VkPage = () => <><Vk /><VkPosts /></>;
const PAGES: Record<string, ComponentType> = { "#messages": Messages, "#collections": Collections, "#improve": Improve, "#new": NewRecipes, "#school": School, "#vk": VkPage, "#opens": Opens, "#photos": Photos, "#security": Security, "#searches": Searches };

interface Section { label: string; tabs: [hash: string, label: string][] }
const SECTIONS: Section[] = [
  { label: "Статистика", tabs: [["#stats", "Статистика"], ["#searches", "Что ищут"], ["#opens", "Откуда открывают"]] },
  { label: "Люди", tabs: [["#messages", "Сообщения"], ["#reviews", "Отзывы"]] },
  { label: "Рецепты", tabs: [["#recipes", "Все рецепты"], ["#photos", "Фото"], ["#collections", "Подборки"], ["#new", "Новые рецепты"], ["#improve", "Доработка"], ["#school", "Школа"], ["#files", "Файлы каталога"]] },
  { label: "Шеф", tabs: [["#teach", "Обучение Шефа"]] },
  { label: "Продвижение", tabs: [["#vk", "ВКонтакте"]] },
  { label: "Настройки", tabs: [["#server", "Настройки"], ["#security", "Безопасность"]] },
];

const base = () => "#" + (location.hash.slice(1).split("/")[0] || "stats");
const sectionOf = (h: string) => SECTIONS.find((s) => s.tabs.some(([t]) => t === h)) ?? SECTIONS[0];

/** New messages from people: a number on «Люди» and «Сообщения», counted when the panel opens (and after a reply). */
let counted = false;
let unread = 0;
function countMessages(): void {
  if (counted) return;
  counted = true;
  fetch("../api/index.php?r=admin.insights&days=90", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).then((d: { messages?: { seen?: number | string }[] } | null) => {
    unread = (d?.messages ?? []).filter((m) => !+(m.seen ?? 0)).length;
    drawMenu(true);
    // Logged in: the search pages' texts are brought up to date in the background.
    if (d) prepareSearchTexts();
  }).catch(() => { counted = false; });
}

const count = (n: number) => (n ? `<span class="cx-count">${n}</span>` : "");
let drawn = "";

/** The sections in the header and the current section's tabs under it; redrawn only when something changed. */
function drawMenu(force = false): void {
  const header = document.querySelector<HTMLElement>("header.adm-header");
  const old = header?.querySelector<HTMLElement>("nav.adm-nav:not(.cx-nav)");
  if (!header || !old) return;
  const h = base();
  const cur = sectionOf(h);
  const key = h + "|" + unread;
  let nav = header.querySelector<HTMLElement>("nav.cx-nav");
  let sub = document.querySelector<HTMLElement>("nav.cx-sub");
  if (!force && nav && sub && drawn === key) return;
  drawn = key;
  if (!nav) { nav = document.createElement("nav"); nav.className = "adm-nav cx-nav"; nav.setAttribute("aria-label", "Разделы"); old.after(nav); }
  nav.innerHTML = SECTIONS.map((s) => `<a href="${s.tabs[0][0]}"${s === cur ? ' class="active" aria-current="page"' : ""}>${s.label}${s.label === "Люди" ? count(unread) : ""}</a>`).join("");
  if (!sub) { sub = document.createElement("nav"); sub.className = "cx-sub"; sub.setAttribute("aria-label", "Вкладки раздела"); header.after(sub); }
  sub.hidden = cur.tabs.length < 2;
  sub.innerHTML = `<div class="cx-sub-in">${cur.tabs.map(([t, label]) => `<a href="${t}"${t === h ? ' class="on" aria-current="page"' : ""}>${label}${t === "#messages" ? count(unread) : ""}</a>`).join("")}</div>`;
}

let root: Root | null = null;
let shown: string | null = null;
let box: HTMLElement | null = null;

function sync(): void {
  drawMenu();
  const main = document.querySelector<HTMLElement>("main.adm-main");
  if (!main) return;
  const h = base();
  const Page = PAGES[h];
  if (Page) {
    if (!box || !main.contains(box)) { box = document.createElement("div"); box.id = "cook-extra"; main.prepend(box); root?.unmount(); root = createRoot(box); shown = null; }
    // classList.add of a class already there still counts as a change for the observer: checked first.
    if (!main.classList.contains("cook-extra-on")) main.classList.add("cook-extra-on");
    if (shown !== h) { root!.render(<Page />); shown = h; window.scrollTo(0, 0); }
  } else if (shown) {
    // Leaving «Сообщения» (read, answered): the number is counted again.
    if (shown === "#messages") { counted = false; countMessages(); }
    root?.unmount(); root = null; box?.remove(); box = null; shown = null;
    if (main.classList.contains("cook-extra-on")) main.classList.remove("cook-extra-on");
  }
}

// «Прочитано», «Ответить», «Удалить» in the messages: the number follows a moment later.
document.addEventListener("click", (e) => {
  if ((e.target as Element | null)?.closest?.("#cook-extra #out button")) window.setTimeout(() => { counted = false; countMessages(); }, 900);
});

const style = document.createElement("style");
style.textContent = CSS;
document.head.append(style);
window.addEventListener("hashchange", sync);
// The old panel draws its header after logging in (and again after logging out and in): the menu is put back.
new MutationObserver(() => {
  const header = document.querySelector("header.adm-header");
  if (header && !header.querySelector("nav.cx-nav")) { drawn = ""; countMessages(); }
  sync();
}).observe(document.body, { childList: true, subtree: true });
countMessages();
sync();
