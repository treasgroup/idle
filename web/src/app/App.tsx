// The app shell: the bottom bar on phones, a rail on tablets, a sidebar on desktop.
// Five destinations: Главная · Поиск · Шеф · Избранное · Покупки (Шеф is the coloured one, level with the rest).
// Simple mode keeps three: Главная · Шеф · Избранное. Everything else lives in Профиль.
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarDays, ChefHat, ChevronLeft, Flame, GraduationCap, Heart, House, Refrigerator, Search, ShoppingCart, UserRound, WifiOff, X,
  type LucideIcon,
} from "lucide-react";
import { expiringSoon, recipeById, usePwa, type MyRecipe } from "../engine";
import { useStore } from "./store";
import { useActions } from "./actions";
import { AssistantProvider } from "./assistant";
import { close, openLayer, replace, routeHash, useRoute, type Route, type Tab } from "./router";
import { migrateOldTimer, secondsLeft, useTick, useTimerAlarm, useTimers } from "./timers";
import { Home } from "../screens/Home";
import { Recipes } from "../screens/Recipes";
import { ScreenSkeleton } from "../components/Skeleton";
import { lazyScreen, preload } from "./lazy";
import { useWakeLock } from "./wakeLock";
import { preloadMascots } from "../components/Mascot";

// Home and search come with the page; the rest loads when first opened (and quietly in the background).
const loadChat = () => import("../screens/Chat");
const loadRecipe = () => import("../screens/RecipeLayer");
const loadCooking = () => import("../screens/Cooking");
const loadExtras = () => import("../screens/Extras");
const Chat = lazyScreen(() => loadChat().then((m) => ({ default: m.Chat })));
const loadMenu = () => import("../screens/Menu");
const loadShopping = () => import("../screens/Shopping");
const loadPantry = () => import("../screens/Pantry");
const loadProfile = () => import("../screens/Profile");
const Menu = lazyScreen(() => loadMenu().then((m) => ({ default: m.Menu })));
const Shopping = lazyScreen(() => loadShopping().then((m) => ({ default: m.Shopping })));
const Pantry = lazyScreen(() => loadPantry().then((m) => ({ default: m.Pantry })));
const Profile = lazyScreen(() => loadProfile().then((m) => ({ default: m.Profile })));
const RecipeLayer = lazyScreen(() => loadRecipe().then((m) => ({ default: m.RecipeLayer })));
const CookingLayer = lazyScreen(() => loadCooking().then((m) => ({ default: m.CookingLayer })));
const DocLayer = lazyScreen(() => loadExtras().then((m) => ({ default: m.DocLayer })));
const Learn = lazyScreen(() => loadExtras().then((m) => ({ default: m.Learn })));
const Onboarding = lazyScreen(() => loadExtras().then((m) => ({ default: m.Onboarding })));
const PollSheet = lazyScreen(() => loadExtras().then((m) => ({ default: m.PollSheet })));
const IncomingRecipe = lazyScreen(() => import("../components/FamilyBook").then((m) => ({ default: m.IncomingRecipe })));
import { Boundary, Logo, Toast, cx, haptic, mmss, useScrolled } from "../components/ui";
import { useUpdateCheck } from "./updates";

const NAV: { tab: Tab; label: string; icon: LucideIcon; simple?: boolean }[] = [
  { tab: "home", label: "Главная", icon: House, simple: true },
  { tab: "recipes", label: "Поиск", icon: Search },
  { tab: "chat", label: "Шеф", icon: ChefHat, simple: true },
  { tab: "favorites", label: "Избранное", icon: Heart, simple: true },
  { tab: "shopping", label: "Покупки", icon: ShoppingCart },
];
const useNav = () => {
  const { profile } = useStore();
  return profile.simple ? NAV.filter((n) => n.simple) : NAV;
};
/** Screens opened from Профиль: their header leads back there. */
const FROM_PROFILE: Tab[] = ["menu", "pantry"];

// The address the page was opened with (the links below are removed from it once handled).
const OPENED_WITH = new URLSearchParams(location.search);

/** Links from the old site and from shared messages: ?recipe=, ?tab=, #poll=, #family=, #login=, #privacy. */
function useIncomingLinks(onPoll: (t: string) => void, onBook: (r: Partial<MyRecipe>) => void) {
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
    const book = h.match(/^#book=([jz][A-Za-z0-9_-]{10,})$/);
    if (book) { clean(); void import("./myRecipes").then((m) => m.readLink(book[1])).then((r) => (r ? onBook(r) : toast("Ссылка на рецепт повреждена — попросите прислать её ещё раз"))); }
    if (poll) { clean(); onPoll(poll[1]); }
    else if (family) { clean(); sync.join(family[1]).then(() => toast("Вы в семье: план и покупки теперь общие")).catch((e: Error) => toast(e.message)); }
    else if (login) { clean(); sync.login(login[1]).then(() => toast("Готово — данные объединены")).catch((e: Error) => toast(e.message)); }
    else if (doc) { replace(routeHash({ doc: doc[1] })); }
    const tab = q.get("tab");
    const recipe = q.get("recipe");
    if (tab || recipe) history.replaceState(null, "", location.pathname + location.hash);
    if (tab === "shopping" || tab === "menu" || tab === "recipes" || tab === "pantry" || tab === "favorites" || tab === "chat") replace(routeHash({ tab: tab as Tab }));
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
  const [incoming, setIncoming] = useState<Partial<MyRecipe> | null>(null);
  useIncomingLinks(setPoll, setIncoming);
  useTimerAlarm(toast, s.readAloud);
  // The screen stays on while something is on the stove or a timer is counting.
  const anyTimer = useTimers().some((t) => !!t.end && !t.rang);
  useWakeLock((!!s.cooking && !s.cooking.done) || !!profile.parallel || anyTimer);
  useUpdateCheck(toast);
  useEffect(() => {
    if (!ready) return;
    if (!profile.setUp && s.onboarding === "new" && !OPENED_WITH.has("recipe") && !location.hash.startsWith("#poll=") && !location.hash.startsWith("#book=")) setOnboarding(true);
    const c = s.cooking;
    migrateOldTimer([
      ...(c ? [{ title: c.recipe.title, recipeId: c.recipe.id, end: c.timerEnd, step: c.timerStep }] : []),
      ...(profile.parallel ? [{ title: "Второе блюдо", recipeId: profile.parallel.recipeId, end: profile.parallel.timerEnd, step: profile.parallel.step }] : []),
    ]);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0); }, [route.tab]);
  // The other screens are fetched quietly once the first one is on screen — then they open at once, and work
  // without the internet later (the shopping list in the shop).
  useEffect(() => { if (ready) preload([loadRecipe, loadChat, loadCooking, loadShopping, loadMenu, loadPantry, loadProfile, loadExtras, preloadMascots]); }, [ready]);

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
  // Tapping the current tab again scrolls it back to the top, as in phone apps.
  const go = (tab: Tab) => {
    clearToast();
    haptic();
    if (route.tab === tab && !route.recipe) return window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    replace(routeHash({ tab }));
  };

  const screen = {
    home: <Home pwa={pwa} />, chat: <Chat />, recipes: <Recipes />, favorites: <Recipes mode="favorites" />, menu: <Menu />,
    shopping: <Shopping />, pantry: <Pantry />, profile: <Profile pwa={pwa} />, learn: <Home pwa={pwa} />,
  }[route.tab];

  return (
    <div className="min-h-screen">
      <Sidebar route={route} go={go} />
      <Rail route={route} go={go} />
      {!chat && route.tab !== "home" && <Header route={route} go={go} />}

      <main className={cx("sm:pl-20 lg:pl-64", !chat && "pb-[calc(var(--nav-h)+2rem)]")}>
        {chat ? (
          <Boundary resetKey="chat"><Suspense fallback={<div className="min-h-[100dvh]" />}>{screen}</Suspense></Boundary>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:px-6 sm:pt-4 lg:max-w-[1200px] lg:px-8 lg:pt-8">
            <Boundary resetKey={route.tab}>
              <Suspense fallback={<ScreenSkeleton />}>{ready ? screen : <ScreenSkeleton home={route.tab === "home"} />}</Suspense>
            </Boundary>
          </div>
        )}
      </main>

      <div ref={bottom} className="fixed inset-x-0 bottom-0 z-30 sm:left-20 lg:hidden">
        {cookingNow && !layer && !chat && !keyboard && <MiniPlayer />}
        {!layer && !keyboard && <BottomNav route={route} go={go} />}
      </div>

      {/* Школа first: a recipe opened from a lesson lies over it, and «Назад» returns to the same lesson. */}
      <Suspense fallback={route.tab === "learn" && !route.recipe ? <LayerSkeleton /> : null}>
        {route.tab === "learn" && <Learn onClose={closeTop} />}
      </Suspense>
      <Boundary resetKey={(route.recipe ?? "") + route.cook}>
        <Suspense fallback={<LayerSkeleton />}>
          {route.recipe && <RecipeLayer id={route.recipe} onClose={closeRecipe} />}
          {route.cook && <CookingLayer onClose={closeTop} />}
        </Suspense>
      </Boundary>
      <Suspense fallback={route.doc ? <LayerSkeleton /> : null}>
        {route.doc && <DocLayer doc={route.doc} onClose={closeTop} />}
        {poll && <PollSheet token={poll} onClose={() => setPoll(null)} />}
        {onboarding && <Onboarding onDone={() => setOnboarding(false)} />}
        {incoming && <IncomingRecipe data={incoming} onClose={() => setIncoming(null)} />}
      </Suspense>
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

/** The icon of a destination; Шеф is a coloured circle of the same size as the other icons. */
function NavIcon({ tab, icon: Icon, on, size = 24 }: { tab: Tab; icon: LucideIcon; on: boolean; size?: number }) {
  if (tab === "chat")
    return <span className="grid place-items-center rounded-full bg-brand-fill text-white" style={{ width: size + 6, height: size + 6 }}><ChefHat size={size - 6} strokeWidth={2.25} /></span>;
  return <Icon size={size} strokeWidth={on ? 2.25 : 1.75} className={on ? "text-brand" : "text-ink-soft"} />;
}

/** Phones: the bottom bar; every item is an icon with a word under it. */
function BottomNav({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const badges = useBadges();
  const nav = useNav();
  const { profile } = useStore();
  return (
    <nav className="pb-safe border-t border-line bg-paper sm:hidden" aria-label="Разделы">
      <div className="flex">
        {nav.map(({ tab, label, icon }) => {
          const on = route.tab === tab;
          return (
            <button key={tab} onClick={() => go(tab)} aria-current={on ? "page" : undefined}
              className={cx("relative flex flex-1 flex-col items-center justify-center gap-1", profile.simple ? "h-[4.5rem]" : "h-16")}>
              <span className={cx("grid h-8 w-14 place-items-center rounded-full transition-colors", on && "bg-brand-soft")}>
                <NavIcon tab={tab} icon={icon} on={on} size={profile.simple ? 26 : 24} />
              </span>
              <span className={cx(profile.simple ? "text-small" : "text-micro", on || tab === "chat" ? "font-semibold text-brand" : "text-ink-soft")}>{label}</span>
              {tab === "shopping" && <Badge n={badges.shopping} className="absolute left-1/2 top-1.5 ml-2" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Phones and tablets: the name on the left (or «Назад» on screens opened from Профиль), the profile on the right. */
function Header({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const { online } = useStore();
  const scrolled = useScrolled();
  const sub = FROM_PROFILE.includes(route.tab) || route.tab === "profile";
  return (
    <header className={cx("pt-safe sticky top-0 z-30 border-b bg-paper transition-colors lg:hidden", scrolled ? "border-line" : "border-transparent", "sm:ml-20")}>
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
        {sub ? (
          <button className="-ml-2 inline-flex h-11 items-center gap-0.5 rounded-full pl-1 pr-3 text-body font-medium hover:bg-sunken"
            onClick={() => close(routeHash({ tab: route.tab === "profile" ? "home" : "profile" }))}>
            <ChevronLeft size={24} aria-hidden />Назад
          </button>
        ) : (
          <button className="-ml-1 flex items-center gap-2.5 rounded-full pr-2" onClick={() => go("home")} aria-label="На главную">
            <Logo size={30} />
            <span className="text-title">Что приготовить?</span>
          </button>
        )}
        <span className="flex-1" />
        {!online && <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-sunken px-2.5 text-caption text-ink-soft" title="Нет интернета: рецепты, план и покупки работают"><WifiOff size={14} aria-hidden />офлайн</span>}
        {route.tab !== "profile" && <ProfileButton className="-mr-1.5 sm:hidden" />}
      </div>
    </header>
  );
}

/** The round profile button (top right on phones). */
export function ProfileButton({ className }: { className?: string }) {
  const { s } = useStore();
  const soon = expiringSoon(s.fridge).length;
  return (
    <button className={cx("relative grid h-11 w-11 shrink-0 place-items-center rounded-full", className)} onClick={() => openLayer(routeHash({ tab: "profile" }))} aria-label="Профиль и ещё">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-sunken text-ink-soft"><UserRound size={20} /></span>
      {soon > 0 && <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-paper bg-warn" aria-label="Есть продукты, которые пора использовать" />}
    </button>
  );
}

/** Tablets: a narrow rail with the same destinations. */
function Rail({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const badges = useBadges();
  const nav = useNav();
  return (
    <nav className="pt-safe fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-1 border-r border-line bg-paper pb-4 pt-4 sm:flex lg:hidden" aria-label="Разделы">
      <button className="mb-3" onClick={() => go("home")} aria-label="На главную"><Logo size={40} /></button>
      {nav.map(({ tab, label, icon }) => {
        const on = route.tab === tab;
        return (
          <button key={tab} onClick={() => go(tab)} aria-current={on ? "page" : undefined} className="relative flex h-16 w-full flex-col items-center justify-center gap-1">
            <span className={cx("grid h-8 w-14 place-items-center rounded-full", on && "bg-brand-soft")}><NavIcon tab={tab} icon={icon} on={on} size={22} /></span>
            <span className={cx("text-micro", on || tab === "chat" ? "font-semibold text-brand" : "text-ink-soft")}>{label}</span>
            {tab === "shopping" && <Badge n={badges.shopping} className="absolute right-3 top-1" />}
          </button>
        );
      })}
      <span className="flex-1" />
      <button onClick={() => go("profile")} aria-label="Профиль и ещё" aria-current={route.tab === "profile" ? "page" : undefined} className="grid h-11 w-11 place-items-center rounded-full">
        <span className={cx("grid h-9 w-9 place-items-center rounded-full", route.tab === "profile" ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink-soft")}><UserRound size={18} /></span>
      </button>
    </nav>
  );
}

/** Desktop: logo, destinations, the week plan and products, recent conversations, the dish on the stove, Школа, Профиль. */
function Sidebar({ route, go }: { route: Route; go: (t: Tab) => void }) {
  const { s, profile } = useStore();
  const badges = useBadges();
  const nav = useNav();
  const cooking = (!!(s.cooking && !s.cooking.done) || !!profile.parallel) && !route.cook;
  const rowCls = (on: boolean) => cx("flex h-11 items-center gap-3 rounded-xl px-3 text-body-sm transition-colors", on ? "bg-brand-soft font-semibold text-brand-ink" : "text-ink hover:bg-sunken");
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper px-3 pb-4 pt-5 lg:flex" aria-label="Меню сайта">
      <button className="flex items-center gap-2.5 rounded-input px-2 py-1 text-left" onClick={() => go("home")}>
        <Logo size={32} />
        <span className="text-title leading-tight">Что приготовить?</span>
      </button>
      <nav className="mt-6 grid gap-0.5" aria-label="Разделы">
        {nav.map(({ tab, label, icon }) => {
          const on = route.tab === tab;
          return (
            <button key={tab} onClick={() => go(tab)} aria-current={on ? "page" : undefined} className={rowCls(on)}>
              <NavIcon tab={tab} icon={icon} on={on} size={20} />
              <span className="flex-1 text-left">{label}</span>
              {tab === "shopping" && <Badge n={badges.shopping} />}
            </button>
          );
        })}
        {!profile.simple && (
          <>
            <span className="mx-3 my-2 h-px bg-line" aria-hidden />
            <button onClick={() => go("menu")} aria-current={route.tab === "menu" ? "page" : undefined} className={rowCls(route.tab === "menu")}>
              <CalendarDays size={20} className="text-ink-soft" />
              <span className="flex-1 text-left">План на неделю</span>
            </button>
            <button onClick={() => go("pantry")} aria-current={route.tab === "pantry" ? "page" : undefined} className={rowCls(route.tab === "pantry")}>
              <Refrigerator size={20} className="text-ink-soft" />
              <span className="flex-1 text-left">Мои продукты</span>
              <Badge n={badges.pantry} warn />
            </button>
          </>
        )}
      </nav>
      <div className="mt-auto grid gap-0.5 pt-4">
        {cooking && <MiniPlayer card />}
        <button onClick={() => openLayer(routeHash({ tab: "learn" }))} aria-current={route.tab === "learn" ? "page" : undefined} className={rowCls(route.tab === "learn")}><GraduationCap size={20} className={route.tab === "learn" ? "text-brand" : "text-ink-soft"} />Школа готовки</button>
        <button onClick={() => go("profile")} aria-current={route.tab === "profile" ? "page" : undefined} className={rowCls(route.tab === "profile")}>
          <UserRound size={20} className={route.tab === "profile" ? "text-brand" : "text-ink-soft"} />Профиль
        </button>
      </div>
    </aside>
  );
}

/** While a page-over-the-page (recipe, cooking, school) is still loading: its shape in grey. */
function LayerSkeleton() {
  return (
    <div className="fixed inset-0 z-40 bg-paper lg:left-64" role="status" aria-label="Загрузка">
      <div className="mx-auto max-w-3xl px-4 pt-[calc(env(safe-area-inset-top)+4rem)]">
        <span className="skeleton block aspect-[4/3] w-full rounded-card" />
        <span className="skeleton mt-5 block h-8 w-3/4" />
        <span className="skeleton mt-3 block h-4 w-full" />
        <span className="skeleton mt-2 block h-4 w-5/6" />
      </div>
    </div>
  );
}

/** The dish on the stove: one tap back into cooking mode, with the nearest timer. */
function MiniPlayer({ card }: { card?: boolean }) {
  const { s, profile } = useStore();
  const { stopCooking } = useActions();
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
      <div className="mb-2 flex items-center rounded-input bg-brand-soft text-ink">
        <button onClick={open} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
          <Flame size={20} className="shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-medium">{c.recipe.title}</span>
            <span className="block text-caption text-ink-soft">{where}{left != null && " · " + mmss(left)}</span>
          </span>
        </button>
        <button onClick={() => stopCooking()} className="mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white/50 hover:text-ink" aria-label="Прекратить готовку"><X size={18} /></button>
      </div>
    );
  return (
    // Light, so that a toast (dark) above it never merges with it into one heavy block.
    <div className="flex h-[52px] w-full items-center border-t border-brand/20 bg-brand-soft text-ink">
      <button onClick={open} className="flex h-full min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left">
        <Flame size={20} className="shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-small"><b className="font-medium">{c.recipe.title}</b> · {where}</span>
        {left != null && <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-small font-medium tabular-nums">{mmss(left)}</span>}
        <span className="shrink-0 text-small font-medium text-brand-ink">Вернуться</span>
      </button>
      {/* Changed one's mind: the bar can always be closed (with «Отменить»). */}
      <button onClick={() => stopCooking()} className="grid h-full w-12 shrink-0 place-items-center border-l border-brand/15 text-ink-soft hover:text-ink" aria-label="Прекратить готовку"><X size={20} /></button>
    </div>
  );
}
