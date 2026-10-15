// «Рецепты»: search, saved dishes and «Моя книга», dish types and filters. Long or vague queries go to Шеф.
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, BookOpen, Heart, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import {
  CATALOG_SECTIONS, freshConditions, isLenten, mealsOf, nutritionOf, plural, rankRecipes, recipeById, recipes, reviewsApi, searchRecipes,
  type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { takeRecipesView } from "../app/router";
import { RecipeRow, RecipeTile } from "../components/RecipeCard";
import { ChefAvatar, Chip, Empty, Sheet, cx } from "../components/ui";
import { mealNow } from "./Home";

type View = "all" | "saved" | "book";
type Test = (r: Recipe) => boolean;
interface Filter { id: string; label: string; test: Test; device?: boolean }
interface Filters { time: number | null; on: string[] }

const section = (key: string): Test => CATALOG_SECTIONS.find((x) => x.key === key)?.test ?? (() => true);
const DISHES = CATALOG_SECTIONS.filter((x) => x.group === "dish");
const STAPLES = new Set(["water", "salt", "black-pepper", "vegetable-oil", "sunflower-oil", "sugar"]);
const TIMES = [{ min: 15, label: "До 15 мин" }, { min: 30, label: "До 30 мин" }, { min: 60, label: "До 1 часа" }];

// One place for every filter: no chip appears twice.
const GROUPS: { title: string; items: Filter[] }[] = [
  { title: "Калории и белок", items: [
    { id: "light", label: "До 500 ккал", test: (r) => { const k = nutritionOf(r).perServing.kcal; return k > 0 && k <= 500; } },
    { id: "protein", label: "От 25 г белка", test: (r) => nutritionOf(r).perServing.protein >= 25 },
  ] },
  { title: "Для кого", items: [
    { id: "kids", label: "Детям", test: (r) => r.kids === true },
    { id: "guests", label: "Для гостей", test: section("guests") },
  ] },
  { title: "Питание", items: [
    { id: "veg", label: "Без мяса", test: (r) => r.tags.includes("vegetarian") },
    { id: "lent", label: "Постное", test: (r) => isLenten(r) },
  ] },
  { title: "Удобство", items: [
    { id: "easy", label: "Просто готовить", test: (r) => r.difficulty === "easy" },
    { id: "few", label: "До 6 продуктов", test: (r) => r.ingredients.filter((i) => !i.optional && !STAPLES.has(i.id)).length <= 6 },
    { id: "simple", label: "Из простых продуктов", test: (r) => r.budget === "low" },
    { id: "ahead", label: "Впрок", test: (r) => (r.storageDays ?? 0) >= 3 || !!r.freezerDays },
  ] },
  { title: "Техника", items: [
    { id: "no-oven", label: "Без духовки", test: (r) => !r.appliances.includes("oven") },
    // Devices: any of the chosen ones (people who have both want dishes for either).
    { id: "multicooker", label: "Мультиварка", test: (r) => r.appliances.includes("multicooker"), device: true },
    { id: "airfryer", label: "Аэрогриль", test: (r) => r.appliances.includes("airfryer"), device: true },
    { id: "microwave", label: "Микроволновка", test: (r) => r.appliances.includes("microwave"), device: true },
  ] },
];
const ALL = GROUPS.flatMap((g) => g.items);
const NONE: Filters = { time: null, on: [] };

function applyFilters(list: Recipe[], f: Filters, dish: string | null): Recipe[] {
  const tests: Test[] = [];
  if (dish) tests.push(section(dish));
  if (f.time) { const t = f.time; tests.push((r) => r.totalMinutes <= t); }
  const chosen = ALL.filter((x) => f.on.includes(x.id));
  for (const x of chosen) if (!x.device) tests.push(x.test);
  const devices = chosen.filter((x) => x.device);
  if (devices.length) tests.push((r) => devices.some((x) => x.test(r)));
  return tests.length ? list.filter((r) => tests.every((t) => t(r))) : list;
}

// A query that reads like a request ("быстрый ужин из фарша", "курица, 30 мин", "хочу уютного") is better answered by Шеф.
const MOOD = /(груст|уютн|устал|холодн|жарк|л[её]гк|сытн|остреньк|праздн|гост|романт|вдво[её]м|настроени|на скорую|побыстр|вкусненьк|согре|лень|хочется|хочу)/i;
const wantsChef = (q: string, hits: number, all: boolean) =>
  !!q && (q.includes(",") || q.split(/\s+/).length >= 3 || /\d+\s*мин/i.test(q) || MOOD.test(q) || (all && hits <= 3));

const recipesWord = (n: number) => plural(n, "рецепт", "рецепта", "рецептов");
const PAGE = 36;

function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => typeof matchMedia !== "undefined" && matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const f = () => setOn(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [query]);
  return on;
}

export function Recipes() {
  const { s, catalog, online, profile } = useStore();
  const { openRecipe, isFavorite } = useActions();
  const a = useAssistant();
  const tiles = useMedia("(min-width: 640px)");
  const desktop = useMedia("(min-width: 1024px)");
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const [dish, setDish] = useState<string | null>(null);
  const [f, setF] = useState<Filters>(NONE);
  const [sheet, setSheet] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const input = useRef<HTMLInputElement>(null);

  // The home screen's «Все» under «Сохранённое» opens this tab on the saved view.
  useLayoutEffect(() => { const v = takeRecipesView(); if (v === "saved" || v === "book") setView(v); }, []);
  useEffect(() => { if (online) reviewsApi.ratings().then(setRatings).catch(() => {}); }, [online]);
  useEffect(() => setLimit(PAGE), [query, dish, f, view]);

  // Default order: dishes for the current meal first, then the best rated, then the engine's own ranking.
  const ranked = useMemo(() => {
    const meal = mealNow();
    const c = freshConditions({ servings: profile.eaters, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian });
    const score = (id: string) => { const x = ratings[id]; return x && x.count ? (x.avg * x.count + 4 * 3) / (x.count + 3) : 4; };
    return rankRecipes(recipes(), { ...c, servings: profile.eaters }, s.preferences, Infinity, { meal })
      .map((m, i) => ({ r: m.recipe, i, fit: mealsOf(m.recipe).includes(meal) ? 0 : 1, score: score(m.recipe.id) }))
      .sort((x, y) => x.fit - y.fit || y.score - x.score || x.i - y.i)
      .map((x) => x.r);
  }, [s.preferences, profile.eaters, catalog.version, s.taste, ratings]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = useMemo(() => s.favorites.map((x) => recipeById(x.id) ?? x), [s.favorites, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const book = useMemo(() => [...new Map([...s.book].reverse().map((b) => [b.recipeId, recipeById(b.recipeId)])).values()].filter((r): r is Recipe => !!r),
    [s.book, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const cooked = useMemo(() => new Map(s.book.map((b) => [b.recipeId, b.at])), [s.book]);

  const base = view === "saved" ? saved : view === "book" ? book : ranked;
  // Search goes over the whole catalog in «Все», and inside the list in the other views.
  const found = useMemo(() => (query ? (view === "all" ? searchRecipes(query) : searchRecipes(query, base)) : base), [query, view, base]);
  const list = useMemo(() => applyFilters(found, f, dish), [found, f, dish]);
  // Device chips appear only when the catalog has dishes for them.
  const devices = useMemo(() => new Set(ALL.filter((x) => x.device && ranked.some(x.test)).map((x) => x.id)), [ranked]);

  const active = [
    ...(f.time ? [{ id: "time", label: TIMES.find((t) => t.min === f.time)?.label ?? "", off: () => setF((x) => ({ ...x, time: null })) }] : []),
    ...ALL.filter((x) => f.on.includes(x.id)).map((x) => ({ id: x.id, label: x.label, off: () => setF((y) => ({ ...y, on: y.on.filter((i) => i !== x.id) })) })),
  ];
  const filtered = active.length > 0 || !!dish;
  const reset = () => { setF(NONE); setDish(null); };
  const handoff = wantsChef(q.trim(), list.length, view === "all");

  const ask = (text: string) => { void a.ask(text, { fresh: true }); goChat(); };
  // Without a query, Шеф gets the filters in words: «супы, до 30 мин, детям».
  const askFromFilters = () => ask(q.trim() || [DISHES.find((x) => x.key === dish)?.label, ...active.map((x) => x.label)].filter(Boolean).join(", ").toLowerCase() || "что приготовить?");

  const note = (r: Recipe) => {
    const mine = s.notes[r.id];
    if (view === "book" && cooked.has(r.id))
      return "Готовили " + new Date(cooked.get(r.id)!).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + (mine ? " · " + mine : "");
    return mine ? "Заметка: " + mine : undefined;
  };
  const tileNote = (r: Recipe) => {
    const n = note(r);
    if (n) return n;
    const x = ratings[r.id];
    return x && x.count ? "★ " + x.avg.toFixed(1).replace(".", ",") : undefined;
  };

  const countLine = query
    ? "Нашлось: " + list.length + " " + recipesWord(list.length)
    : view === "saved" ? "Сохранено: " + list.length + " " + recipesWord(list.length)
      : view === "book" ? "Приготовлено: " + list.length + " " + recipesWord(list.length)
        : "Подходит вам: " + list.length + " " + recipesWord(list.length);

  const dishChips = (
    <>
      <Chip on={!dish} onClick={() => setDish(null)}>Все блюда</Chip>
      {DISHES.map((x) => <Chip key={x.key} on={dish === x.key} onClick={() => setDish(dish === x.key ? null : x.key)}>{x.label}</Chip>)}
    </>
  );

  return (
    <div className="pb-4">
      <h1 className="pt-2 text-h1 sm:pt-0">Рецепты</h1>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-4">
        <form role="search" onSubmit={(e) => { e.preventDefault(); input.current?.blur(); }} className="relative">
          <Search size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти рецепт" aria-label="Найти рецепт"
            enterKeyHint="search" autoComplete="off" spellCheck={false}
            onKeyDown={(e) => { if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); } }}
            className="h-12 w-full rounded-input bg-sunken pl-11 pr-12 text-body text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint hover:bg-line/60 focus:bg-card focus:ring-2 focus:ring-brand/30" />
          {q && <button type="button" className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Очистить поиск"><X size={20} /></button>}
        </form>
        <ViewSwitch value={view} onChange={setView} counts={{ saved: saved.length, book: book.length }} />
      </div>

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        {desktop && (
          <aside aria-label="Фильтры" className="self-start lg:sticky lg:top-8">
            <div className="flex min-h-[44px] items-center justify-between gap-2">
              <h2 className="text-h2">Фильтры</h2>
              {filtered && <button className="-mr-2 h-11 rounded-full px-3 text-small font-semibold text-brand hover:bg-brand-soft" onClick={reset}>Сбросить</button>}
            </div>
            <div className="mt-3">
              <Group title="Блюда">{dishChips}</Group>
              <FilterFields f={f} set={setF} devices={devices} />
            </div>
          </aside>
        )}

        <div className="min-w-0">
          {!desktop && (
            <div className="scroller fade-x -mx-4 !gap-2 px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]" aria-label="Блюда и фильтры">
              <button type="button" className={cx("chip", active.length > 0 && "chip-on")} onClick={() => setSheet(true)} aria-haspopup="dialog">
                <SlidersHorizontal size={18} aria-hidden />Фильтры{active.length > 0 && " · " + active.length}
              </button>
              {dishChips}
            </div>
          )}

          {active.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 lg:mt-0 lg:mb-4">
              {active.map((x) => (
                <button key={x.id} type="button" className="chip chip-on pr-2.5" onClick={x.off} aria-label={"Убрать фильтр: " + x.label}>
                  {x.label}<X size={16} aria-hidden />
                </button>
              ))}
              <button type="button" className="h-10 rounded-full px-3 text-small font-semibold text-brand hover:bg-brand-soft" onClick={reset}>Сбросить всё</button>
            </div>
          )}

          <p className={cx("text-small text-ink-soft", desktop ? "flex min-h-[44px] items-center" : "mt-4")} aria-live="polite">{countLine}</p>

          {list.length === 0 ? (
            view === "saved" && !query && !filtered ? (
              <Empty icon={<Heart size={48} strokeWidth={1.5} />} title="Здесь будут сохранённые рецепты"
                actions={<button className="btn-outline" onClick={() => setView("all")}>Смотреть все рецепты</button>}>
                Сохраняйте понравившиеся блюда сердечком на странице рецепта.
              </Empty>
            ) : view === "book" && !query && !filtered ? (
              <Empty icon={<BookOpen size={48} strokeWidth={1.5} />} title="«Моя книга» пока пуста"
                actions={<button className="btn-outline" onClick={() => setView("all")}>Выбрать рецепт</button>}>
                Всё, что вы приготовите в режиме готовки, появится здесь — с датой и вашими заметками.
              </Empty>
            ) : (
              <Empty icon={<SearchX size={48} strokeWidth={1.5} />} title="Ничего не нашлось"
                actions={<>
                  <button className="btn-primary" onClick={askFromFilters}><ChefAvatar size={24} />Спросить Шефа</button>
                  {filtered && <button className="btn-outline" onClick={reset}>Сбросить фильтры</button>}
                </>}>
                {query ? "Шеф поймёт запрос своими словами и подберёт похожее." : "Уберите часть фильтров или спросите Шефа."}
              </Empty>
            )
          ) : (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-0 lg:grid-cols-3 lg:gap-5 min-[1360px]:grid-cols-4">
                {handoff && (
                  <button type="button" onClick={() => ask(q.trim())}
                    className="flex min-h-[72px] items-center gap-3 rounded-card bg-brand-soft p-3 pr-4 text-left transition-transform duration-150 active:scale-[.99] sm:col-span-full">
                    <ChefAvatar size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-body-sm font-semibold text-brand-ink">Спросить Шефа: «{q.trim()}»</span>
                      <span className="mt-0.5 block text-caption text-ink-soft">Подберёт по продуктам, времени и настроению</span>
                    </span>
                    <ArrowUpRight size={20} className="shrink-0 text-brand" aria-hidden />
                  </button>
                )}
                {list.slice(0, limit).map((r) => tiles
                  ? <RecipeTile key={r.id} recipe={r} note={tileNote(r)} onOpen={() => openRecipe(r)} />
                  : <RecipeRow key={r.id} recipe={r} favorite={isFavorite(r.id)} rating={ratings[r.id]} note={note(r) ?? r.summary} onOpen={() => openRecipe(r)} />)}
              </div>
              {list.length > limit && (
                <div className="mt-6 flex justify-center">
                  <button className="btn-outline w-full sm:w-auto" onClick={() => setLimit((n) => n + PAGE)}>
                    Показать ещё {Math.min(PAGE, list.length - limit)}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={sheet && !desktop} title="Фильтры" onClose={() => setSheet(false)}
        footer={
          <div className="flex items-center gap-2">
            <button className="btn-ghost" disabled={!active.length} onClick={() => setF(NONE)}>Сбросить</button>
            <button className="btn-primary btn-bar flex-1" disabled={!list.length} onClick={() => setSheet(false)}>
              {list.length ? "Показать " + list.length + " " + recipesWord(list.length) : "Нет подходящих рецептов"}
            </button>
          </div>
        }>
        <FilterFields f={f} set={setF} devices={devices} />
      </Sheet>
    </div>
  );
}

/** Все / Сохранённые / Моя книга: a radio group; the label width does not jump when it turns bold. */
function ViewSwitch({ value, onChange, counts }: { value: View; onChange: (v: View) => void; counts: { saved: number; book: number } }) {
  const opts: { id: View; label: string; count?: number }[] = [
    { id: "all", label: "Все" }, { id: "saved", label: "Сохранённые", count: counts.saved }, { id: "book", label: "Моя книга", count: counts.book },
  ];
  const ref = useRef<HTMLDivElement>(null);
  const key = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = (opts.findIndex((o) => o.id === value) + d + opts.length) % opts.length;
    onChange(opts[i].id);
    ref.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[i]?.focus();
  };
  return (
    <div ref={ref} role="radiogroup" aria-label="Какие рецепты показать" onKeyDown={key} className="flex h-12 gap-1 rounded-full bg-sunken p-1">
      {opts.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onChange(o.id)}
            className={cx("inline-flex min-w-0 flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-small transition-colors duration-150",
              on ? "bg-card font-semibold text-ink shadow-e1" : "text-ink-soft hover:text-ink")}>
            <span className="grid">
              <span className="col-start-1 row-start-1">{o.label}</span>
              <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">{o.label}</span>
            </span>
            {!!o.count && <span className={cx("rounded-full px-1.5 text-micro tabular-nums text-ink-soft max-[374px]:hidden", on ? "bg-sunken" : "bg-paper")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-6 first:mt-0">
      <legend className="label mb-3">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** The filters themselves: in the sheet on phones and tablets, in the left column on desktop. */
function FilterFields({ f, set, devices }: { f: Filters; set: (f: Filters) => void; devices: Set<string> }) {
  const toggle = (id: string) => set({ ...f, on: f.on.includes(id) ? f.on.filter((x) => x !== id) : [...f.on, id] });
  return (
    <div>
      <Group title="Время">
        {TIMES.map((t) => <Chip key={t.min} on={f.time === t.min} onClick={() => set({ ...f, time: f.time === t.min ? null : t.min })}>{t.label}</Chip>)}
      </Group>
      {GROUPS.map((g) => {
        const items = g.items.filter((x) => !x.device || devices.has(x.id) || f.on.includes(x.id));
        return (
          <Group key={g.title} title={g.title}>
            {items.map((x) => <Chip key={x.id} on={f.on.includes(x.id)} onClick={() => toggle(x.id)}>{x.label}</Chip>)}
          </Group>
        );
      })}
    </div>
  );
}
