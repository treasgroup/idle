// Шеф home (#/): the assistant first — a big question, the message box, example requests; then what is going on today.
// Anything sent from here starts a new conversation and opens it (#/chat).
import { useMemo, useState } from "react";
import { ChevronRight, CalendarDays, ShoppingCart, GraduationCap, Flame, MessageCircle, Clock, Refrigerator, Smile, X } from "lucide-react";
import {
  DEFAULT_PREFERENCES, LABELS, conditionLabel, dateKey, expiryLabel, expiringSoon, freshConditions, rankRecipes, recipeById, recipes, resultNote,
  shortName, type Conditions, type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { CHAT_FRESH_MS, lastChatAt } from "../app/chats";
import { GOALS, goalConditions, type Goal } from "../app/profile";
import { openLayer, openRecipesView, replace, routeHash } from "../app/router";
import { Composer } from "../components/Composer";
import { TimerStrip } from "../components/TimerStrip";
import { useTimers } from "../app/timers";
import { MoodTiles, SuggestionCards, useSuggestions } from "../components/ChatParts";
import { RecipeMini, RecipeRow, RecipeTile } from "../components/RecipeCard";
import { Chip, ScrollRow, Section, cx } from "../components/ui";
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

export function Home({ pwa }: { pwa?: Pwa }) {
  const { s, profile } = useStore();
  const a = useAssistant();
  const send = (text: string, opts: { voice?: boolean; shown?: string; source?: string } = {}) => {
    void a.ask(text, { ...opts, fresh: true });
    goChat();
  };
  const show = (label: string, c: Partial<Conditions>, intro: string) => {
    a.show(label, { ...a.base(), ...c }, intro, { fresh: true });
    goChat();
  };
  const fromPantry = () => {
    const ids = s.fridge.map((f) => f.id);
    show("Из того, что дома", { available: ids, strictPantry: ids.length >= 4 }, "Из того, что есть, можно приготовить:");
  };
  const suggestions = useSuggestions((t) => send(t), fromPantry);

  const CHIPS: { goal?: Goal; label: string; run: () => void }[] = [
    { goal: "quick", label: "До 20 минут", run: () => show("До 20 минут", { maxMinutes: 20 }, "Успеете за 20 минут:") },
    { label: "Удиви меня", run: () => send("удиви меня", { source: "option", shown: "Удиви меня" }) },
    { goal: "light", label: "Полегче", run: () => show("Полегче", { maxKcal: 450 }, "Лёгкое — до 450 ккал на порцию:") },
    { goal: "protein", label: "Больше белка", run: () => show("Больше белка", { minProtein: 25 }, "Белка от 25 г на порцию:") },
    { goal: "family", label: "Детям", run: () => show("Детям", { occasion: "kids" } as Partial<Conditions>, "Детям обычно нравится вот это:") },
    { label: "Гости", run: () => send("придут гости", { source: "option", shown: "Гости" }) },
  ];
  const chips = [...CHIPS.filter((c) => c.goal && profile.goals.includes(c.goal)), ...CHIPS.filter((c) => !c.goal || !profile.goals.includes(c.goal))];

  const firstUser = s.conversation.find((m) => m.role === "user")?.text;
  const recent = !!firstUser && Date.now() - lastChatAt() < CHAT_FRESH_MS;

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,720px)_320px] xl:justify-between xl:gap-10">
      <div className="min-w-0">
        <section className="pt-4 sm:pt-8 lg:pt-6" aria-labelledby="home-title">
          <p className="text-body-sm font-semibold text-brand">{greeting()}!</p>
          <h1 id="home-title" className="mt-1 text-display sm:text-display-lg">Что приготовим {MEAL_WORD[mealNow()]}?</h1>
          <p className="mt-3 max-w-xl text-body text-ink-soft">Я Шеф: подберу рецепт из того, что есть, под время и настроение — и отвечу на любой кухонный вопрос.</p>
          <div className="mt-6">
            <Composer variant="hero" onSend={(t, o) => send(t, o)} />
            <Considering />
          </div>
        </section>

        {recent && (
          <button onClick={() => goChat()} className="mt-5 flex min-h-[52px] w-full items-center gap-3 rounded-input border border-line bg-card px-4 text-left hover:border-line-strong/60">
            <MessageCircle size={20} className="shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-body-sm">Продолжить разговор: <b className="font-semibold">«{firstUser}»</b></span>
            <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
          </button>
        )}

        <SuggestionCards items={suggestions} className="mt-6" />
        {pwa && <InstallCard pwa={pwa} />}

        <div className="mt-5 flex flex-wrap gap-2">
          {chips.map((c) => <Chip key={c.label} onClick={c.run}>{c.label}</Chip>)}
        </div>

        <div className="xl:hidden">
          <Now />
          <Rescue />
        </div>
        <Sections />
        <Ideas />
        <div className="xl:hidden">
          <CourseCard />
        </div>
        <Saved />
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-8 space-y-2 pt-6">
          <RailBlock title="Под настроение" icon={<Smile size={16} />}>
            <MoodTiles send={(t, shown) => { void a.ask(t, { fresh: true, shown, source: "option" }); goChat(); }} compact />
          </RailBlock>
          <Now rail />
          <Rescue rail />
          <CourseCard rail />
        </div>
      </aside>
    </div>
  );
}

/** «Учитываю: 4 порции · без свинины · без духовки · Изменить» — only what differs from the defaults. */
function Considering() {
  const { s, profile } = useStore();
  const p = s.preferences;
  const parts: string[] = [profile.eaters + " " + (profile.eaters === 1 ? "порцию" : profile.eaters < 5 ? "порции" : "порций")];
  if (p.vegetarian) parts.push("вегетарианское");
  for (const e of p.excluded.slice(0, 3)) parts.push("без: " + conditionLabel(e).toLowerCase());
  if (p.excluded.length > 3) parts.push("ещё " + (p.excluded.length - 3) + " исключ.");
  if (!p.appliances.includes("oven")) parts.push("без духовки");
  for (const ap of ["multicooker", "airfryer"]) if (p.appliances.includes(ap) && !DEFAULT_PREFERENCES.appliances.includes(ap)) parts.push((LABELS[ap] ?? ap).toLowerCase());
  for (const g of profile.goals) if (g !== "tasty") parts.push((GOALS.find((x) => x.id === g)?.label ?? g).toLowerCase());
  return (
    <p className="mt-2.5 px-1 text-caption text-ink-soft">
      Учитываю: {parts.join(" · ")} ·{" "}
      <button className="link font-semibold" onClick={() => replace(routeHash({ tab: "profile" }))}>Изменить</button>
    </p>
  );
}

/** What is going on today: the dish on the stove, today's menu, the shopping list. */
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
  return rail ? <RailBlock title="Сейчас" icon={<CalendarDays size={16} />}>{rows}</RailBlock> : <Section title="Сейчас">{rows}</Section>;
}

/** Perishables that run out today or tomorrow, and what to cook with them. */
function Rescue({ rail }: { rail?: boolean }) {
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
  if (rail)
    return (
      <RailBlock title="Спасите продукты" icon={<Refrigerator size={16} />}>
        {strip}
        <div className="mt-1 grid gap-1">{ideas.slice(0, 3).map((r) => <RecipeMini key={r.id} recipe={r} onOpen={() => openRecipe(r)} />)}</div>
        <button className="link mt-1 px-1.5 text-small font-semibold" onClick={more}>Ещё варианты</button>
      </RailBlock>
    );
  return (
    <Section title="Спасите продукты" action="Ещё варианты" onAction={more}>
      {strip}
      {ideas.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3">{ideas.slice(0, 2).map((r) => <RecipeTile key={r.id} recipe={r} onOpen={() => openRecipe(r)} />)}</div>}
    </Section>
  );
}

function Ideas() {
  const { s, profile, update, catalog } = useStore();
  const { openRecipe } = useActions();
  const today = dateKey(new Date());
  const skip = s.today.date === today ? s.today.skip : [];
  const list = useMemo(() => {
    const c = goalConditions(profile, { ...freshConditions({ servings: profile.eaters, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), servings: profile.eaters });
    if (profile.level === "beginner" && c.maxMinutes == null) c.maxMinutes = 45;
    return rankRecipes(recipes(), c, s.preferences, 40, { meal: mealNow() })
      .filter((m) => !skip.includes(m.recipe.id) && (profile.level !== "beginner" || m.recipe.difficulty === "easy"))
      .slice(0, 6);
  }, [s.preferences, profile, skip, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list.length) return null;
  const shown = list.slice(0, 6);
  const other = () => update((st) => ({ ...st, today: { date: today, skip: [...(st.today.date === today ? st.today.skip : []), ...shown.map((m) => m.recipe.id)].slice(-60) } }));
  return (
    <Section title="Идеи на сегодня" action="Показать другие" onAction={other}>
      <div className="grid gap-2 lg:hidden">{shown.slice(0, 4).map((m) => <RecipeRow key={m.recipe.id} recipe={m.recipe} note={resultNote(m) || m.recipe.summary} onOpen={() => openRecipe(m.recipe)} />)}</div>
      <div className="hidden gap-4 lg:grid lg:grid-cols-3">{shown.map((m) => <RecipeTile key={m.recipe.id} recipe={m.recipe} note={resultNote(m) || undefined} onOpen={() => openRecipe(m.recipe)} />)}</div>
    </Section>
  );
}

// Browsing without a question: the catalog by kind of dish, as on any big recipe site.
const SECTIONS: { view: string; label: string; emoji: string; tint: string }[] = [
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

function Sections() {
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

function RailBlock({ title, icon, children }: { title: string; icon: JSX.Element; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card p-3">
      <h2 className="mb-2 flex items-center gap-2 px-1.5 text-small font-semibold text-ink-soft"><span aria-hidden className="text-brand">{icon}</span>{title}</h2>
      {children}
    </section>
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
