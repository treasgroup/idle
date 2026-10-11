import { useCallback, useEffect, useState } from "react";
import { Sparkles, BookOpen, CalendarDays, ShoppingCart, Refrigerator, UserRound, ChefHat, WifiOff } from "lucide-react";
import { expiringSoon, usePwa } from "../engine";
import { useStore } from "./store";
import { useActions } from "./actions";
import { close, openLayer, replace, routeHash, useRoute, type Tab } from "./router";
import { Home } from "../screens/Home";
import { Recipes } from "../screens/Recipes";
import { Menu } from "../screens/Menu";
import { Shopping } from "../screens/Shopping";
import { Pantry } from "../screens/Pantry";
import { Profile } from "../screens/Profile";
import { RecipeLayer } from "../screens/RecipeLayer";
import { CookingLayer } from "../screens/Cooking";
import { DocLayer, Learn, Onboarding, PollSheet } from "../screens/Extras";
import { Boundary, Toast, cx } from "../components/ui";

const NAV: { tab: Tab; label: string; icon: typeof Sparkles }[] = [
  { tab: "home", label: "Сегодня", icon: Sparkles },
  { tab: "recipes", label: "Рецепты", icon: BookOpen },
  { tab: "menu", label: "Меню", icon: CalendarDays },
  { tab: "shopping", label: "Покупки", icon: ShoppingCart },
  { tab: "pantry", label: "Дома", icon: Refrigerator },
];

// The address the page was opened with (the links below are removed from it once handled).
const OPENED_WITH = new URLSearchParams(location.search);

/** Links from the old site and from shared messages: ?recipe=, ?tab=, #poll=, #family=, #login=, #privacy. */
function useIncomingLinks(onPoll: (t: string) => void) {
  const { sync, toast, ready, catalog } = useStore();
  const { openRecipe } = useActions();
  const loaded = catalog.version > 0;
  useEffect(() => {
    // A shared recipe link needs the full catalog, not only the recipes built into the app.
    if (!ready || !loaded) return;
    const q = new URLSearchParams(location.search);
    const h = location.hash;
    const clean = () => history.replaceState(null, "", location.pathname + routeHash({ tab: "home" }));
    const poll = h.match(/^#poll=([0-9a-f]{32})$/), family = h.match(/^#family=([0-9a-f]{32})$/), login = h.match(/^#login=(\d{16})$/), doc = h.match(/^#(privacy|rules|terms|info)$/);
    if (poll) { clean(); onPoll(poll[1]); }
    else if (family) { clean(); sync.join(family[1]).then(() => toast("Вы в семье: меню и покупки теперь общие")).catch((e: Error) => toast(e.message)); }
    else if (login) { clean(); sync.login(login[1]).then(() => toast("Готово — данные объединены")).catch((e: Error) => toast(e.message)); }
    else if (doc) { replace(routeHash({ doc: doc[1] })); }
    const tab = q.get("tab");
    const recipe = q.get("recipe");
    if (tab || recipe) history.replaceState(null, "", location.pathname + location.hash);
    if (tab === "shopping" || tab === "menu" || tab === "recipes") replace(routeHash({ tab: tab as Tab }));
    if (recipe) openRecipe(recipe);
  }, [ready, loaded]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function App() {
  const { s, ready, profile, message, online, toast } = useStore();
  const route = useRoute();
  const pwa = usePwa(toast);
  const [poll, setPoll] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  useIncomingLinks(setPoll);
  useEffect(() => {
    if (ready && !profile.setUp && s.onboarding === "new" && !OPENED_WITH.has("recipe") && !location.hash.startsWith("#poll=")) setOnboarding(true);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0); }, [route.tab]);

  const closeRecipe = useCallback(() => close(routeHash({ tab: route.tab })), [route.tab]);
  const closeTop = useCallback(() => close(routeHash({ tab: "home" })), []);
  const cookingNow = s.cooking && !s.cooking.done && !route.cook;
  const toBuy = s.shopping.filter((i) => !i.checked).length;
  const soon = expiringSoon(s.fridge).length;

  const screen = { home: <Home />, recipes: <Recipes />, menu: <Menu />, shopping: <Shopping />, pantry: <Pantry />, profile: <Profile pwa={pwa} />, learn: <Learn /> }[route.tab];

  return (
    <div className="mx-auto min-h-screen max-w-2xl">
      <header className="safe-top sticky top-0 z-30 flex h-[57px] items-center justify-between border-b border-line/50 bg-paper/90 px-4 backdrop-blur">
        <button className="flex items-center gap-2 font-serif text-lg font-semibold" onClick={() => replace(routeHash({ tab: "home" }))}>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white"><ChefHat size={18} /></span>
          Что приготовить?
        </button>
        <div className="flex items-center gap-1">
          {!online && <span className="flex items-center gap-1 rounded-full bg-line/60 px-2 py-1 text-xs text-ink-soft" title="Нет интернета: рецепты, меню и покупки работают"><WifiOff size={13} /> офлайн</span>}
          <button className={cx("btn-ghost px-2", route.tab === "profile" && "text-brand")} onClick={() => replace(routeHash({ tab: "profile" }))} aria-label="Профиль"><UserRound size={22} /></button>
        </div>
      </header>

      <main className={cookingNow ? "pb-40" : "pb-24"}><Boundary resetKey={route.tab}>{screen}</Boundary></main>

      {cookingNow && (
        <button onClick={() => openLayer(routeHash({ cook: true }))} className="fixed inset-x-3 bottom-[84px] z-30 mx-auto flex max-w-[calc(42rem-1.5rem)] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-left text-paper shadow-lg">
          <ChefHat size={20} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm">Готовим «{s.cooking!.recipe.title}» · шаг {s.cooking!.step + 1}</span>
          <span className="text-sm font-semibold">Вернуться</span>
        </button>
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl border-t border-line/60 bg-paper/95 backdrop-blur" aria-label="Разделы">
        <div className="grid grid-cols-5">
          {NAV.map(({ tab, label, icon: Icon }) => {
            const on = route.tab === tab;
            const badge = tab === "shopping" ? toBuy : tab === "pantry" ? soon : 0;
            return (
              <button key={tab} onClick={() => replace(routeHash({ tab }))} aria-current={on ? "page" : undefined}
                className={cx("relative flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px]", on ? "font-semibold text-brand" : "text-ink-faint")}>
                <Icon size={22} strokeWidth={on ? 2.4 : 1.8} />
                {label}
                {badge > 0 && <span className={cx("absolute right-[22%] top-1.5 min-w-[18px] rounded-full px-1 text-[10px] font-bold leading-[18px] text-white", tab === "pantry" ? "bg-warn" : "bg-brand")}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <Boundary resetKey={(route.recipe ?? "") + route.cook}>
        {route.recipe && <RecipeLayer id={route.recipe} onClose={closeRecipe} />}
        {route.cook && <CookingLayer onClose={closeTop} />}
      </Boundary>
      {route.doc && <DocLayer doc={route.doc} onClose={closeTop} />}
      {poll && <PollSheet token={poll} onClose={() => setPoll(null)} />}
      {onboarding && <Onboarding onDone={() => setOnboarding(false)} />}
      <Toast message={message} />
    </div>
  );
}
