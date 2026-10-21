// Главная (#/): a feed of food, like a streaming app — the recipe of the day, «Выбрать за меня», collections that
// scroll sideways, and Шеф as a helper one tap away. Simple mode shows only the voice question and big ideas.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, ShoppingCart, GraduationCap, Clock, X, Shuffle, Mic, Repeat2, PartyPopper, CalendarDays, Snowflake, Refrigerator } from "lucide-react";
import {
  courseOf, dateKey, expiryLabel, expiringSoon, freshConditions, plural, rankRecipes, recipeById, recipes, shortName,
  type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { goalConditions } from "../app/profile";
import { MIN_DISHES, coverUrl, customThemes, holidayCollection, loadCustoms, savedCustoms, seasonCollection, themesNow, withCustom, type Collection, type Custom } from "../app/seasonal";
import { useWeather, weatherLine } from "../app/weather";
import { MonthCard } from "../components/MonthCard";
import { openLayer, openRecipesView, replace, routeHash } from "../app/router";
import { TimerStrip } from "../components/TimerStrip";
import { useTimers } from "../app/timers";
import { Deck } from "../components/Deck";
import { RatingBadge, RecipeImage, RecipeTile } from "../components/RecipeCard";
import { photoFirst } from "../app/photoFirst";
import { ChefAvatar, ScrollRow, Section, cx } from "../components/ui";
import { ProfileButton } from "../app/App";
import { LESSONS } from "./learn-data";
import type { Pwa } from "./Profile";
import { FeastSheet } from "../components/Feast";
import { forgetRecipe, lastRecipe } from "../app/lastSeen";
import { thawTomorrow } from "../app/reminders";
import { BackupCard } from "../components/BackupCard";
import { Bone } from "../components/Skeleton";
import { timeShort } from "../app/recipeTime";

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

/** The whole catalog in the person's order (their «не ем» and taste), for the collections: filtered by each one's rule. */
function useRanked() {
  const { s, profile, catalog } = useStore();
  return useMemo(() => rankRecipes(recipes(), { ...freshConditions({ servings: profile.eaters, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), servings: profile.eaters }, s.preferences, 5000).map((m) => m.recipe),
    [s.preferences, profile.eaters, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The same «recipe of the day» all day long, a new one tomorrow. */
function dayPick<T>(list: T[], salt = 0): T | null {
  if (!list.length) return null;
  const d = new Date();
  const n = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate() + salt;
  return list[(n * 7919) % Math.min(list.length, 25)];
}

/** «Рецепт дня» stays the same all day (per meal), even when the saved data or the catalog changes the list. */
function useToday(pick: Recipe | null, meal: string, ready: boolean): Recipe | null {
  const key = "cook-today-" + dateKey(new Date()) + "-" + meal;
  if (!ready) return pick;
  let kept: string | null = null;
  try { kept = localStorage.getItem(key); } catch { /* private mode */ }
  const was = kept ? recipeById(kept) : null;
  if (was) return was;
  if (pick) try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("cook-today-") && !k.startsWith("cook-today-" + dateKey(new Date()))) localStorage.removeItem(k);
    localStorage.setItem(key, pick.id);
  } catch { /* private mode */ }
  return pick;
}

const FESTIVE = ["newyear", "easter", "maslenitsa"];

export function Home({ pwa }: { pwa?: Pwa }) {
  const { s, profile, catalog } = useStore();
  const { openRecipe } = useActions();
  const a = useAssistant();
  const [feast, setFeast] = useState(false);
  // The deck: «Выбрать за меня» (with the time question), a collection (cards), or «Все» of a shelf (the list).
  const [deck, setDeck] = useState<{ title: string; pool: Recipe[]; askTime?: boolean; list?: boolean } | null>(null);
  const all = useSuitable();
  const ranked = useRanked();
  const meal = mealNow();
  const today = useToday(dayPick(photoFirst(all.filter((r) => ["main", "soup"].includes(courseOf(r)) || meal === "breakfast"), 80)), meal, catalog.version > 0);
  // The owner's changes from the admin panel: titles, hand-picked recipes, switched-off collections, covers.
  const [custom, setCustom] = useState(savedCustoms);
  useEffect(() => { void loadCustoms().then(setCustom); }, []);
  const holidayBase = holidayCollection();
  const holiday = holidayBase && withCustom(holidayBase, custom[holidayBase.key]);
  const season = withCustom(seasonCollection(), custom[seasonCollection().key]);
  // Only when «Погода за окном» is on in the profile.
  const weather = weatherLine(useWeather());

  if (profile.simple) return <SimpleHome today={today} />;

  // A dish planned for today takes the big card; «Рецепт дня» moves into «На сегодня» — the two swap places.
  const planned = s.menu.find((d) => d.date === dateKey(new Date()))?.items.map((i) => recipeById(i.recipeId)).find((r): r is Recipe => !!r) ?? null;
  const hero = planned ?? today;

  // Dishes the owner added by hand go first, then the rule's ones in the person's order (photos first).
  const dishes = (c: Collection, x?: Custom) => { const add = new Set(x?.add ?? []); const list = ranked.filter(c.test); return [...list.filter((r) => add.has(r.id)), ...photoFirst(list.filter((r) => !add.has(r.id)))]; };
  const holidayDishes = holiday ? dishes(holiday, custom[holiday.key]) : [];
  const seasonDishes = season ? dishes(season, custom[season.key]) : [];
  const themes = [...themesNow(), ...customThemes(custom)].map((t) => withCustom(t, custom[t.key])).filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({ t, list: dishes(t, custom[t.key]) })).filter((x) => x.list.length >= MIN_DISHES);

  return (
    <div className="pb-4" data-list="home">
      <div className="flex items-start justify-between gap-3 pt-3 sm:pt-6">
        <div>
          <p className="text-body-sm text-ink-soft">{greeting()}!</p>
          <h1 className="mt-1 text-h1 sm:text-display">Что приготовим {MEAL_WORD[meal]}?</h1>
          {weather && <p className="mt-1.5 text-body-sm text-ink-soft">{weather}</p>}
        </div>
        <ProfileButton className="-mr-1.5 lg:hidden" />
      </div>

      <ContinueCard />
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* The first second of a first visit: the day's dish is chosen from the full list, not the small built-in one. */}
        {!catalog.version ? <Bone className="h-[340px] rounded-card lg:h-auto lg:min-h-[260px]" /> : hero && <TodayCard r={hero} badge={planned ? "По плану на сегодня" : "Рецепт дня"} onOpen={() => openRecipe(hero)} />}
        {/* Wide screens: the actions share the height of the recipe card instead of leaving a blank below them. */}
        <div className="grid content-start gap-3 lg:flex lg:flex-col lg:[&>*]:flex-1">
          <RepeatCard />
          <button onClick={() => setDeck({ title: "Выбрать за меня", pool: all, askTime: true })} className="flex min-h-[64px] items-center gap-3 rounded-card border border-line bg-card px-4 py-3 text-left transition-transform active:scale-[.99]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden><Shuffle size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">Выбрать за меня</span>
              <span className="block text-small text-ink-soft">Покажу блюда по одному — выберите, что нравится</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-ink-soft" aria-hidden />
          </button>
          <button onClick={() => replace(routeHash({ tab: "chat" }))} className="flex min-h-[64px] items-center gap-3 rounded-card bg-brand-soft px-4 py-3 text-left transition-transform active:scale-[.99]">
            <ChefAvatar size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">Написать Шефу</span>
              <span className="block text-small text-ink-soft">Расскажите, что есть дома или чего хочется</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-brand" aria-hidden />
          </button>
        </div>
      </div>
      {pwa && <InstallCard pwa={pwa} />}
      <MonthCard />
      {/* Personal first: what is for today (and what must be used up), then the holiday, the season and the themes. */}
      <Now skip={planned?.id} dayDish={planned && today?.id !== planned.id ? today : null} />
      <Rescue />

      {/* The holiday shelf only while a holiday is near; the season's shelf always; then the themes as cards. */}
      {holiday && holidayDishes.length >= 4 && <Shelf c={holiday} list={holidayDishes} all={() => setDeck({ title: holiday.title, pool: holidayDishes, list: true })}
        extra={holiday.key === "afterny" ? <button className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-body-sm hover:border-line-strong" onClick={() => { void a.ask("что сделать с остатками после праздника", { fresh: true }); goChat(); }}><Refrigerator size={18} className="text-ink-soft" aria-hidden />Что сделать с остатками</button>
          : FESTIVE.includes(holiday.key) ? <button className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-body-sm hover:border-line-strong" onClick={() => setFeast(true)}><PartyPopper size={18} className="text-ink-soft" aria-hidden />{holiday.key === "newyear" ? "Собрать новогодний стол" : "Собрать праздничный стол"}</button> : undefined} />}
      <FeastSheet open={feast} onClose={() => setFeast(false)} />
      {season && seasonDishes.length >= 4 && <Shelf c={season} list={seasonDishes} all={() => setDeck({ title: season.title, pool: seasonDishes, list: true })} />}
      {themes.length > 0 && (
        <Section title="Подборки">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            {themes.map(({ t, list }) => <ThemeCard key={t.key} c={t} cover={list[0]} drawn={custom[t.key]?.cover} wide={custom[t.key]?.coverWide} onOpen={() => setDeck({ title: t.title, pool: list })} />)}
          </div>
        </Section>
      )}

      <BackupCard />
      <Saved />
      <CourseCard />
      {deck && <Deck title={deck.title} pool={deck.pool} askTime={deck.askTime} startList={deck.list} onClose={() => setDeck(null)} />}
    </div>
  );
}

/** The recipe of the day: a big card with one action. */
function TodayCard({ r, badge, onOpen }: { r: Recipe; badge: string; onOpen: () => void }) {
  const { profile } = useStore();
  return (
    // Phones: photo on top. Wide screens: photo on the left, so the card is not a screen-high block.
    <article className="overflow-hidden rounded-card border border-line bg-card lg:flex">
      <button className="relative block w-full text-left lg:w-[46%] lg:shrink-0" onClick={onOpen} aria-label={badge + ": " + r.title}>
        <RecipeImage recipe={r} full className="aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:min-h-[260px]" rounded="rounded-none" eager />
        <span className="absolute left-3 top-3 rounded-full bg-card/95 px-3 py-1 text-small font-medium">{badge}</span>
        <RatingBadge id={r.id} className="right-3 top-3" />
      </button>
      <div className="p-4 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:p-6">
        <h2 className="text-h2 lg:text-h1">{r.title}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-body-sm text-ink-soft lg:mt-2">
          <Clock size={16} aria-hidden />{timeShort(r)}<span aria-hidden>·</span>{DIFF[r.difficulty]}<span aria-hidden>·</span>на {people(profile.eaters)}
        </p>
        {r.summary && <p className="mt-3 hidden text-body-sm text-ink-soft lg:line-clamp-3">{r.summary}</p>}
        <button className="btn-primary btn-bar mt-4 w-full lg:mt-5" onClick={onOpen}>Открыть рецепт</button>
      </div>
    </article>
  );
}

/** «Вы смотрели: Борщ › Продолжить» — the recipe left open last time (one line, can be closed). */
function ContinueCard() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const [last, setLast] = useState(lastRecipe);
  const r = last ? recipeById(last.id) : null;
  const cookedSince = !!last && s.book.some((b) => b.recipeId === last.id && b.at > last.at);
  const cookingIt = !!s.cooking && !s.cooking.done;
  if (!last || !r || cookedSince || cookingIt) return null;
  return (
    <div className="mt-4 flex min-h-[60px] items-center gap-2 rounded-card border border-line bg-card p-2" data-pick-skip>
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { forgetRecipe(); openRecipe(r); }}>
        <RecipeImage recipe={r} className="h-11 w-11 shrink-0" rounded="rounded-input" />
        <span className="min-w-0 flex-1">
          <span className="block text-small text-ink-soft">Вы смотрели</span>
          <span className="block truncate text-body-sm font-medium">{r.title}</span>
        </span>
        <span className="shrink-0 pr-1 text-small font-semibold text-brand">Продолжить</span>
      </button>
      <button className="icon-btn shrink-0 text-ink-soft" onClick={() => { forgetRecipe(); setLast(null); }} aria-label="Скрыть"><X size={18} /></button>
    </div>
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

/** A collection that scrolls sideways, like a shelf in a streaming app; «Все» opens all of it as a list. */
function Shelf({ c, list, all, extra }: { c: Collection; list: Recipe[]; all: () => void; extra?: ReactNode }) {
  const { openRecipe } = useActions();
  if (!list.length) return null;
  return (
    <Section title={c.emoji + " " + c.title} action="Все" onAction={all}>
      <p className="-mt-1 mb-3 text-small text-ink-soft">{c.hint}</p>
      <ScrollRow label={c.title}>
        {list.slice(0, 10).map((r) => <RecipeTile key={r.id} recipe={r} onOpen={() => openRecipe(r)} className="w-[168px] shrink-0 snap-start sm:w-[200px]" />)}
      </ScrollRow>
      {extra}
    </Section>
  );
}

/** A theme as a card: its own drawn cover (uploaded in the admin), or the best dish's photo until there is one.
 * Phones and tablets: tall 4:5 cards, two or three in a row. Computers: three wide 3:2 cards in a row — with the wide
 * cover when there is one, otherwise the tall one cut to the middle. */
function ThemeCard({ c, cover, drawn, wide, onOpen }: { c: Collection; cover: Recipe; drawn?: number; wide?: number; onOpen: () => void }) {
  const [own, setOwn] = useState(true);
  return (
    <button onClick={onOpen} className="relative aspect-[4/5] overflow-hidden rounded-card text-left transition-transform active:scale-[.98] lg:aspect-[3/2]">
      {drawn && own
        ? (
          <picture>
            {wide && <source media="(min-width: 1024px)" srcSet={coverUrl(c.key, wide, true)} />}
            <img src={coverUrl(c.key, drawn)} alt="" loading="lazy" decoding="async" onError={() => setOwn(false)} className="absolute inset-0 h-full w-full bg-sunken object-cover" />
          </picture>
        )
        : <RecipeImage recipe={cover} className="absolute inset-0 h-full w-full" rounded="rounded-none" />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-black/0 px-3 pb-3 pt-12 text-body font-semibold leading-tight text-white lg:px-5 lg:pb-4 lg:text-h3">{c.title}</span>
    </button>
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
              <span className="block text-body text-ink-soft">{timeShort(r)} · {DIFF[r.difficulty].toLowerCase()}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** «На сегодня» as one shelf: the day's dish, what is planned, yesterday's to warm up, then the week plan and the
 * shopping list as tiles of the same size. One row instead of a list of four — and it stays on one line on phones. */
function Now({ skip, dayDish }: { skip?: string; dayDish?: Recipe | null }) {
  const { s, profile } = useStore();
  const { openRecipe } = useActions();
  const today = dateKey(new Date());
  // skip: the planned dish already shown in the big card above.
  const menu = (s.menu.find((d) => d.date === today)?.items ?? []).map((i) => ({ i, r: recipeById(i.recipeId) })).filter((x): x is { i: typeof x.i; r: Recipe } => !!x.r && x.r.id !== skip);
  const toBuy = s.shopping.filter((i) => !i.checked).length;
  const timers = useTimers().length;
  // In the afternoon: tomorrow's meat or fish may be in the freezer.
  const thaw = new Date().getHours() >= 15 ? thawTomorrow(s, new Date()) : null;
  // The week plan is not in the bottom bar: from here it is one tap away (or one tap to make it).
  const planned = s.menu.filter((d) => d.date >= today && d.items.length > 0).length;
  if (!menu.length && !toBuy && !timers && !thaw && !dayDish && profile.simple) return null;
  const tile = "w-[168px] shrink-0 snap-start sm:w-[200px]";
  const action = (icon: ReactNode, title: string, line: string, onClick: () => void) => (
    <button onClick={onClick} className={cx("card flex flex-col items-start justify-between gap-3 p-4 text-left transition-[border-color,transform] duration-150 hover:border-line-strong/60 active:scale-[.99]", tile)}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-sunken text-ink" aria-hidden>{icon}</span>
      <span><span className="block text-title leading-snug">{title}</span><span className="mt-1 block text-caption text-ink-soft">{line}</span></span>
    </button>
  );
  return (
    <Section title="На сегодня">
      {timers > 0 && <TimerStrip className="mb-3" />}
      {thaw && (
        <p className="mb-3 flex items-start gap-3 rounded-input bg-sunken px-3 py-2.5 text-body-sm">
          <Snowflake size={20} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden />
          <span>Завтра «{thaw.title}»: если {thaw.what} в морозилке — переложите сегодня в холодильник.</span>
        </p>
      )}
      <ScrollRow label="На сегодня">
        {dayDish && <RecipeTile recipe={dayDish} badge="Рецепт дня" onOpen={() => openRecipe(dayDish)} className={tile} />}
        {menu.map(({ i, r }) => <RecipeTile key={r.id + i.servings} recipe={r} badge={i.leftover ? "Разогреть" : "По плану"} note={i.leftover ? "Приготовлено вчера" : i.servings + " порц."} onOpen={() => openRecipe(r)} className={tile} />)}
        {action(<CalendarDays size={22} />, planned ? "План на неделю" : "Составить план", planned ? "Расписано " + planned + " " + plural(planned, "день", "дня", "дней") : "Ужины без повторов и список покупок", () => openLayer(routeHash({ tab: "menu" })))}
        {toBuy > 0 && action(<ShoppingCart size={22} />, "Покупки", "Купить: " + toBuy, () => replace(routeHash({ tab: "shopping" })))}
      </ScrollRow>
    </Section>
  );
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
    <Section title="Пора использовать" action="Ещё рецепты" onAction={more}>
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
