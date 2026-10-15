// Главная (#/): a feed of food, like a streaming app — the recipe of the day, «Решите за меня», collections that
// scroll sideways, and Шеф as a helper one tap away. Simple mode shows only the voice question and big ideas.
import { useMemo, useState } from "react";
import { ChevronRight, ShoppingCart, GraduationCap, Flame, Clock, X, Shuffle, Mic, Repeat2, ChefHat } from "lucide-react";
import {
  courseOf, dateKey, expiryLabel, expiringSoon, formatMinutes, freshConditions, plural, rankRecipes, recipeById, recipes, shortName,
  type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { goalConditions } from "../app/profile";
import { seasonalCollection } from "../app/seasonal";
import { openLayer, openRecipesView, replace, routeHash } from "../app/router";
import { TimerStrip } from "../components/TimerStrip";
import { useTimers } from "../app/timers";
import { DecideSheet } from "../components/Decide";
import { RecipeImage, RecipeMini, RecipeRow, RecipeTile } from "../components/RecipeCard";
import { ChefAvatar, ScrollRow, Section, cx } from "../components/ui";
import { ProfileButton } from "../app/App";
import { LESSONS } from "./learn-data";
import type { Pwa } from "./Profile";

const greeting = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : h < 23 ? "Добрый вечер" : "Доброй ночи";
};
export const mealNow = (): "breakfast" | "lunch" | "dinner" => {
  const h = new Date().getHours();
  return h >= 5 && h < 11 ? "breakfast" : h < 16 ? "lunch" : "dinner";
};
const MEAL_WORD = { breakfast: "на завтрак", lunch: "на обед", dinner: "на ужин" };
const DIFF: Record<string, string> = { easy: "Просто", medium: "Средне", hard: "Сложно" };
const people = (n: number) => n + " " + plural(n, "человека", "человека", "человек");

/** Dishes that suit the person (goals, level, kids) and the meal; stable for the day. */
function useSuitable() {
  const { s, profile, catalog } = useStore();
  return useMemo(() => {
    const c = goalConditions(profile, { ...freshConditions({ servings: profile.eaters, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), servings: profile.eaters });
    if (profile.level === "beginner" && c.maxMinutes == null) c.maxMinutes = 45;
    return rankRecipes(recipes(), c, s.preferences, 300, { meal: mealNow() }).map((m) => m.recipe)
      .filter((r) => profile.level !== "beginner" || r.difficulty !== "hard");
  }, [s.preferences, profile, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The same «recipe of the day» all day long, a new one tomorrow. */
function dayPick<T>(list: T[], salt = 0): T | null {
  if (!list.length) return null;
  const d = new Date();
  const n = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate() + salt;
  return list[(n * 7919) % Math.min(list.length, 25)];
}

export function Home({ pwa }: { pwa?: Pwa }) {
  const { profile } = useStore();
  const { openRecipe } = useActions();
  const [decide, setDecide] = useState(false);
  const all = useSuitable();
  const meal = mealNow();
  const today = dayPick(all.filter((r) => ["main", "soup"].includes(courseOf(r)) || meal === "breakfast"));
  const season = seasonalCollection();

  if (profile.simple) return <SimpleHome today={today} />;

  const quick = all.filter((r) => r.totalMinutes <= 30 && r.id !== today?.id).slice(0, 10);
  const soups = recipes().filter((r) => courseOf(r) === "soup").sort((a, b) => a.totalMinutes - b.totalMinutes).slice(0, 10);
  const kids = all.filter((r) => r.kids === true && r.id !== today?.id).slice(0, 10);
  const seasonal = season ? recipes().filter(season.test).slice(0, 10) : [];

  return (
    <div className="pb-4">
      <div className="flex items-start justify-between gap-3 pt-3 sm:pt-6">
        <div>
          <p className="text-body-sm font-medium text-brand">{greeting()}!</p>
          <h1 className="mt-1 text-h1 sm:text-display">Что приготовим {MEAL_WORD[meal]}?</h1>
        </div>
        <ProfileButton className="-mr-1.5 lg:hidden" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {today && <TodayCard r={today} onOpen={() => openRecipe(today)} />}
        <div className="grid content-start gap-3">
          <RepeatCard />
          <button onClick={() => setDecide(true)} className="flex min-h-[64px] items-center gap-3 rounded-card border border-line bg-card px-4 py-3 text-left transition-transform active:scale-[.99]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-brand" aria-hidden><Shuffle size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">Решите за меня</span>
              <span className="block text-small text-ink-soft">Покажу одно блюдо — не понравится, покажу другое</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-ink-soft" aria-hidden />
          </button>
          <button onClick={() => replace(routeHash({ tab: "chat" }))} className="flex min-h-[64px] items-center gap-3 rounded-card bg-brand-soft px-4 py-3 text-left transition-transform active:scale-[.99]">
            <ChefAvatar size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">Не знаете, что приготовить?</span>
              <span className="block text-small text-ink-soft">Спросите Шефа — подберёт за минуту</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-brand" aria-hidden />
          </button>
        </div>
      </div>
      {pwa && <InstallCard pwa={pwa} />}

      <Now />
      <Rescue />
      {season && seasonal.length >= 4 && <Shelf title={season.title} hint={season.hint} list={seasonal} />}
      {quick.length >= 4 && <Shelf title={"Быстро " + MEAL_WORD[meal]} hint="До 30 минут" list={quick} all={() => openRecipesView("time:30")} />}
      <Shelf title="Супы" list={soups} all={() => openRecipesView("dish:soup")} />
      {(profile.kids || profile.goals.includes("family")) && kids.length >= 4 && <Shelf title="Детям нравится" list={kids} all={() => openRecipesView("filter:kids")} />}
      <Saved />
      <CourseCard />
      <DecideSheet open={decide} onClose={() => setDecide(false)} meal={meal} />
    </div>
  );
}

/** The recipe of the day: a big card with one action. */
function TodayCard({ r, onOpen }: { r: Recipe; onOpen: () => void }) {
  const { profile } = useStore();
  return (
    <article className="overflow-hidden rounded-card border border-line bg-card">
      <button className="relative block w-full text-left" onClick={onOpen} aria-label={"Рецепт дня: " + r.title}>
        <RecipeImage recipe={r} className="aspect-[16/10] w-full" rounded="rounded-none" eager />
        <span className="absolute left-3 top-3 rounded-full bg-card/95 px-3 py-1 text-small font-medium">Рецепт дня</span>
      </button>
      <div className="p-4">
        <h2 className="text-h2">{r.title}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-body-sm text-ink-soft">
          <Clock size={16} aria-hidden />{formatMinutes(r.totalMinutes)}<span aria-hidden>·</span>{DIFF[r.difficulty]}<span aria-hidden>·</span>на {people(profile.eaters)}
        </p>
        <button className="btn-primary btn-bar mt-4 w-full" onClick={onOpen}><ChefHat size={20} />Готовить</button>
      </div>
    </article>
  );
}

/** «Неделю назад вы готовили котлеты — повторить?»: a dish the person liked or saved, cooked 5+ days ago. */
function RepeatCard() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const pick = useMemo(() => {
    const liked = new Set([...(s.taste.liked ?? []), ...s.favorites.map((f) => f.id)]);
    const old = [...s.book].reverse().find((b) => liked.has(b.recipeId) && Date.now() - b.at > 5 * 864e5);
    return old ? { r: recipeById(old.recipeId), at: old.at } : null;
  }, [s.book, s.taste, s.favorites]);
  if (!pick?.r) return null;
  const ago = Math.round((Date.now() - pick.at) / 864e5);
  const when = ago < 10 ? "Неделю назад" : ago < 25 ? "Пару недель назад" : "Недавно";
  return (
    <button onClick={() => openRecipe(pick.r!)} className="flex min-h-[64px] items-center gap-3 rounded-card border border-line bg-card p-2 pr-4 text-left transition-transform active:scale-[.99]">
      <RecipeImage recipe={pick.r} className="h-14 w-14 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-small text-ink-soft">{when} вы готовили</span>
        <span className="block truncate text-body font-medium">{pick.r.title}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-small font-medium text-brand"><Repeat2 size={18} aria-hidden />Повторить</span>
    </button>
  );
}

/** A collection that scrolls sideways, like a shelf in a streaming app. */
function Shelf({ title, hint, list, all }: { title: string; hint?: string; list: Recipe[]; all?: () => void }) {
  const { openRecipe } = useActions();
  if (!list.length) return null;
  return (
    <Section title={title} action={all ? "Все" : undefined} onAction={all}>
      {hint && <p className="-mt-2 mb-3 text-small text-ink-soft">{hint}</p>}
      <ScrollRow label={title}>
        {list.map((r) => <RecipeTile key={r.id} recipe={r} onOpen={() => openRecipe(r)} className="w-[168px] shrink-0 snap-start sm:w-[200px]" />)}
      </ScrollRow>
    </Section>
  );
}

/** Simple mode: a greeting, one big voice button, two big ideas. */
function SimpleHome({ today }: { today: Recipe | null }) {
  const { openRecipe } = useActions();
  const a = useAssistant();
  const all = useSuitable();
  const second = dayPick(all.filter((r) => r.id !== today?.id && r.difficulty === "easy"), 3);
  const ideas = [today, second].filter((r): r is Recipe => !!r);
  return (
    <div className="pb-4">
      <div className="flex items-start justify-between gap-3 pt-3">
        <h1 className="text-display">{greeting()}!</h1>
        <ProfileButton className="-mr-1.5 lg:hidden" />
      </div>
      <button onClick={() => { a.newChat(); goChat(true); }} className="mt-5 flex w-full items-center gap-4 rounded-card bg-brand-soft p-4 text-left">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-fill text-white" aria-hidden><Mic size={30} /></span>
        <span>
          <span className="block text-h2">Спросить Шефа</span>
          <span className="block text-body text-ink-soft">«Что сварить из курицы?»</span>
        </span>
      </button>
      <h2 className="mt-8 text-h2">Идеи на сегодня</h2>
      <div className="mt-3 grid gap-4">
        {ideas.map((r) => (
          <button key={r.id} onClick={() => openRecipe(r)} className="overflow-hidden rounded-card border border-line bg-card text-left">
            <RecipeImage recipe={r} className="aspect-[16/9] w-full" rounded="rounded-none" />
            <span className="block px-4 pb-4 pt-3">
              <span className="block text-h2">{r.title}</span>
              <span className="block text-body text-ink-soft">{formatMinutes(r.totalMinutes)} · {DIFF[r.difficulty].toLowerCase()}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Now({ rail }: { rail?: boolean }) {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const today = dateKey(new Date());
  const menu = (s.menu.find((d) => d.date === today)?.items ?? []).map((i) => ({ i, r: recipeById(i.recipeId) })).filter((x): x is { i: typeof x.i; r: Recipe } => !!x.r);
  const toBuy = s.shopping.filter((i) => !i.checked).length;
  const cooking = s.cooking && !s.cooking.done ? s.cooking : null;
  const timers = useTimers().length;
  // On phones and tablets the dish on the stove is in the bar above the nav.
  if (!(cooking && rail) && !menu.length && !toBuy && !timers) return null;
  const rows = (
    <div className={cx("grid grid-cols-[minmax(0,1fr)] gap-2", rail && "gap-1")}>
      {timers > 0 && <TimerStrip flush={rail} />}
      {cooking && rail && (
        <button onClick={() => openLayer(routeHash({ cook: true }))} className="flex min-h-[56px] items-center gap-3 rounded-input bg-ink px-3 text-left text-paper">
          <Flame size={20} className="shrink-0 text-brand-soft" aria-hidden />
          <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-semibold">{cooking.recipe.title}</span><span className="block text-caption opacity-80">Готовите · шаг {cooking.step + 1} из {cooking.recipe.steps.length}</span></span>
          <span className="text-small font-semibold text-brand-soft">Вернуться</span>
        </button>
      )}
      {menu.map(({ i, r }) => rail
        ? <RecipeMini key={r.id + i.servings} recipe={r} note={i.leftover ? "Только разогреть" : "По меню · " + i.servings + " порц."} onOpen={() => openRecipe(r)} />
        : <RecipeRow key={r.id + i.servings} recipe={r} note={i.leftover ? "Приготовлено вчера — только разогреть" : "По меню на сегодня · " + i.servings + " порц."} onOpen={() => openRecipe(r)} />)}
      {toBuy > 0 && (
        <button onClick={() => replace(routeHash({ tab: "shopping" }))} className="flex min-h-[52px] items-center gap-3 rounded-input border border-line bg-card px-3 text-left hover:border-line-strong/60">
          <ShoppingCart size={20} className="shrink-0 text-brand" aria-hidden />
          <span className="flex-1 text-body-sm">В покупках: <b>{toBuy}</b></span>
          <ChevronRight size={18} className="text-ink-faint" aria-hidden />
        </button>
      )}
    </div>
  );
  return <Section title="Сейчас">{rows}</Section>;
}

/** Perishables that run out today or tomorrow, and what to cook with them. */
function Rescue() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const a = useAssistant();
  const soon = useMemo(() => expiringSoon(s.fridge), [s.fridge]);
  const ideas = useMemo(() => {
    if (!soon.length) return [] as Recipe[];
    const out: Recipe[] = [];
    for (const item of soon.slice(0, 3)) {
      const c = { ...freshConditions({ servings: s.conditions.servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), desired: [item.id], available: s.fridge.map((f) => f.id) };
      for (const m of rankRecipes(recipes(), c, s.preferences, 3)) if (!out.some((r) => r.id === m.recipe.id)) out.push(m.recipe);
    }
    return out.slice(0, 4);
  }, [soon, s.fridge, s.conditions.servings, s.preferences]);
  if (!soon.length) return null;
  const more = () => { void a.ask("что приготовить из " + soon.slice(0, 2).map((f) => shortName(f.id).toLowerCase()).join(" и "), { fresh: true, source: "rescue" }); goChat(); };
  const strip = (
    <div className="flex items-start gap-2 rounded-input bg-warn-soft px-3 py-2.5 text-small text-ink">
      <Clock size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
      <span>{soon.slice(0, 4).map((f, i) => <span key={f.id}>{i > 0 && ", "}{shortName(f.id)} — <b className="font-semibold">{expiryLabel(f)}</b></span>)}</span>
    </div>
  );

  return (
    <Section title="Спасите продукты" action="Ещё варианты" onAction={more}>
      {strip}
      {ideas.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3">{ideas.slice(0, 2).map((r) => <RecipeTile key={r.id} recipe={r} onOpen={() => openRecipe(r)} />)}</div>}
    </Section>
  );
}


// Browsing without a question: the catalog by kind of dish, as on any big recipe site.
export const SECTIONS: { view: string; label: string; emoji: string; tint: string }[] = [
  { view: "dish:soup", label: "Супы", emoji: "🍲", tint: "#F8E4C8" },
  { view: "dish:main", label: "Вторые блюда", emoji: "🍗", tint: "#F6DDD2" },
  { view: "dish:salad", label: "Салаты", emoji: "🥗", tint: "#E3EFD5" },
  { view: "dish:breakfast", label: "Завтраки", emoji: "🍳", tint: "#FAEDC2" },
  { view: "dish:baking", label: "Выпечка", emoji: "🥧", tint: "#F5E6CC" },
  { view: "dish:sweet", label: "Сладкое", emoji: "🍰", tint: "#F8E0E5" },
  { view: "time:30", label: "До 30 минут", emoji: "⏱️", tint: "#E6E9F4" },
  { view: "filter:kids", label: "Детям", emoji: "🧸", tint: "#F3E6F2" },
  { view: "filter:veg", label: "Без мяса", emoji: "🥦", tint: "#DFEFE3" },
];

export function Sections() {
  return (
    <Section title="Рецепты по разделам" action="Все рецепты" onAction={() => replace(routeHash({ tab: "recipes" }))}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))]">
        {SECTIONS.map((x) => (
          <button key={x.view} onClick={() => openRecipesView(x.view)}
            className="flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-input border border-line bg-card p-2 text-center transition-[border-color,transform] duration-150 hover:border-line-strong/60 active:scale-[.97]">
            <span className="grid h-11 w-11 place-items-center rounded-full text-2xl leading-none dark:!bg-sunken" style={{ background: x.tint }} aria-hidden>{x.emoji}</span>
            <span className="text-small font-semibold leading-tight">{x.label}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function CourseCard({ rail }: { rail?: boolean }) {
  const { profile } = useStore();
  const next = LESSONS.find((l) => !profile.lessonsDone.includes(l.id));
  if (!next || (profile.level !== "beginner" && !rail)) return null;
  if (rail && profile.level !== "beginner" && profile.lessonsDone.length === 0) return null;
  return (
    <div className={rail ? "pt-2" : "mt-8"}>
      <button onClick={() => openLayer(routeHash({ tab: "learn" }))} className="flex w-full items-center gap-3 rounded-card bg-herb-soft p-4 text-left">
        <GraduationCap className="shrink-0 text-herb" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-caption font-semibold text-herb">Школа готовки · урок {LESSONS.indexOf(next) + 1} из {LESSONS.length}</span>
          <span className="block text-body-sm font-semibold">{next.title}</span>
        </span>
        <ChevronRight size={18} className="text-herb" aria-hidden />
      </button>
    </div>
  );
}

function Saved() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const list = s.favorites.length ? s.favorites.slice(0, 10) : s.recent.slice(0, 10);
  if (!list.length) return null;
  return (
    <Section title={s.favorites.length ? "Сохранённое" : "Недавно смотрели"} action={s.favorites.length ? "Все" : undefined} onAction={() => openRecipesView("saved")}>
      <ScrollRow label={s.favorites.length ? "Сохранённое" : "Недавно смотрели"}>
        {list.map((r) => { const fresh = recipeById(r.id) ?? r; return <RecipeTile key={r.id} recipe={fresh} onOpen={() => openRecipe(fresh)} className="w-[200px] shrink-0 snap-start" />; })}
      </ScrollRow>
    </Section>
  );
}


/** Phones, from the second visit: «put Шеф on the home screen» — once, and it can be dismissed. */
function InstallCard({ pwa }: { pwa: Pwa }) {
  const { s, update, toast } = useStore();
  const [visits] = useState(() => {
    try { const n = Number(localStorage.getItem("cook-visits") || 0) + 1; localStorage.setItem("cook-visits", String(n)); return n; } catch { return 0; }
  });
  const phone = typeof matchMedia !== "undefined" && matchMedia("(max-width: 1023px)").matches;
  if (!phone || pwa.installed || s.installDismissed || visits < 2 || !(pwa.canInstall || pwa.ios)) return null;
  const close = () => update((st) => ({ ...st, installDismissed: true }));
  return (
    <section className="mt-5 flex items-center gap-3 rounded-card border border-line bg-card p-3 pr-2 shadow-e1" aria-label="Установить приложение">
      <img src="icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-input" />
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold">Шеф на экране телефона</span>
        <span className="block text-caption text-ink-soft">Открывается как приложение и работает без интернета</span>
      </span>
      <button className="btn-soft h-10 shrink-0 px-4" onClick={() => {
        if (pwa.canInstall) void pwa.install().then((ok) => { if (ok) close(); });
        else toast("В Safari нажмите «Поделиться», затем «На экран Домой»");
      }}>Добавить</button>
      <button className="icon-btn shrink-0 text-ink-soft" onClick={close} aria-label="Не показывать"><X size={18} /></button>
    </section>
  );
}
