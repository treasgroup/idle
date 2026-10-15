// Hash routes, so the site works from any subfolder and the phone's "back" closes what was opened last.
//   #/            home: Шеф (the assistant)     #/chat  the conversation with Шеф
//   #/recipes   #/menu   #/shopping   #/pantry   #/profile
//   …/r/<id>      a recipe opened over the current tab
//   #/cook        cooking mode
//   #/doc/<key>   a legal document;  #/learn  the beginner course
import { useEffect, useState } from "react";

export type Tab = "home" | "chat" | "recipes" | "menu" | "shopping" | "pantry" | "profile" | "learn";
export const TABS: Tab[] = ["home", "chat", "recipes", "menu", "shopping", "pantry", "profile", "learn"];

export interface Route {
  tab: Tab;
  recipe: string | null;
  cook: boolean;
  doc: string | null;
}

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const route: Route = { tab: "home", recipe: null, cook: false, doc: null };
  if (parts[0] === "cook") return { ...route, cook: true };
  if (parts[0] === "doc" && parts[1]) return { ...route, doc: parts[1] };
  if (parts[0] && (TABS as string[]).includes(parts[0])) route.tab = parts[0] as Tab;
  const r = parts.indexOf("r");
  if (r >= 0 && parts[r + 1]) route.recipe = decodeURIComponent(parts[r + 1]);
  return route;
}

export function routeHash(r: Partial<Route> & { tab?: Tab }): string {
  if (r.cook) return "#/cook";
  if (r.doc) return "#/doc/" + r.doc;
  const tab = r.tab ?? "home";
  return "#/" + (tab === "home" ? "" : tab) + (r.recipe ? (tab === "home" ? "" : "/") + "r/" + encodeURIComponent(r.recipe) : "");
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

/** Opens something on top: a new history entry, so "back" closes it. */
export function push(hash: string): void {
  if (location.hash === hash) return;
  location.hash = hash;
}

/** Changes the screen without a new history entry (tabs, closing). */
export function replace(hash: string): void {
  history.replaceState(null, "", location.pathname + location.search + hash);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Closes the top layer: goes back when we opened it, otherwise lands on the tab underneath. */
export function close(fallback: string): void {
  if (history.state?.cookOpened) history.back();
  else replace(fallback);
}

export function openLayer(hash: string): void {
  history.pushState({ cookOpened: true }, "", location.pathname + location.search + hash);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Opens «Рецепты» on a given view (the home screen's «Все» under «Сохранённое»). */
const VIEW_KEY = "cook-recipes-view";
/** `view`: «saved», «book», «dish:<section>», «filter:<id>» or «time:<minutes>». */
export function openRecipesView(view: string): void {
  try { sessionStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  replace(routeHash({ tab: "recipes" }));
}
export function takeRecipesView(): string | null {
  try { const v = sessionStorage.getItem(VIEW_KEY); sessionStorage.removeItem(VIEW_KEY); return v; } catch { return null; }
}
