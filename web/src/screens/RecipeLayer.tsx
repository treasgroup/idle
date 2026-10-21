// The recipe page. Phones: a photo under a clear header that turns solid (title + «Продукты · Шаги · Отзывы»)
// once the title has scrolled away, and a bar with «В план» and «Начать готовить». Wide screens: photo left,
// facts and actions right, the products column sticks while the steps scroll.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Heart, Share2, ShoppingCart, CalendarPlus, ChefHat, Check, Clock, ChevronDown,
  Timer, BellRing, Lightbulb, PenLine, CookingPot, ChevronRight, SearchX, BookOpen, MessageCircle, Plus, Pause, Play, X, Image as ImageIcon, Users, Soup } from "lucide-react";
import {
  LABELS, basics, clampServings, displayName, formatMinutes, ingredientMatches, nutritionOf, plural,
  recipeById, recipePageUrl, reviewsWord, scaleIngredient, similarRecipes, suggestSides, needsSide, withSide, yieldText,
  type Recipe, type RecipeIngredient,
} from "../engine";
import { useStore } from "../app/store";
import { signal } from "../app/personal";
import { useActions, haveIds } from "../app/actions";
import { homeAmount, homeQuantity, mergeSame } from "../app/amounts";
import { printPage } from "../app/print";
import { useHint } from "../app/hints";
import { PAN_CHOICES, area, panOf, panText, type Pan } from "../app/pan";
import { stepTips } from "../app/stepTips";
import { goChat } from "../app/chatNav";
import { openLayer, replace, routeHash } from "../app/router";
import { addMinute, secondsLeft, startTimer, stopTimer, timerTitle, togglePause, useTick, useTimers, type CookTimer } from "../app/timers";
import { RecipeImage, RecipeTile } from "../components/RecipeCard";
import { AddToMenuSheet } from "../components/AddToMenu";
import { AskSheet, accusative, type AskRequest } from "../components/AskSheet";
import { shareRecipeCard } from "../app/shareCard";
import { rememberRecipe } from "../app/lastSeen";
import { likedShare, useRecipeStat } from "../app/recipeStats";
import { DinnerSetup } from "../components/DinnerPlan";
import { ShareOptions } from "../components/ShareOptions";
import { TimerStrip } from "../components/TimerStrip";
import { ChefAvatar, Chip, Layer, Section, Sheet, Stepper, cx, mmss } from "../components/ui";
import { Reviews, Stars, useReviews } from "./Reviews";
import { timeLong, timeShort } from "../app/recipeTime";
import { withAmounts } from "../app/stepAmounts";
import { useTerms } from "../components/Terms";

const DIFF: Record<string, string> = { easy: "Просто", medium: "Средне", hard: "Сложно" };
const ANCHORS = [
  { id: "recipe-products", label: "Продукты" },
  { id: "recipe-steps", label: "Шаги" },
  { id: "recipe-reviews", label: "Отзывы" },
];
// Below the solid header (56px) and the anchor row (44px).
const UNDER_HEADER = "scroll-mt-[calc(env(safe-area-inset-top)+7rem)]";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wide = () => matchMedia("(min-width: 1024px)").matches;

export function RecipeLayer({ id, onClose }: { id: string; onClose: () => void }) {
  const { catalog } = useStore();
  const base = recipeById(id);
  // A shared link can arrive before the full catalog: wait for it instead of saying the recipe is gone.
  const waiting = !base && catalog.source !== "server";
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(t);
  }, [waiting]);
  if (base) return <RecipeView key={id} base={base} onClose={onClose} />;
  return (
    <Layer title="Рецепт" onClose={onClose}>
      {waiting ? <Loading slow={slow} /> : <Missing />}
    </Layer>
  );
}

function Loading({ slow }: { slow: boolean }) {
  return (
    <div className="mx-auto max-w-3xl pb-10 sm:px-6 sm:pt-2" role="status" aria-live="polite">
      <div className="skeleton aspect-[4/3] w-full rounded-none sm:aspect-[3/2] sm:rounded-card" />
      <div className="px-4 pt-5 sm:px-0">
        <p className="text-body-sm text-ink-soft">{slow ? "Каталог загружается дольше обычного. Проверьте интернет — рецепт откроется сам." : "Загружаю рецепт…"}</p>
        {slow && <button className="btn-outline mt-3" onClick={() => replace(routeHash({ tab: "recipes" }))}><BookOpen size={18} />Все рецепты</button>}
        <div className="skeleton mt-3 h-8 w-3/4" />
        <div className="skeleton mt-3 h-4 w-full" />
        <div className="skeleton mt-2 h-4 w-5/6" />
        <div className="mt-5 flex gap-2"><div className="skeleton h-8 w-24 rounded-full" /><div className="skeleton h-8 w-24 rounded-full" /><div className="skeleton h-8 w-20 rounded-full" /></div>
        <div className="skeleton mt-8 h-48 rounded-card" />
      </div>
    </div>
  );
}

function Missing() {
  return (
    <div className="mx-auto max-w-md px-6 pb-10 pt-12 text-center">
      <SearchX size={48} className="mx-auto text-ink-faint" aria-hidden />
      <h1 className="mt-4 text-h1">Рецепт не найден</h1>
      <p className="mt-2 text-body-sm text-ink-soft">Похоже, его убрали из каталога. Найдите похожее блюдо в рецептах или спросите Шефа.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={() => replace(routeHash({ tab: "recipes" }))}><BookOpen size={18} />Все рецепты</button>
        <button className="btn-outline" onClick={() => goChat(true)}><MessageCircle size={18} />Спросить Шефа</button>
      </div>
    </div>
  );
}

/** Where the header turns solid (the title has scrolled under it) and which section is on screen. */
function useHeader(root: RefObject<HTMLElement>, title: RefObject<HTMLElement>) {
  const [until, setUntil] = useState(10000);
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const limit = useRef(until);
  const box = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    let el = root.current?.parentElement ?? null;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    if (!el || !root.current) return;
    const scroller = el;
    box.current = scroller;
    const head = () => (scroller.previousElementSibling as HTMLElement | null)?.offsetHeight ?? 56;
    const measure = () => {
      const h = title.current;
      if (!h) return;
      const bottom = h.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top + scroller.scrollTop;
      limit.current = Math.max(0, Math.round(bottom - head()));
      setUntil(limit.current);
      onScroll();
    };
    const onScroll = () => {
      setSolid(scroller.scrollTop > limit.current);
      const top = scroller.getBoundingClientRect().top + head() + 44 + 24;
      let on: string | null = null;
      for (const a of ANCHORS) {
        const t = document.getElementById(a.id);
        if (t && t.getBoundingClientRect().top <= top) on = a.id;
      }
      setActive(on);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root.current);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); scroller.removeEventListener("scroll", onScroll); };
  }, [root, title]);
  return { until, solid, active, box };
}

/** The products column sticks on wide screens only while it fits under the header. */
function useFits(el: RefObject<HTMLElement>, box: RefObject<HTMLElement | null>): boolean {
  const [fits, setFits] = useState(true);
  useEffect(() => {
    const a = el.current, b = box.current;
    if (!a || !b) return;
    const check = () => setFits(a.offsetHeight <= b.clientHeight - 100);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(a);
    ro.observe(b);
    return () => ro.disconnect();
  }, [el, box]);
  return fits;
}

/** «Котлеты домашние», «Куриные бёдра» — the dish part of a title, for the group of its products. */
const dishPart = (title: string) => title.split(/,|\s(?:с|со|в|во|на|по|из|под|без)\s/)[0];
/** Steps of a side come as «Гарнир («пюре»): сварите…». */
const splitSide = (text: string) => {
  const m = text.match(/^Гарнир \(«(.+?)»\):\s*/);
  return m ? { side: m[1], text: text.slice(m[0].length, m[0].length + 1).toUpperCase() + text.slice(m[0].length + 1) } : { side: null, text };
};
/** A few words of a step for its timer: «Шаг 5 · жарьте котлеты». */
function stepLabel(text: string): string {
  const words = splitSide(text).text.split(/[.,;:(—–]/)[0].trim().split(/\s+/).slice(0, 3);
  while (words.length > 1 && /^(и|а|на|в|во|с|со|до|по|для|из|к|о|от|за|под|при|\d+([.,]\d+)?)$/i.test(words[words.length - 1])) words.pop();
  const s = words.join(" ");
  return s.charAt(0).toLowerCase() + s.slice(1);
}

interface Group { key: string; title: string | null; rows: RecipeIngredient[]; added?: boolean }

function RecipeView({ base, onClose }: { base: Recipe; onClose: () => void }) {
  const { s, profile, toast, online } = useStore();
  const terms = useTerms();
  useEffect(() => rememberRecipe(base.id), [base.id]);
  // How long the page was read: closed within seconds — not this; read for a while — interest.
  useEffect(() => {
    const opened = Date.now();
    return () => { const t = Date.now() - opened; if (t < 5000) signal(base, "bounce"); else if (t > 25000) signal(base, "read"); };
  }, [base]);
  const [haveHint, haveSeen] = useHint("recipe-have", 3);
  const [serveOpen, setServeOpen] = useState(false);
  const [panOpen, setPanOpen] = useState(false);
  const pan = useMemo(() => panOf(base), [base]);
  const { isFavorite, toggleFavorite, addRecipeToShopping, startCooking, openRecipe } = useActions();
  const reviews = useReviews(base.id);
  const [servings, setServings] = useState(() => clampServings(base, s.conditions.servings || profile.eaters));
  // Борщ for 2 opens for 3: the pot is not made smaller than that. Said once, so the 3 is not a surprise.
  const atLeast = (s.conditions.servings || profile.eaters) < base.minServings && servings === base.minServings;
  const [sideId, setSideId] = useState<string | null>(null);
  const [have, setHave] = useState<string[]>(() => haveIds(s));
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [making, setMaking] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [askReq, setAskReq] = useState<AskRequest | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [kcalOpen, setKcalOpen] = useState(false);
  // «У вас есть 5 из 7» appears once the person marks a product; until then only «Добавить в покупки».
  const [marked, setMarked] = useState(false);
  const [noteOpen, setNoteOpen] = useState(() => !!s.notes[base.id]);
  const stat = useRecipeStat(base.id);
  const root = useRef<HTMLDivElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const sideRows = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const aside = useRef<HTMLElement>(null);
  const header = useHeader(root, h1);
  const fits = useFits(aside, header.box);

  const sides = useMemo(() => (needsSide(base) ? suggestSides(base, s.preferences.excluded) : []), [base, s.preferences.excluded]);
  const side = sides.find((x) => x.id === sideId) ?? null;
  // One recipe with the side merged in, for cooking and the shopping list.
  const recipe = useMemo(() => (side ? withSide(base, side) : base), [base, side]);
  const tips = useMemo(() => stepTips(recipe, 2), [recipe]);
  // The same for questions, with its own version so nutrition is not mixed up with the dish alone.
  const askRecipe = useMemo(() => (side ? { ...recipe, version: base.version + "+" + side.id } : base), [recipe, base, side]);
  const nutrition = nutritionOf(base).perServing;
  const fav = isFavorite(base.id);
  const related = useMemo(() => similarRecipes(base, (r) => !s.preferences.excluded.some((e) => r.allergens.includes(e)), 8), [base, s.preferences.excluded]);
  const cookedTimes = s.book.filter((b) => b.recipeId === base.id).length;
  const cookingThis = !!s.cooking && !s.cooking.done && s.cooking.recipe.id === base.id;

  // Products in groups: the dish, then the side (both scaled to the chosen servings, repeats merged).
  const scale = (list: RecipeIngredient[]) => mergeSame(list).map((i) => scaleIngredient(i, base, servings));
  const groups: Group[] = [{ key: "main", title: side ? dishPart(base.title) : null, rows: scale(base.ingredients) }];
  if (side) {
    const k = base.servings / side.servings;
    groups.push({ key: side.id, title: "Гарнир: " + side.title.toLowerCase(), rows: scale(side.ingredients.map((i) => ({ ...i, amount: Math.round(i.amount * k * 100) / 100 }))), added: true });
  }
  // All products for the chosen servings: the steps' «две пятых масла» get their amount from these.
  const lines = groups.flatMap((g) => g.rows);
  const hasIt = (id: string) => have.some((h) => ingredientMatches(id, h));
  const needed = [...new Set(recipe.ingredients.filter((i) => !i.optional && i.id !== "water").map((i) => i.id))];
  const owned = needed.filter(hasIt).length;
  const missing = needed.length - owned;
  const firstMissing = recipe.ingredients.find((i) => i.id === needed.find((id) => !hasIt(id)));
  const swapQuestion = firstMissing ? "Чем заменить " + accusative(displayName(firstMissing.id, firstMissing.name)) + "?" : undefined;
  const toggleHave = (id: string) => setHave((h) => (hasIt(id) ? h.filter((x) => !ingredientMatches(id, x)) : [...h, id]));

  useEffect(() => { document.title = base.title + " — Что приготовить?"; return () => { document.title = "Что приготовить?"; }; }, [base.title]);

  // --dock: the bottom bar's height, so toasts float above it.
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const rootStyle = document.documentElement.style;
    const set = () => rootStyle.setProperty("--dock", el.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); rootStyle.setProperty("--dock", "0px"); };
  }, []);

  const go = (id: string) => {
    const el = id === "recipe-products" && wide() ? body.current : document.getElementById(id);
    el?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  };
  const goStep = (step: number | null) => {
    if (step == null) return go("recipe-steps");
    document.getElementById("recipe-step-" + step)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  };
  const pickSide = (id: string | null) => {
    setSideId(id);
    if (id) window.setTimeout(() => sideRows.current?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "nearest" }), 60);
  };
  const ask = (text?: string) => { setAskReq(text ? { text, key: Date.now() } : null); setAskOpen(true); };
  const cook = () => (cookingThis ? openLayer(routeHash({ cook: true })) : startCooking(recipe, servings));

  // How long it keeps: shown with the tips (the top of the page stays short).
  const keeps = [
    base.storageDays ? "Хранится в холодильнике " + base.storageDays + " " + plural(base.storageDays, "день", "дня", "дней") : "",
    base.freezerDays ? "можно заморозить" : "",
  ].filter(Boolean).join(", ").replace(/^м/, "М") + (base.storageDays || base.freezerDays ? "." : "");
  // Гарнир: a small button among the helpers under the steps; the choice opens there once wanted —
  // most people cook the dish as it is, so it does not take a line above the products.
  const sidePicker = sides.length > 0 && (side || sideOpen) && (
    <section className="mt-5" aria-label="Гарнир">
      <h3 className="text-title">Гарнир</h3>
      <p className="mb-3 mt-1 text-small text-ink-soft">{side ? "Добавил продукты и шаги гарнира — приготовите всё вместе." : "Выберите — добавлю продукты и шаги."}</p>
      <div className="scroller fade-x -mx-4 !gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]">
        <Chip on={!sideId} onClick={() => { pickSide(null); setSideOpen(false); }}>Без гарнира</Chip>
        {sides.map((x) => <Chip key={x.id} on={sideId === x.id} onClick={() => pickSide(x.id)}>{x.title}</Chip>)}
      </div>
    </section>
  );
  const sum = reviews.data?.summary;
  const anchors = ANCHORS.filter((a) => a.id !== "recipe-reviews" || online || !!reviews.data);

  return (
    <Layer title={base.title} onClose={onClose} width="max-w-none" transparentUntil={header.until} label={base.title} still actions={
      <>
        <button className="icon-btn" onClick={() => setShareOpen(true)} aria-label="Поделиться"><Share2 size={20} /></button>
        <button className="icon-btn" onClick={() => toggleFavorite(base)} aria-label={fav ? "Убрать из сохранённого" : "Сохранить"} aria-pressed={fav}>
          <Heart size={20} className={cx(fav && "fill-brand text-brand")} />
        </button>
      </>
    }>
      <div ref={root} className="pb-[calc(var(--dock)+2.5rem)] lg:pb-16">
        <AnchorBar show={header.solid} anchors={anchors} active={header.active} go={go} recipeId={base.id} goStep={goStep} />

        <div className="mx-auto max-w-3xl sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+4rem)] lg:max-w-[1120px] lg:px-8 lg:pt-[calc(env(safe-area-inset-top)+4.5rem)]">
          {/* Top: photo, title, facts, nutrition (and the actions on wide screens) */}
          <div className="lg:grid lg:grid-cols-[minmax(0,560px)_minmax(340px,1fr)] lg:items-start lg:gap-8 xl:gap-10">
            <RecipeImage recipe={base} eager hero className="aspect-[4/3] w-full sm:aspect-[3/2]" rounded="rounded-none sm:rounded-card" />
            <div className="px-4 pt-5 sm:px-0 sm:pt-6 lg:pt-1">
              <h1 ref={h1} className="text-h1 xl:text-display">{base.title}</h1>
              {/* One quiet line: stars from reviews, how many people cooked it (and liked it), and your own count. */}
              {(!!sum?.count || cookedTimes > 0 || !!stat) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 text-small text-ink-soft">
                  {!!sum?.count && (
                    <button className="-mx-1 -my-1.5 inline-flex h-11 items-center gap-1.5 rounded-full px-1 hover:text-ink" onClick={() => go("recipe-reviews")}>
                      <Stars value={sum.avg} size={14} /><span className="font-semibold text-ink">{sum.avg.toFixed(1).replace(".", ",")}</span><span>· {reviewsWord(sum.count)}</span>
                    </button>
                  )}
                  {stat && (
                    <span className="inline-flex min-h-8 items-center gap-1.5">
                      <Users size={16} aria-hidden />Готовили {stat.cooked} {plural(stat.cooked, "раз", "раза", "раз")}{likedShare(stat) ? " · " + likedShare(stat) : ""}
                    </span>
                  )}
                  {cookedTimes > 0 && <span className="inline-flex min-h-8 items-center gap-1.5"><Check size={16} className="text-herb" aria-hidden />{stat ? (cookedTimes > 1 ? "Вы — " + cookedTimes + " " + plural(cookedTimes, "раз", "раза", "раз") : "И вы тоже") : "Вы готовили " + cookedTimes + " " + plural(cookedTimes, "раз", "раза", "раз")}</span>}
                </div>
              )}
              {base.summary && <p className="mt-3 text-body text-ink-soft">{base.summary}</p>}
              {s.notes[base.id] && (
                <button className="mt-3 flex w-full gap-2.5 rounded-input bg-sunken px-3.5 py-2.5 text-left text-body-sm text-ink" onClick={() => go("recipe-note")}>
                  <PenLine size={18} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden /><span><span className="text-ink-soft">Ваша заметка: </span>{s.notes[base.id]}</span>
                </button>
              )}
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink-soft">
                <Clock size={18} aria-hidden /><span className="text-ink">{timeLong(recipe)}</span>
                <span aria-hidden>·</span>{DIFF[base.difficulty] ?? base.difficulty}
                <span aria-hidden>·</span>на {servings} {plural(servings, "человека", "человека", "человек")}
                {/* Calories: part of the facts line, not a row of their own; a tap shows the composition. */}
                {nutrition.kcal > 0 && <>
                  <span aria-hidden>·</span>
                  <button className="-my-2 inline-flex min-h-11 items-center gap-1 rounded-full underline decoration-line-strong decoration-dotted underline-offset-4 hover:text-ink" onClick={() => setKcalOpen((o) => !o)} aria-expanded={kcalOpen}>
                    {nutrition.kcal} ккал<ChevronDown size={16} className={cx("transition-transform", kcalOpen && "rotate-180")} aria-hidden />
                  </button>
                </>}
              </p>
              {nutrition.kcal > 0 && kcalOpen && <Nutrition recipe={base} n={nutrition} side={!!side} />}
              <div className="mt-6 hidden gap-3 lg:flex">
                <button className="btn-primary btn-bar flex-1" onClick={cook}><ChefHat size={20} />{cookingThis ? "Продолжить готовить" : "Начать готовить"}</button>
                <button className="btn-outline btn-bar" onClick={() => setMenuOpen(true)}><CalendarPlus size={20} />В план</button>
              </div>
            </div>
          </div>

          {/* Body: products (sticky on wide screens) and everything else */}
          <div ref={body} className={cx("px-4 sm:px-0 lg:mt-4 lg:grid lg:grid-cols-[minmax(280px,360px)_minmax(360px,1fr)] lg:items-start lg:gap-8 xl:gap-10", UNDER_HEADER)}>
            <aside ref={aside} className={cx("lg:pb-4", fits && "lg:sticky lg:top-[calc(env(safe-area-inset-top)+5.25rem)]")}>
              <Section id="recipe-products" className={UNDER_HEADER}>
                {/* Own header: the stepper drops under the title when there is no room (320px, large text). */}
                <div className="mb-3 flex min-h-[44px] flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <h2 className="text-h2">Продукты</h2>
                  <Stepper value={servings} min={base.minServings} max={base.maxServings} onChange={setServings} label="Сколько человек" suffix={plural(servings, "человек", "человека", "человек")} />
                </div>
                {(!!base.yields || haveHint || atLeast) && <p className="-mt-2 mb-3 text-small text-ink-soft">{atLeast && "Меньше чем на " + base.minServings + " " + plural(base.minServings, "человека", "человека", "человек") + " не приготовить — останется на завтра. "}{base.yields ? ("Получится " + yieldText(base, servings).replace(/^≈\s*/, "около ")).replace(/\.?$/, ". ") : ""}{haveHint && "Отметьте кружком то, что у вас уже есть."}</p>}
                <HaveBar owned={owned} total={needed.length} missing={missing} marked={marked} onBuy={() => addRecipeToShopping(recipe, servings, have)} />
                <div className="mt-3 space-y-4">
                  {groups.map((g) => (
                    <div key={g.key} ref={g.added ? sideRows : undefined}>
                      {g.title && <h3 className="label mb-1.5 px-1">{g.title}</h3>}
                      <ul className="card px-1">
                        {g.rows.map((i, k) => <Row key={g.key + i.id + i.unit} i={i} own={hasIt(i.id)} flash={g.added} first={k === 0} onToggle={() => { toggleHave(i.id); haveSeen(); setMarked(true); }} />)}
                      </ul>
                    </div>
                  ))}
                </div>
                {pan && (
                  <button className="mt-3 flex min-h-[48px] w-full items-center gap-2 rounded-input px-1 text-left text-body-sm text-ink-soft hover:bg-sunken/60" onClick={() => setPanOpen(true)}>
                    <CookingPot size={18} className="shrink-0" aria-hidden />
                    <span className="flex-1">Форма {panText(pan)} — на {base.servings} {plural(base.servings, "порцию", "порции", "порций")}. У вас другая?</span>
                    <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
                  </button>
                )}
                {/* One quiet line for both «нет дома» (a swap) and «не ем» (never offer it again). */}
                <button className="mt-3 flex min-h-[48px] w-full items-center gap-2 rounded-input px-1 text-left text-body-sm text-ink-soft hover:bg-sunken/60"
                  onClick={() => setHelpOpen(true)}>
                  <Lightbulb size={18} className="shrink-0" aria-hidden />
                  <span className="flex-1">Чего-то нет дома или не едите? Подскажу</span>
                  <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
                </button>
              </Section>
            </aside>

            <div className="min-w-0">
              <AskCard ask={ask} />

              <Section id="recipe-steps" className={UNDER_HEADER} title="Шаги"
                action={<span className="text-small text-ink-soft">{recipe.steps.length} {plural(recipe.steps.length, "шаг", "шага", "шагов")} · {timeShort(recipe)}</span>}>
                <TimerStrip only={base.id} onJump={(t) => goStep(t.step)} className="mb-4" />
                {/* One column, one rhythm: a big number, the text, and under it at most a quiet tip and the timer. */}
                <ol className="card divide-y divide-line overflow-hidden">
                  {recipe.steps.map((st, n) => {
                    const part = splitSide(st.text);
                    return (
                      <li key={n} id={"recipe-step-" + n} className={cx("flex gap-4 px-4 py-5 sm:px-5", UNDER_HEADER)}>
                        <span aria-hidden className="w-6 shrink-0 text-h2 leading-7 tabular-nums text-brand">{n + 1}</span>
                        <div className="min-w-0 max-w-[62ch] flex-1">
                          {part.side && <span className="label mb-1 block text-brand">Гарнир · {part.side}</span>}
                          <p className="text-body leading-7 text-ink">{terms.render(withAmounts(part.text, lines))}</p>
                          {tips[n] && (
                            <p className="mt-2.5 flex gap-2 text-body-sm text-ink-soft">
                              <Lightbulb size={16} className="mt-[3px] shrink-0 text-herb" aria-hidden /><span><span className="font-semibold text-herb">Совет: </span>{tips[n]}</span>
                            </p>
                          )}
                          {!!st.timerSeconds && <TimerChip recipe={base} step={n} text={st.text} seconds={st.timerSeconds} />}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {/* The helpers people use now and then: one row of small buttons instead of a line each. */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {sides.length > 0 && !side && !sideOpen && <button className="chip h-11" onClick={() => setSideOpen(true)}><Soup size={18} className="text-ink-soft" aria-hidden />Добавить гарнир</button>}
                  <button className="chip h-11" onClick={() => setServeOpen(true)}><Clock size={18} className="text-ink-soft" aria-hidden />Подать к сроку</button>
                  {!noteOpen && <button className="chip h-11" onClick={() => setNoteOpen(true)}><PenLine size={18} className="text-ink-soft" aria-hidden />Заметка для себя</button>}
                </div>
                {sidePicker}
              </Section>

              {(base.tips.length > 0 || keeps) && (
                // Folded: the tips that matter at a step are already under that step.
                <details className="group mt-8 rounded-card border border-line bg-card">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 text-body [&::-webkit-details-marker]:hidden">
                    <Lightbulb size={20} className="shrink-0 text-ink-soft" aria-hidden />
                    <span className="flex-1 font-semibold">{keeps ? "Советы и хранение" : "Советы"}</span>
                    <span className="text-small text-ink-soft">{base.tips.length + (keeps ? 1 : 0)}</span>
                    <ChevronRight size={18} className="shrink-0 text-ink-faint transition-transform group-open:rotate-90" aria-hidden />
                  </summary>
                  <ul className="space-y-3 px-4 pb-4">
                    {[...(keeps ? [keeps] : []), ...base.tips].map((t) => <li key={t} className="flex gap-3 text-body-sm"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />{t}</li>)}
                  </ul>
                </details>
              )}

              {noteOpen && <Note id={base.id} />}

              <Reviews recipe={base} state={reviews} id="recipe-reviews" className={UNDER_HEADER} />
            </div>
          </div>

          {(related.variants.length > 0 || related.similar.length > 0) && (
            <Section title={related.variants.length ? "Другие варианты и похожие" : "Похожие блюда"} className="px-4 sm:px-0 lg:mt-12">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
                {[...related.variants, ...related.similar].slice(0, 8).map((r, k) => <RecipeTile key={r.id} recipe={r} onOpen={() => openRecipe(r)} className={cx(k >= 6 && "hidden lg:flex")} />)}
              </div>
            </Section>
          )}

          {base.sources && base.sources.length > 0 && (
            <p className="mt-8 px-4 text-caption text-ink-faint sm:px-0">
              Источники: {base.sources.map((src, k) => <span key={k}>{k > 0 && "; "}{src.url ? <a className="underline hover:text-ink" href={src.url} target="_blank" rel="noopener noreferrer nofollow">{src.title}</a> : src.title}</span>)}
            </p>
          )}
        </div>
      </div>

      {/* The bar at the bottom (phones and tablets) */}
      <div ref={bar} className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 shadow-e2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 min-[360px]:gap-3 sm:px-6">
          <button className="btn-outline btn-bar px-4" onClick={() => setMenuOpen(true)}><CalendarPlus size={20} />В план</button>
          <button className="btn-primary btn-bar flex-1 px-4" onClick={cook}>
            <ChefHat size={20} className="max-[359px]:hidden" />
            {cookingThis ? <><span className="max-[359px]:hidden">Продолжить готовить</span><span className="min-[360px]:hidden">Продолжить</span></> : "Начать готовить"}
          </button>
        </div>
      </div>

      {pan && <PanSheet open={panOpen} onClose={() => setPanOpen(false)} pan={pan} onPick={(p) => {
        const k = area(p) / area(pan);
        const n = clampServings(base, Math.max(1, Math.round(base.servings * k)));
        setServings(n);
        setPanOpen(false);
        toast("Под форму " + panText(p) + " — продукты на " + n + " " + plural(n, "порцию", "порции", "порций"));
      }} />}
      {serveOpen && <DinnerSetup open base={base} onClose={() => setServeOpen(false)} />}
      {menuOpen && <AddToMenuSheet recipeId={base.id} servings={servings} onClose={() => setMenuOpen(false)} />}
      {terms.sheet}
      <Sheet open={shareOpen} title="Поделиться рецептом" onClose={() => setShareOpen(false)}>
        <button className="mb-3 flex w-full items-center gap-3 rounded-card border border-line bg-card p-3 text-left hover:border-line-strong disabled:opacity-60" disabled={making}
          onClick={async () => {
            setMaking(true);
            const r = await shareRecipeCard(base, recipePageUrl(base.id));
            setMaking(false);
            if (r === "saved") toast("Картинка сохранена — отправьте её из галереи или загрузок");
            else if (r === "failed") toast("Не получилось нарисовать картинку — отправьте ссылку");
            else setShareOpen(false);
          }}>
          <RecipeImage recipe={base} className="h-14 w-14 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-medium">{making ? "Рисую картинку…" : "Картинкой"}</span>
            <span className="block text-caption text-ink-soft">Фото, название и время — для ВК, ОК и мессенджеров</span>
          </span>
          <ImageIcon size={20} className="shrink-0 text-ink-soft" aria-hidden />
        </button>
        <ShareOptions text={"«" + base.title + "» — рецепт: " + recipePageUrl(base.id)} title={base.title} url={recipePageUrl(base.id)}
          onDone={(copied) => { setShareOpen(false); if (copied !== undefined) toast(copied ? "Ссылка скопирована" : "Ссылка готова"); }}
          onPrint={() => printPage(base.title + " — на " + servings + " " + plural(servings, "порцию", "порции", "порций"), [
            { title: "Как готовить · " + timeShort(base), ordered: true, items: recipe.steps.map((st) => st.text) },
            ...(base.tips.length ? [{ title: "Советы", items: base.tips }] : []),
          ], recipePageUrl(base.id),
          groups.map((g) => ({ title: g.title ?? "Продукты", items: g.rows.map((r) => displayName(r.id, r.name) + " — " + homeAmount(r) + (r.optional ? " (по желанию)" : "")) })))} />
      </Sheet>
      <ProductHelp open={helpOpen} onClose={() => setHelpOpen(false)} rows={groups.flatMap((g) => g.rows)} canSwap={missing > 0}
        onSwap={() => { setHelpOpen(false); ask(swapQuestion); }} />
      <AskSheet open={askOpen} onClose={() => setAskOpen(false)} recipe={askRecipe} servings={servings} prefs={s.preferences} request={askReq}
        onServings={(n) => { setServings(clampServings(base, n)); window.setTimeout(() => go("recipe-products"), 80); }} />
    </Layer>
  );
}

/** The row under the solid header: jump to a section; the nearest running timer on the right. */
function AnchorBar({ show, anchors, active, go, recipeId, goStep }: {
  show: boolean; anchors: typeof ANCHORS; active: string | null; go: (id: string) => void; recipeId: string; goStep: (step: number | null) => void;
}) {
  const timers = useTimers().filter((t) => t.recipeId === recipeId);
  const t = timers.find((x) => x.rang) ?? timers.find((x) => x.end) ?? timers[0];
  const now = useTick(!!t && !!t.end && !t.rang);
  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 h-0">
      <nav aria-label="Разделы рецепта" aria-hidden={!show}
        className={cx("absolute inset-x-0 top-0 border-b border-line bg-paper transition-opacity duration-150", show ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className="mx-auto flex h-11 max-w-3xl items-center px-2 sm:px-4 lg:max-w-[1120px] lg:px-6">
          {anchors.map((a) => (
            <button key={a.id} tabIndex={show ? 0 : -1} onClick={() => go(a.id)} aria-current={active === a.id ? "true" : undefined}
              className={cx("relative h-11 whitespace-nowrap px-2.5 text-small font-semibold transition-colors min-[360px]:px-3", active === a.id ? "text-brand" : "text-ink-soft hover:text-ink")}>
              {a.label}
              {active === a.id && <span aria-hidden className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-brand min-[360px]:inset-x-3" />}
            </button>
          ))}
          <span className="flex-1" />
          {t && (
            <button tabIndex={show ? 0 : -1} onClick={() => goStep(t.step)} aria-label={timerTitle(t) + (t.rang ? ": время вышло" : ": осталось " + mmss(secondsLeft(t, now)))}
              className="grid h-11 shrink-0 place-items-center pl-1">
              <span className={cx("inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-small font-semibold tabular-nums", t.rang ? "bg-brand-fill text-white" : "bg-brand-soft text-brand-ink")}>
                {t.rang ? <BellRing size={16} aria-hidden /> : <Timer size={16} aria-hidden />}{t.rang ? "Готово" : mmss(secondsLeft(t, now))}
                {timers.length > 1 && <span className="text-micro opacity-80">+{timers.length - 1}</span>}
              </span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function Nutrition({ recipe, n, side }: { recipe: Recipe; n: { kcal: number; protein: number; fat: number; carbs: number }; side: boolean }) {
  const allergen = (a: string) => (LABELS[a === "milk" ? "dairy" : a === "egg" ? "eggs" : a] || a).toLowerCase();
  const cells: [ReactNode, number, string][] = [
    ["ккал", n.kcal, ""], ["белки", n.protein, " г"], ["жиры", n.fat, " г"],
    [<><span className="min-[360px]:hidden">углев.</span><span className="max-[359px]:hidden">углеводы</span></>, n.carbs, " г"],
  ];
  return (
    <div className="anim-rise mt-3">
      <dl className="grid grid-cols-4 gap-2">
        {cells.map(([label, v, unit], k) => (
          <div key={k} className="flex flex-col-reverse items-center rounded-input border border-line bg-card px-1 py-2.5 text-center">
            <dt className="whitespace-nowrap text-caption text-ink-soft">{label}</dt>
            <dd className="whitespace-nowrap text-title tabular-nums">{v}{unit && <span className="text-small font-normal text-ink-soft">{unit}</span>}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-caption text-ink-faint">
        На порцию{side ? ", без гарнира" : ""}, по составу.{" "}
        {recipe.allergens.length ? "Аллергены: " + recipe.allergens.map(allergen).join(", ") + "." : "Основных аллергенов нет."}
      </p>
    </div>
  );
}

/** «У вас есть 5 из 7» with a progress line, and «Добавить 2 продукта в покупки». */
function HaveBar({ owned, total, missing, marked, onBuy }: { owned: number; total: number; missing: number; marked: boolean; onBuy: () => void }) {
  // Nothing marked yet: one button, no progress line.
  if (!marked) return missing > 0 ? (
    <button className="btn h-11 w-full border border-line bg-card px-4 text-ink shadow-e1 hover:border-line-strong" onClick={onBuy}>
      <ShoppingCart size={18} className="text-brand" />Добавить {missing} {plural(missing, "продукт", "продукта", "продуктов")} в покупки
    </button>
  ) : null;
  return (
    <div className="rounded-input bg-herb-soft p-3 pl-4 sm:flex sm:items-center sm:gap-4 lg:block">
      <div className="flex min-h-[32px] min-w-0 flex-1 items-center gap-3">
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-body-sm font-semibold text-herb">
          <Check size={18} aria-hidden />{missing ? "У вас есть " + owned + " из " + total : "Всё есть — можно готовить"}
        </span>
        <span className="h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-full bg-herb/15" aria-hidden>
          <span className="block h-full rounded-full bg-herb transition-[width] duration-150" style={{ width: (total ? (owned / total) * 100 : 100) + "%" }} />
        </span>
      </div>
      {missing > 0 && (
        <button className="btn mt-3 h-11 w-full shrink-0 border border-line bg-card px-4 text-ink shadow-e1 hover:border-line-strong sm:mt-0 sm:w-auto lg:mt-3 lg:w-full" onClick={onBuy}>
          <ShoppingCart size={18} className="text-brand" />Добавить {missing} {plural(missing, "продукт", "продукта", "продуктов")} в покупки
        </button>
      )}
    </div>
  );
}

/** «Чего-то нет дома или не едите?»: ask Шеф for a swap, or mark products never to be offered again. */
function ProductHelp({ open, onClose, rows, canSwap, onSwap }: { open: boolean; onClose: () => void; rows: RecipeIngredient[]; canSwap: boolean; onSwap: () => void }) {
  const { s, update } = useStore();
  const staples = basics(s.preferences);
  const list = [...new Map(rows.filter((r) => r.id !== "water" && !staples.has(r.id)).map((r) => [r.id, r])).values()];
  const ex = s.preferences.excluded;
  const toggle = (id: string) => update((st) => ({ ...st, preferences: { ...st.preferences,
    excluded: st.preferences.excluded.includes(id) ? st.preferences.excluded.filter((x) => x !== id) : [...st.preferences.excluded, id] } }));
  return (
    <Sheet open={open} title="Подскажу" onClose={onClose}>
      {canSwap && <button className="btn-outline w-full justify-start" onClick={onSwap}><MessageCircle size={18} />Чем заменить то, чего нет дома</button>}
      <h3 className={cx("text-title", canSwap && "mt-6")}>Что-то не едите?</h3>
      <p className="mt-1 text-body-sm text-ink-soft">Отметьте — больше не буду предлагать блюда с этим. Вернуть можно в профиле, в «Ограничениях».</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {list.map((r) => {
          const on = ex.includes(r.id);
          return <button key={r.id} aria-pressed={on} className={cx("chip", on && "border-warn bg-warn-soft line-through")} onClick={() => toggle(r.id)}>{displayName(r.id, r.name)}</button>;
        })}
      </div>
      <button className="btn-primary mt-6 w-full" onClick={onClose}>Готово</button>
    </Sheet>
  );
}

/** One product: tap marks «есть дома». */
function Row({ i, own, flash, first, onToggle }: { i: RecipeIngredient; own: boolean; flash?: boolean; first: boolean; onToggle: () => void }) {
  const q = homeQuantity(i);
  return (
    <li className={cx(!first && "border-t border-line")}>
      <button className={cx("flex min-h-[52px] w-full items-center gap-1 rounded-input py-1 pr-3 text-left lg:min-h-[44px] lg:py-0.5", flash && "anim-flash")} onClick={onToggle} aria-pressed={own}>
        <span className="grid h-11 w-11 shrink-0 place-items-center" aria-hidden>
          <span className={cx("grid h-6 w-6 place-items-center rounded-full border-2 transition-colors duration-150", own ? "border-herb bg-herb text-paper" : "border-line-strong")}>
            {own && <Check size={14} strokeWidth={3} />}
          </span>
        </span>
        <span className="min-w-0 flex-1 py-1.5">
          <span className="text-body-sm">{displayName(i.id, i.name)}</span>
          {i.optional && <span className="text-caption text-ink-faint"> · по желанию</span>}
          {/* A swap only matters when the product is missing. */}
          {own && <span className="sr-only"> — есть дома</span>}
        </span>
        <span className="shrink-0 pl-2 text-right">
          <span className={cx("block whitespace-nowrap text-body-sm tabular-nums", q.toTaste ? "text-ink-faint" : "text-ink-soft")}>{q.text}</span>
          {q.grams ? <span className="block whitespace-nowrap text-caption text-ink-faint">{q.grams}</span>
            : q.hint && <span className="block whitespace-nowrap text-caption text-ink-faint">≈ {q.hint}</span>}
        </span>
      </button>
    </li>
  );
}

/** «Спросить Шефа» about this recipe: opens the sheet with ready questions. */
function AskCard({ ask }: { ask: (text?: string) => void }) {
  return (
    // One line; the ready questions are in the sheet it opens.
    <section className="mt-8" aria-label="Спросить Шефа">
      <button className="flex min-h-[56px] w-full items-center gap-3 rounded-card bg-brand-soft px-3 py-2 text-left" onClick={() => ask()}>
        <ChefAvatar size={36} />
        <span className="min-w-0 flex-1 text-body-sm font-medium">Спросить Шефа про этот рецепт</span>
        <ChevronRight size={20} className="shrink-0 text-brand" aria-hidden />
      </button>
    </section>
  );
}

/** The timer of a step: start it, then it counts down here and in the timer row. */
function TimerChip({ recipe, step, text, seconds }: { recipe: Recipe; step: number; text: string; seconds: number }) {
  const t = useTimers().find((x) => x.recipeId === recipe.id && x.step === step);
  const now = useTick(!!t && !!t.end && !t.rang);
  const [menu, setMenu] = useState<CookTimer | null>(null);
  const length = seconds < 60 ? seconds + " сек" : seconds % 60 ? Math.floor(seconds / 60) + " мин " + (seconds % 60) + " сек" : formatMinutes(seconds / 60);
  if (!t)
    return (
      <button className="chip mt-3 h-10 text-small font-semibold text-brand-ink" aria-label={"Запустить таймер на " + length}
        onClick={() => startTimer({ dish: recipe.title, recipeId: recipe.id, step, label: stepLabel(text), seconds })}>
        <Timer size={18} className="text-brand" aria-hidden />Таймер · {length}
      </button>
    );
  const left = secondsLeft(t, now);
  const paused = t.pausedLeft != null;
  return (
    <>
      <button className={cx("chip mt-3 h-10 font-semibold tabular-nums", t.rang ? "border-brand-fill bg-brand-fill text-white hover:border-brand-fill" : "chip-on")}
        onClick={() => (t.rang ? stopTimer(t.id) : setMenu(t))}
        aria-label={t.rang ? "Время вышло. Убрать таймер" : "Таймер: осталось " + mmss(left) + (paused ? ", на паузе" : "") + ". Действия"}>
        {t.rang ? <BellRing size={18} aria-hidden /> : paused ? <Pause size={18} aria-hidden /> : <Timer size={18} aria-hidden />}
        {t.rang ? <>Готово<X size={16} aria-hidden /></> : mmss(left)}
      </button>
      <Sheet open={!!menu} title={"Шаг " + (step + 1) + " · таймер"} onClose={() => setMenu(null)}>
        <div className="grid gap-2">
          <button className="btn-outline justify-start" onClick={() => { addMinute(t.id); setMenu(null); }}><Plus size={18} />Добавить минуту</button>
          <button className="btn-outline justify-start" onClick={() => { togglePause(t.id); setMenu(null); }}>{paused ? <><Play size={18} />Продолжить</> : <><Pause size={18} />Пауза</>}</button>
          <button className="btn-outline justify-start" onClick={() => { stopTimer(t.id); setMenu(null); }}><X size={18} />Остановить</button>
        </div>
      </Sheet>
    </>
  );
}

/** «Моя заметка»: kept on the device, saved as you type. */
function Note({ id }: { id: string }) {
  const { s, update } = useStore();
  const saved = s.notes[id] ?? "";
  const [text, setText] = useState(saved);
  const latest = useRef({ text, saved });
  latest.current = { text, saved };
  const save = (v: string) => {
    const t = v.trim();
    update((st) => {
      if ((st.notes[id] ?? "") === t) return st;
      const notes = { ...st.notes };
      if (t) notes[id] = t; else delete notes[id];
      return { ...st, notes };
    });
  };
  useEffect(() => {
    if (text.trim() === saved) return;
    const t = window.setTimeout(() => save(text), 600);
    return () => window.clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (latest.current.text.trim() !== latest.current.saved) save(latest.current.text); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Shown once wanted (the «Заметка для себя» button under the steps) or when there is one.
  return (
    <Section title="Моя заметка" id="recipe-note" className={UNDER_HEADER}>
      <textarea className="input min-h-[96px]" aria-label="Моя заметка к рецепту" placeholder="Например: соли меньше, добавить чеснок" value={text} maxLength={500}
        autoFocus={!saved} onChange={(e) => setText(e.target.value)} onBlur={() => save(text)} />
      <p className="mt-1.5 text-caption text-ink-faint">Видна только вам. Сохраняется сама. Покажу её вверху рецепта в следующий раз.</p>
    </Section>
  );
}


/** «У вас другая форма?»: products are recounted by the form's area. */
function PanSheet({ open, onClose, pan, onPick }: { open: boolean; onClose: () => void; pan: Pan; onPick: (p: Pan) => void }) {
  const group = (kind: Pan["kind"]) => PAN_CHOICES.filter((p) => p.kind === kind);
  const same = (p: Pan) => panText(p) === panText(pan);
  return (
    <Sheet open={open} title="Какая у вас форма?" onClose={onClose}>
      <p className="text-body-sm text-ink-soft">В рецепте — {pan.kind === "round" ? "круглая " : ""}форма {panText(pan)}. Выберите свою — пересчитаю продукты.</p>
      {(["round", "rect"] as const).map((kind) => (
        <div key={kind} className="mt-4">
          <p className="label mb-2">{kind === "round" ? "Круглая, диаметр" : "Прямоугольная"}</p>
          <div className="flex flex-wrap gap-2">{group(kind).map((p) => <Chip key={panText(p)} on={same(p)} onClick={() => onPick(p)}>{panText(p)}</Chip>)}</div>
        </div>
      ))}
      <p className="mt-4 text-caption text-ink-faint">Время проверяйте шпажкой: в большой форме слой тоньше и печётся быстрее, в маленькой — дольше.</p>
    </Sheet>
  );
}
