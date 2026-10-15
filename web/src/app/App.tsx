// The app shell: the bottom bar on phones, a rail on tablets, a sidebar with recent conversations on desktop.
// Шеф (the assistant) is the first destination and the one coloured item everywhere.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen, CalendarDays, ChefHat, Flame, GraduationCap, MessageCircle, Refrigerator, ShoppingCart, SquarePen, UserRound, WifiOff, X,
  type LucideIcon,
} from "lucide-react";
import { expiringSoon, recipeById, usePwa } from "../engine";
import { useStore } from "./store";
import { useActions } from "./actions";
import { AssistantProvider, useAssistant } from "./assistant";
import { goChat, useOpenChat } from "./chatNav";
import { removeChat, useChats } from "./chats";
import { close, openLayer, replace, routeHash, useRoute, type Route, type Tab } from "./router";
import { migrateOldTimer, secondsLeft, useTick, useTimerAlarm, useTimers } from "./timers";
import { Home } from "../screens/Home";
import { Chat } from "../screens/Chat";
import { Recipes } from "../screens/Recipes";
import { Menu } from "../screens/Menu";
import { Shopping } from "../screens/Shopping";
import { Pantry } from "../screens/Pantry";
import { Profile } from "../screens/Profile";
import { RecipeLayer } from "../screens/RecipeLayer";
import { CookingLayer } from "../screens/Cooking";
import { DocLayer, Learn, Onboarding, PollSheet } from "../screens/Extras";
import { Boundary, ChefAvatar, Toast, cx, mmss, useScrolled } from "../components/ui";

const NAV: { tab: Tab; label: string; icon: LucideIcon }[] = [
  { tab: "home", label: "Шеф", icon: ChefHat },
  { tab: "recipes", label: "Рецепты", icon: BookOpen },
  { tab: "menu", label: "Меню", icon: CalendarDays },
  { tab: "shopping", label: "Покупки", icon: ShoppingCart },
  { tab: "pantry", label: "Дома", icon: Refrigerator },
];
const isOn = (route: Route, tab: Tab) => route.tab === tab || (tab === "home" && route.tab === "chat");

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

/** The on-screen keyboard is open (the visual viewport shrank a lot): the bottom bar steps aside. */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setOpen(window.innerHeight - vv.height > 150);
    vv.addEventListener("resize", on);
    return () => vv.removeEventListener("resize", on);
  }, []);
  return open;
}

export function App() {
  const { openRecipe } = useActions();
  return <AssistantProvider onOpen={openRecipe}><Shell /></AssistantProvider>;
}

function Shell() {
  const { s, ready, profile, message, toast, clearToast } = useStore();
  const route = useRoute();
  const pwa = usePwa(toast);
  const [poll, setPoll] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const keyboard = useKeyboardOpen();
  const bottom = useRef<HTMLDivElement>(null);
  useIncomingLinks(setPoll);
  useTimerAlarm(toast, s.readAloud);
  useEffect(() => {
    if (!ready) return;
    if (!profile.setUp && s.onboarding === "new" && !OPENED_WITH.has("recipe") && !location.hash.startsWith("#poll=")) setOnboarding(true);
    const c = s.cooking;
    migrateOldTimer([
      ...(c ? [{ title: c.recipe.title, recipeId: c.recipe.id, end: c.timerEnd, step: c.timerStep }] : []),
      ...(profile.parallel ? [{ title: "Второе блюдо", recipeId: profile.parallel.recipeId, end: profile.parallel.timerEnd, step: profile.parallel.step }] : []),
    ]);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0); }, [route.tab]);

  // --nav-h: the height of what is fixed at the bottom (the bar and the mini-player), for toasts and page padding.
  useLayoutEffect(() => {
    const el = bottom.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--nav-h", el.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeRecipe = useCallback(() => close(routeHash({ tab: route.tab })), [route.tab]);
  const closeTop = useCallback(() => close(routeHash({ tab: "home" })), []);
  const layer = !!(route.recipe || route.cook || route.doc || route.tab === "learn");
  const chat = route.tab === "chat";
  const cookingNow = (!!(s.cooking && !s.cooking.done) || !!profile.parallel) && !route.cook;
  const go = (tab: Tab) => { clearToast(); replace(routeHash({ tab })); };

  const screen = {
    home: <Home />, chat: <Chat />, recipes: <Recipes />, menu: <Menu />, shopping: <Shopping />, pantry: <Pantry />,
    profile: <Profile pwa={pwa} />, learn: <Home />,
  }[route.tab];

  return (
    <div className="min-h-screen">
      <Sidebar route={route} go={go} />
      <Rail route={route} go={go} />
      {!chat && <Header route={route} go={go} />}

      <main className={cx("sm:pl-20 lg:pl-64", !chat && "pb-[calc(var(--nav-h)+2rem)]")}>
        {chat ? (
          <Boundary resetKey="chat">{screen}</Boundary>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6 sm:pt-4 lg:max-w-[1200px] lg:px-8 lg:pt-8">
            <Boundary resetKey={route.tab}>{screen}</Boundary>
          </div>
        )}
      </main>

      <div ref={bottom} className="fixed inset-x-0 bottom-0 z-30 sm:left-20 lg:hidden">
        {cookingNow && !layer && !chat && !keyboard && <MiniPlayer />}
        {!layer && !chat && !keyboard && <BottomNav route={route} go={go} />}
      </div>

      <Boundary resetKey={(route.recipe ?? "") + route.cook}>
        {route.recipe && <RecipeLayer id={route.recipe} onClose={closeRecipe} />}
        {route.cook && <CookingLayer onClose={closeTop} />}
      </Boundary>
      {route.tab === "learn" && <Learn onClose={closeTop} />}
      {route.doc && <DocLayer doc={route.doc} onClose={closeTop} />}
      {poll && <PollSheet token={poll} onClose={() => setPoll(null)} />}
      {onboarding && <Onboarding onDone={() => setOnboarding(false)} />}
      <Toast message={message} onClose={clearToast} />
    </div>
  );
}

function useBadges() {
  const { s } = useStore();
  return { shopping: s.shopping.filter((i) => !i.checked).length, pantry: expiringSoon(s.fridge).length };
}

function Badge({ n, warn, className }: { n: number; warn?: boolean; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={cx("min-w-[18px] rounded-full px-1 text-center text-[11px] font-bold leading-[18px] text-white", warn ? "bg-warn" : "bg-brand-fill", className)}
      aria-label={warn ? n + " скоро испортится" : n + " купить"}>{n > 99 ? "99+" : n}</span>
  );
}

/** Phones: five destinations; Шеф is always the coloured one. */
function BottomNav({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const badges = useBadges();
  return (
    <nav className="pb-safe border-t border-line bg-paper sm:hidden" aria-label="Разделы">
      <div className="flex">
        {NAV.map(({ tab, label, icon: Icon }) => {
          const on = isOn(route, tab);
          const chef = tab === "home";
          return (
            <button key={tab} onClick={() => go(tab)} aria-current={on ? "page" : undefined}
              className="relative flex h-16 flex-1 flex-col items-center justify-center gap-1">
              <span className={cx("grid h-8 w-14 place-items-center rounded-full transition-colors", on && "bg-brand-soft")}>
                {chef
                  ? <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-fill text-white"><ChefHat size={16} strokeWidth={2.25} /></span>
                  : <Icon size={24} strokeWidth={on ? 2.25 : 1.75} className={on ? "text-brand" : "text-ink-soft"} />}
              </span>
              <span className={cx("text-micro", on ? "font-semibold text-brand" : "text-ink-soft")}>{label}</span>
              {tab === "shopping" && <Badge n={badges.shopping} className="absolute left-1/2 top-1.5 ml-2" />}
              {tab === "pantry" && <Badge n={badges.pantry} warn className="absolute left-1/2 top-1.5 ml-2" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Phones and tablets: on Шеф the assistant's name; elsewhere a box that opens the conversation. */
function Header({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const { online } = useStore();
  const openChat = useOpenChat();
  const scrolled = useScrolled();
  const home = route.tab === "home";
  return (
    <header className={cx("pt-safe sticky top-0 z-30 border-b bg-paper transition-colors lg:hidden", scrolled ? "border-line" : "border-transparent", "sm:ml-20")}>
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
        {home ? (
          <span className="flex flex-1 items-center gap-2.5">
            <ChefAvatar size={32} />
            <span className="font-serif text-[1.125rem] font-semibold">Шеф</span>
          </span>
        ) : (
          <>
            <button className="-ml-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full sm:hidden" onClick={() => go("home")} aria-label="Шеф — главная"><ChefAvatar size={32} /></button>
            <button className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-sunken px-4 text-body-sm text-ink-soft transition-colors hover:bg-line" onClick={() => openChat("auto")}>
              <MessageCircle size={18} className="shrink-0 text-brand" aria-hidden />
              <span className="truncate">Спросить Шефа…</span>
            </button>
          </>
        )}
        {!online && <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-sunken px-2.5 text-caption text-ink-soft" title="Нет интернета: рецепты, меню и покупки работают"><WifiOff size={14} aria-hidden />офлайн</span>}
        <button className={cx("-mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full sm:hidden")} onClick={() => go("profile")} aria-label="Профиль" aria-current={route.tab === "profile" ? "page" : undefined}>
          <span className={cx("grid h-8 w-8 place-items-center rounded-full", route.tab === "profile" ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink-soft")}><UserRound size={18} /></span>
        </button>
      </div>
    </header>
  );
}

/** Tablets: a narrow rail with «Новый разговор» on top. */
function Rail({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const openChat = useOpenChat();
  const badges = useBadges();
  return (
    <nav className="pt-safe fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-1 border-r border-line bg-paper pb-4 sm:flex lg:hidden" aria-label="Разделы">
      <button className="mb-3 mt-4 grid h-14 w-14 place-items-center rounded-full bg-brand-fill text-white shadow-e1 transition-transform active:scale-95" onClick={() => openChat("new")} aria-label="Новый разговор с Шефом" title="Новый разговор">
        <SquarePen size={22} />
      </button>
      {NAV.map(({ tab, label, icon: Icon }) => {
        const on = isOn(route, tab);
        return (
          <button key={tab} onClick={() => go(tab)} aria-current={on ? "page" : undefined} className="relative flex h-14 w-full flex-col items-center justify-center gap-1">
            <span className={cx("grid h-8 w-14 place-items-center rounded-full", on && "bg-brand-soft")}>
              {tab === "home"
                ? <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-fill text-white"><ChefHat size={16} strokeWidth={2.25} /></span>
                : <Icon size={22} strokeWidth={on ? 2.25 : 1.75} className={on ? "text-brand" : "text-ink-soft"} />}
            </span>
            <span className={cx("text-micro", on ? "font-semibold text-brand" : "text-ink-soft")}>{label}</span>
            {tab === "shopping" && <Badge n={badges.shopping} className="absolute right-3 top-0.5" />}
            {tab === "pantry" && <Badge n={badges.pantry} warn className="absolute right-3 top-0.5" />}
          </button>
        );
      })}
      <span className="flex-1" />
      <button onClick={() => openLayer(routeHash({ tab: "learn" }))} className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-sunken" aria-label="Школа готовки" title="Школа готовки"><GraduationCap size={22} /></button>
      <button onClick={() => go("profile")} aria-label="Профиль" aria-current={route.tab === "profile" ? "page" : undefined} className="grid h-11 w-11 place-items-center rounded-full">
        <span className={cx("grid h-9 w-9 place-items-center rounded-full", route.tab === "profile" ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink-soft")}><UserRound size={18} /></span>
      </button>
    </nav>
  );
}

/** Desktop: logo, «Новый разговор», destinations, recent conversations, the dish on the stove, Школа and Профиль. */
function Sidebar({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const { s } = useStore();
  const a = useAssistant();
  const openChat = useOpenChat();
  const chats = useChats();
  const badges = useBadges();
  const { profile } = useStore();
  const cooking = (!!(s.cooking && !s.cooking.done) || !!profile.parallel) && !route.cook;
  const current = s.conversation.find((m) => m.role === "user")?.text;
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper px-3 pb-4 pt-5 lg:flex" aria-label="Меню сайта">
      <button className="flex items-center gap-2.5 rounded-input px-2 py-1 text-left" onClick={() => go("home")}>
        <ChefAvatar size={32} />
        <span className="font-serif text-[1.125rem] font-semibold leading-tight">Что приготовить?</span>
      </button>
      <button className="btn-primary mt-5 w-full" onClick={() => openChat("new")}><SquarePen size={18} />Новый разговор</button>
      <nav className="mt-4 grid gap-0.5" aria-label="Разделы">
        {NAV.map(({ tab, label, icon: Icon }) => {
          const on = isOn(route, tab);
          return (
            <button key={tab} onClick={() => go(tab)} aria-current={on ? "page" : undefined}
              className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-body-sm transition-colors", on ? "bg-brand-soft font-semibold text-brand-ink" : "text-ink hover:bg-sunken")}>
              {tab === "home"
                ? <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-fill text-white"><ChefHat size={14} strokeWidth={2.25} /></span>
                : <Icon size={20} strokeWidth={on ? 2.25 : 1.75} className={on ? "text-brand" : "text-ink-soft"} />}
              <span className="flex-1 text-left">{label}</span>
              {tab === "shopping" && <Badge n={badges.shopping} />}
              {tab === "pantry" && <Badge n={badges.pantry} warn />}
            </button>
          );
        })}
      </nav>
      {(current || chats.length > 0) && (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <p className="label px-3">Недавние разговоры</p>
          <ul className="mt-1.5 grid gap-0.5">
            {current && (
              <li>
                <button onClick={() => goChat()} className={cx("flex h-9 w-full items-center rounded-lg px-3 text-left text-small", route.tab === "chat" ? "bg-sunken font-semibold" : "hover:bg-sunken")}>
                  <span className="truncate">{current}</span>
                </button>
              </li>
            )}
            {chats.slice(0, current ? 7 : 8).map((c) => (
              <li key={c.id} className="group relative">
                <button onClick={() => { a.restore(c.id); goChat(); }} className="flex h-9 w-full items-center rounded-lg px-3 pr-9 text-left text-small text-ink-soft hover:bg-sunken hover:text-ink">
                  <span className="truncate">{c.title}</span>
                </button>
                <button onClick={() => removeChat(c.id)} aria-label={"Удалить разговор «" + c.title + "»"}
                  className="absolute right-1 top-0.5 grid h-8 w-8 place-items-center rounded-full text-ink-faint opacity-0 hover:bg-line hover:text-ink focus-visible:opacity-100 group-hover:opacity-100">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto grid gap-0.5 pt-4">
        {cooking && <MiniPlayer card />}
        <button onClick={() => openLayer(routeHash({ tab: "learn" }))} className="flex h-11 items-center gap-3 rounded-xl px-3 text-body-sm hover:bg-sunken"><GraduationCap size={20} className="text-ink-soft" />Школа готовки</button>
        <button onClick={() => go("profile")} aria-current={route.tab === "profile" ? "page" : undefined}
          className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-body-sm", route.tab === "profile" ? "bg-brand-soft font-semibold text-brand-ink" : "hover:bg-sunken")}>
          <UserRound size={20} className={route.tab === "profile" ? "text-brand" : "text-ink-soft"} />Профиль
        </button>
      </div>
    </aside>
  );
}

/** The dish on the stove: one tap back into cooking mode, with the nearest timer. */
function MiniPlayer({ card }: { card?: boolean }) {
  const { s, profile } = useStore();
  const timers = useTimers();
  // The main dish, or the second one when the main is already done.
  const main = s.cooking && !s.cooking.done ? s.cooking : null;
  const second = profile.parallel ? recipeById(profile.parallel.recipeId) : null;
  const c = main ?? (second && profile.parallel ? { recipe: second, step: profile.parallel.step } : null);
  const t = c ? timers.find((x) => x.recipeId === c.recipe.id && !x.rang) ?? timers.find((x) => !x.rang) : undefined;
  useTick(!!t);
  if (!c) return null;
  const left = t ? secondsLeft(t) : null;
  const open = () => openLayer(routeHash({ cook: true }));
  const where = "шаг " + (c.step + 1) + " из " + c.recipe.steps.length;
  if (card)
    return (
      <button onClick={open} className="mb-2 flex items-center gap-3 rounded-input bg-ink p-3 text-left text-paper">
        <Flame size={20} className="shrink-0 text-brand-soft" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-small font-semibold">{c.recipe.title}</span>
          <span className="block text-caption opacity-80">{where}{left != null && " · " + mmss(left)}</span>
        </span>
      </button>
    );
  return (
    <button onClick={open} className="flex h-[52px] w-full items-center gap-3 bg-ink px-4 text-left text-paper">
      <Flame size={20} className="shrink-0 text-brand-soft" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-small"><b className="font-semibold">{c.recipe.title}</b> · {where}</span>
      {left != null && <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-small font-semibold tabular-nums">{mmss(left)}</span>}
      <span className="shrink-0 text-small font-semibold text-brand-soft">Вернуться</span>
    </button>
  );
}
