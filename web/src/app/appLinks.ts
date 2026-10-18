// The Android app: links to the site tapped elsewhere (a recipe or «Семейная книга» sent in a messenger) open in the
// app instead of the browser, and a tapped reminder opens its section. The links are kept until the app is ready.
import { routeHash, replace, TABS, type Tab } from "./router";

export const LINK_EVENT = "cook-link";
type Link = { hash: string; query: URLSearchParams };
let pending: Link[] = [];
let opened = false;
/** The app was opened by a link this time (no welcome screens over it). */
export const openedByLink = (): boolean => opened;

export function takeLinks(): Link[] { const l = pending; pending = []; return l; }

/** https://treas.su/cook/recipe/borsch, …/cook/?recipe=borsch, …/cook/#book=…, …/cook/#/r/borsch → what the page understands. */
export function toLink(raw: string): Link | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  const path = u.pathname.replace(/^.*?\/cook\/?/, "");
  const q = new URLSearchParams(u.search);
  const m = path.match(/^recipe\/([a-z0-9-]+)\/?$/);
  if (m) q.set("recipe", m[1]);
  if (u.hash.startsWith("#/")) { opened = true; location.hash = u.hash; return null; }
  return { hash: u.hash, query: q };
}

type Native = { App?: { addListener?: (e: string, f: (x: { url?: string }) => void) => unknown; getLaunchUrl?: () => Promise<{ url?: string } | undefined> } };

export function watchAppLinks(): void {
  const n = (window as Window & { CookNative?: Native }).CookNative;
  const push = (url?: string) => {
    const l = url ? toLink(url) : null;
    if (!l) return;
    opened = true;
    pending.push(l);
    window.dispatchEvent(new Event(LINK_EVENT));
  };
  try {
    n?.App?.addListener?.("appUrlOpen", (e) => push(e.url));
    void n?.App?.getLaunchUrl?.().then((r) => push(r?.url)).catch(() => {});
  } catch { /* an older app without links */ }
  // A tapped reminder or timer notification names the section to open.
  window.addEventListener("cook-open", (e) => {
    const tab = (e as CustomEvent<{ tab?: string }>).detail?.tab;
    if (tab && (TABS as string[]).includes(tab)) replace(routeHash({ tab: tab as Tab }));
  });
}
