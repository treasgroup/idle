import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, X, BookOpen } from "lucide-react";
import {
  CATALOG_SECTIONS, freshConditions, isLenten, nutritionOf, rankRecipes, recipeById, recipes, reviewsApi, searchRecipes, type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { RecipeRow } from "../components/RecipeCard";
import { Chip, Empty, cx } from "../components/ui";

type Filter = { id: string; label: string; test: (r: Recipe) => boolean };
const FILTERS: Filter[] = [
  { id: "quick", label: "⚡ До 30 мин", test: (r) => r.totalMinutes <= 30 },
  { id: "easy", label: "👌 Просто", test: (r) => r.difficulty === "easy" },
  { id: "cheap", label: "💰 Бюджетно", test: (r) => r.budget === "low" },
  { id: "few", label: "🧺 До 6 продуктов", test: (r) => r.ingredients.filter((i) => !i.optional && !["water", "salt", "black-pepper", "vegetable-oil", "sunflower-oil", "sugar"].includes(i.id)).length <= 6 },
  { id: "protein", label: "💪 От 25 г белка", test: (r) => nutritionOf(r).perServing.protein >= 25 },
  { id: "light", label: "🥗 До 500 ккал", test: (r) => { const k = nutritionOf(r).perServing.kcal; return k > 0 && k <= 500; } },
  { id: "veg", label: "🌱 Без мяса", test: (r) => r.tags.includes("vegetarian") },
  { id: "lent", label: "⛪ Постное", test: (r) => isLenten(r) },
  { id: "kids", label: "👶 Детям", test: (r) => r.kids === true },
  { id: "ahead", label: "📦 Впрок", test: (r) => (r.storageDays ?? 0) >= 3 || !!r.freezerDays },
];

type View = "all" | "saved" | "book";

export function Recipes() {
  const { s, catalog, online } = useStore();
  const { openRecipe, isFavorite } = useActions();
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const [section, setSection] = useState<string | null>(null);
  const [on, setOn] = useState<string[]>([]);
  const [limit, setLimit] = useState(30);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  useEffect(() => { if (online) reviewsApi.ratings().then(setRatings).catch(() => {}); }, [online]);
  useEffect(() => setLimit(30), [query, section, on, view]);

  const ranked = useMemo(() => {
    const c = freshConditions({ servings: s.conditions.servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian });
    return rankRecipes(recipes(), c, s.preferences, Infinity).map((m) => m.recipe);
  }, [s.preferences, s.conditions.servings, catalog.version, s.taste]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    let base: Recipe[] =
      view === "saved" ? s.favorites.map((f) => recipeById(f.id) ?? f)
      : view === "book" ? [...new Map([...s.book].reverse().map((b) => [b.recipeId, recipeById(b.recipeId)])).values()].filter((r): r is Recipe => !!r)
      : query.trim() ? searchRecipes(query) : ranked;
    if (section) { const sec = CATALOG_SECTIONS.find((x) => x.key === section); if (sec) base = base.filter(sec.test); }
    for (const id of on) { const f = FILTERS.find((x) => x.id === id); if (f) base = base.filter(f.test); }
    return base;
  }, [view, s.favorites, s.book, query, ranked, section, on]);

  const cooked = useMemo(() => new Map(s.book.map((b) => [b.recipeId, b.at])), [s.book]);
  const sections = CATALOG_SECTIONS.filter((x) => x.group === "dish" || x.group === "situation");

  return (
    <div className="pb-6">
      <div className="sticky top-[57px] z-20 bg-paper/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="input pl-10 pr-10" placeholder={"Найти среди " + catalog.count + " рецептов"} value={q} onChange={(e) => { setQ(e.target.value); setView("all"); }} aria-label="Поиск рецептов" />
          {q && <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-faint" onClick={() => setQ("")} aria-label="Очистить"><X size={18} /></button>}
        </div>
        <div className="mt-2 flex gap-1 rounded-full bg-line/50 p-1 text-sm">
          {([["all", "Все"], ["saved", "Сохранённое · " + s.favorites.length], ["book", "Моя книга"]] as [View, string][]).map(([k, l]) => (
            <button key={k} className={cx("flex-1 rounded-full py-1.5", view === k ? "bg-card font-semibold shadow-sm" : "text-ink-soft")} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="scroll-x px-4 pt-1">
        <Chip on={!section} onClick={() => setSection(null)}>Все блюда</Chip>
        {sections.map((x) => <Chip key={x.key} on={section === x.key} onClick={() => setSection(section === x.key ? null : x.key)}>{x.label}</Chip>)}
      </div>
      <div className="scroll-x mt-2 px-4">
        {FILTERS.map((f) => <Chip key={f.id} on={on.includes(f.id)} onClick={() => setOn((o) => (o.includes(f.id) ? o.filter((x) => x !== f.id) : [...o, f.id]))}>{f.label}</Chip>)}
      </div>

      <div className="mt-3 px-4 text-xs text-ink-faint">{list.length ? list.length + " " + (list.length % 10 === 1 && list.length % 100 !== 11 ? "рецепт" : [2, 3, 4].includes(list.length % 10) && ![12, 13, 14].includes(list.length % 100) ? "рецепта" : "рецептов") : ""}</div>
      {list.length === 0 ? (
        view === "saved" ? <Empty icon={<BookOpen />} title="Здесь будут сохранённые рецепты">Нажмите ♡ на странице рецепта.</Empty>
        : view === "book" ? <Empty icon={<BookOpen />} title="«Моя книга» пока пуста">Всё, что вы приготовите в режиме готовки, появится здесь — с датой и вашими заметками.</Empty>
        : <Empty title="Ничего не нашлось">Попробуйте другое слово или уберите часть фильтров.</Empty>
      ) : (
        <div className="mt-2 space-y-2 px-4">
          {list.slice(0, limit).map((r) => (
            <RecipeRow key={r.id} recipe={r} favorite={isFavorite(r.id)} rating={ratings[r.id]} onOpen={() => openRecipe(r)}
              note={view === "book" && cooked.has(r.id) ? "Готовили " + new Date(cooked.get(r.id)!).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + (s.notes[r.id] ? " · " + s.notes[r.id] : "") : s.notes[r.id] ? "📝 " + s.notes[r.id] : r.summary} />
          ))}
          {list.length > limit && <button className="btn-outline w-full" onClick={() => setLimit((l) => l + 30)}>Показать ещё</button>}
        </div>
      )}
    </div>
  );
}
