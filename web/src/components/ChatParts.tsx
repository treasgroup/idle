// Pieces of the conversation with Шеф: messages, the condition bar, suggestion cards, mood tiles, the pantry picker.
import { useMemo, useState } from "react";
import { ArrowUpRight, X, Search, Clock, Snowflake, Egg, Soup, Sparkles, Refrigerator } from "lucide-react";
import {
  LABELS, addToFridge, conditionLabel, expiringSoon, freshConditions, ingredientOptions, pantryGroups, recipeById, searchIngredients, shortName,
  DEFAULT_CONDITIONS, type ChatMessage, type ChatOption, type Conditions,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { chipLabel, tidyReply, MOOD_LABEL } from "../app/chatText";
import { RecipeFeatured, RecipeRow } from "./RecipeCard";
import { ChefAvatar, Chip, Sheet, cx } from "./ui";
import { AddToMenuSheet } from "./AddToMenu";
import { ProductTiles, useFrequent } from "./ProductTiles";

/** One message. Results: the best one big, the rest as rows; follow-up chips only under the last message. */
export function Message({ m, last, onOption }: { m: ChatMessage; last: boolean; onOption: (o: ChatOption) => void }) {
  const { isFavorite, toggleFavorite, openRecipe } = useActions();
  const a = useAssistant();
  const { s } = useStore();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  if (m.role === "user")
    return (
      <article className="anim-rise flex justify-end" aria-label="Вы">
        <p className="max-w-[85%] whitespace-pre-line rounded-[20px] rounded-br-md bg-brand-soft px-4 py-2.5 text-body text-ink">{m.text}</p>
      </article>
    );
  // `reason` falls back to the dish summary; only a real "why it fits" gets the green tick.
  const results = (m.results ?? []).map((r) => {
    const recipe = recipeById(r.id);
    return { ...r, recipe, why: r.note || (r.reason && r.reason !== recipe?.summary ? r.reason : "") };
  }).filter((r) => r.recipe);
  const open = (id: string) => { a.opened(id, s.conditions.servings); openRecipe(id); };
  const options = (m.options ?? []).map((o) => ({ ...o, label: chipLabel(o.label) })).filter((o): o is ChatOption => !!o.label);
  return (
    <article className="anim-rise" aria-label="Шеф">
      <div className="min-w-0 space-y-3">
        <p className="w-fit max-w-[85%] whitespace-pre-line rounded-[20px] rounded-bl-md border border-line bg-card px-4 py-2.5 text-body">{tidyReply(m.text)}</p>
        {results[0]?.recipe && (
          <RecipeFeatured recipe={results[0].recipe} note={results[0].why || undefined} onOpen={() => open(results[0].id)}
            onMenu={() => setMenuFor(results[0].id)} onSave={() => toggleFavorite(results[0].recipe!)} saved={isFavorite(results[0].id)} />
        )}
        {results.length > 1 && (
          <div className="grid gap-2 lg:grid-cols-2">
            {results.slice(1).map((r) => <RecipeRow key={r.id} recipe={r.recipe!} note={r.why || r.recipe!.summary} favorite={isFavorite(r.id)} onOpen={() => open(r.id)} />)}
          </div>
        )}
        {last && options.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">{options.map((o) => <Chip key={o.label} onClick={() => onOption(o)}>{o.label}</Chip>)}</div>
        )}
      </div>
      {menuFor && <AddToMenuSheet recipeId={menuFor} onClose={() => setMenuFor(null)} />}
    </article>
  );
}

export function Typing() {
  return (
    <div className="flex items-center gap-3" role="status" aria-label="Шеф печатает">
      <span className="hidden sm:block"><ChefAvatar size={28} /></span>
      <span className="typing rounded-full bg-card px-3 py-2 shadow-e1"><i /><i /><i /></span>
    </div>
  );
}

/** What Шеф is taking into account right now, each with a ✕ to drop it. */
export function ConditionBar() {
  const { s, profile } = useStore();
  const a = useAssistant();
  const c = s.conditions;
  const items: { label: string; relax?: string; next?: Conditions }[] = [];
  if (c.maxMinutes) items.push({ label: "до " + c.maxMinutes + " мин", relax: "time" });
  for (const d of c.desired) items.push({ label: conditionLabel(d), relax: "desired:" + d });
  for (const e of c.excluded) if (!s.preferences.excluded.includes(e)) items.push({ label: "без: " + conditionLabel(e), relax: "unexclude:" + e });
  if (c.mood) items.push({ label: (MOOD_LABEL[c.mood] ?? LABELS[c.mood] ?? c.mood).toLowerCase(), relax: "mood" });
  if (c.strictPantry) items.push({ label: "только из того, что дома", relax: "strict" });
  if (c.maxKcal) items.push({ label: "до " + c.maxKcal + " ккал", relax: "kcal" });
  if (c.minProtein) items.push({ label: "белка от " + c.minProtein + " г", relax: "protein" });
  if (c.occasion) items.push({ label: ({ kids: "детям", guests: "для гостей", date: "вдвоём" } as Record<string, string>)[c.occasion] ?? c.occasion, relax: "occasion" });
  if (!c.appliances.includes("oven") && s.preferences.appliances.includes("oven")) items.push({ label: "без духовки", relax: "appliances:all" });
  if (c.available.length) items.push({ label: "есть: " + c.available.slice(0, 3).map((id) => shortName(id).toLowerCase()).join(", ") + (c.available.length > 3 ? "…" : ""), next: { ...c, available: [], strictPantry: false } });
  const servings = c.servings !== profile.eaters ? c.servings : null;
  // Only under a pick of recipes: after a kitchen question («сколько варить гречку») the old conditions are noise.
  const last = [...s.conversation].reverse().find((m) => m.role === "assistant");
  if (!last?.results?.length) return null;
  if (!items.length && !servings) return null;
  return (
    <div className="scroller fade-x -mx-4 mb-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]" aria-label="Учитываю">
      <span className="self-center whitespace-nowrap text-caption text-ink-soft">Учитываю:</span>
      {servings && <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-sunken px-3 text-small">на {servings} порц.</span>}
      {items.map((it) => (
        <button key={it.label} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-sunken pl-3 pr-2 text-small hover:bg-line" aria-label={"Убрать: " + it.label}
          onClick={() => (it.next ? a.adjust(it.next, "Убрать: " + it.label) : a.choose({ label: "Убрать: " + it.label, relax: it.relax }))}>
          {it.label}<X size={14} aria-hidden />
        </button>
      ))}
      {items.length > 1 && <button className="h-9 shrink-0 rounded-full px-2 text-small font-semibold text-brand hover:bg-brand-soft" onClick={() => a.adjust({ ...a.base(), servings: c.servings }, "Сбросить условия")}>Сбросить</button>}
    </div>
  );
}

export interface Suggestion { icon: JSX.Element; text: string; run: () => void }

/** Example requests: cards with an icon; one tap sends. The last one follows what is at home. */
export function useSuggestions(send: (text: string) => void, onPantry: () => void): Suggestion[] {
  const { s } = useStore();
  const soon = expiringSoon(s.fridge);
  const ctx: Suggestion = soon.length
    ? { icon: <Clock size={20} />, text: "Что сделать с продуктом «" + shortName(soon[0].id).toLowerCase() + "», пока не испортился", run: () => send("что приготовить из " + shortName(soon[0].id).toLowerCase()) }
    : s.fridge.length
      ? { icon: <Refrigerator size={20} />, text: "Из того, что дома · " + s.fridge.length, run: onPantry }
      : { icon: <Snowflake size={20} />, text: "Ужин за 20 минут", run: () => send("ужин за 20 минут") };
  return [
    { icon: <Search size={20} />, text: "Есть курица и картошка — что приготовить?", run: () => send("курица и картошка") },
    { icon: <Soup size={20} />, text: "Мне грустно — хочу уютного", run: () => send("мне грустно, хочется чего-то уютного") },
    { icon: <Egg size={20} />, text: "Сколько варить яйца?", run: () => send("сколько варить яйца?") },
    ctx,
  ];
}

export function SuggestionCards({ items, className }: { items: Suggestion[]; className?: string }) {
  return (
    <div className={cx("grid grid-cols-2 gap-3", className)}>
      {items.map((it) => (
        <button key={it.text} onClick={it.run}
          className="flex min-h-[96px] flex-col items-start gap-2 rounded-input border border-line bg-card p-3 text-left transition-[border-color,transform] duration-150 hover:border-line-strong/60 active:scale-[.98] sm:min-h-[64px] sm:flex-row sm:items-center sm:gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden>{it.icon}</span>
          <span className="line-clamp-3 min-w-0 flex-1 text-body-sm leading-snug sm:line-clamp-2">{it.text}</span>
          <ArrowUpRight size={16} className="hidden shrink-0 text-ink-faint sm:block" aria-hidden />
        </button>
      ))}
    </div>
  );
}

const MOODS = [
  { emoji: "😮‍💨", label: "Устал", text: "устал, хочу что-нибудь попроще" },
  { emoji: "🥺", label: "Грустно", text: "мне грустно, хочется чего-то уютного" },
  { emoji: "🥶", label: "Холодно", text: "холодно, хочу горячего" },
  { emoji: "🥵", label: "Жарко", text: "жарко, хочется лёгкого и свежего" },
  { emoji: "🎉", label: "Гости", text: "придут гости" },
  { emoji: "💕", label: "Вдвоём", text: "романтический ужин на двоих" },
];
export function MoodTiles({ send, compact }: { send: (text: string, shown: string) => void; compact?: boolean }) {
  return (
    <div className={cx("grid grid-cols-3 gap-2", !compact && "sm:grid-cols-6")}>
      {MOODS.map((m) => (
        <button key={m.label} onClick={() => send(m.text, m.emoji + " " + m.label)} className="flex h-[72px] flex-col items-center justify-center gap-1 rounded-input border border-line bg-card text-small transition-[border-color,transform] duration-150 hover:border-line-strong/60 active:scale-[.97]">
          <span className="text-2xl leading-none" aria-hidden>{m.emoji}</span>{m.label}
        </button>
      ))}
    </div>
  );
}

/** "Что у вас есть?" — pick products right in the chat; optionally remember them in «Мои продукты». */
export function PantryPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update } = useStore();
  const a = useAssistant();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>(() => s.fridge.map((f) => f.id));
  const [remember, setRemember] = useState(true);
  const ids = useMemo(() => ingredientOptions().map((o) => o.id).filter((id) => id !== "water"), []);
  const popular = useMemo(() => pantryGroups().flatMap((g) => g.items.slice(0, 4).map((i) => i.id)).slice(0, 16), []);
  const found = q.trim() ? searchIngredients(q, ids, 8) : [];
  const freq = useFrequent();
  const frequent = useMemo(() => new Set(freq.map(([id]) => id)), [freq]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const go = () => {
    if (remember) update((st) => ({ ...st, fridge: addToFridge(st.fridge, picked.filter((id) => !st.fridge.some((f) => f.id === id))) }));
    const c = { ...freshConditions({ servings: s.conditions.servings, appliances: DEFAULT_CONDITIONS.appliances, vegetarian: s.preferences.vegetarian }), available: picked, strictPantry: picked.length >= 4 };
    a.show("Есть: " + picked.slice(0, 5).map((id) => shortName(id).toLowerCase()).join(", ") + (picked.length > 5 ? "…" : ""), c, "Из этого можно приготовить:");
    onClose();
  };
  return (
    <Sheet open={open} title="Что у вас есть?" onClose={onClose} tall
      footer={<div className="flex items-center gap-3">
        <label className="flex flex-1 items-center gap-2 text-small text-ink-soft"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--brand))]" />Запомнить в «Мои продукты»</label>
        <button className="btn-primary" disabled={!picked.length} onClick={go}><Sparkles size={18} />Подобрать · {picked.length}</button>
      </div>}>
      <input className="input" placeholder="Найти продукт: фарш, кабачок…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!q.trim() && <ProductTiles className="mt-4" on={(id) => picked.includes(id)} onToggle={toggle} />}
      {!q.trim() && <p className="label mt-5">Ещё продукты</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {(q.trim() ? found : [...new Set([...picked, ...popular])].filter((id) => !frequent.has(id))).map((id) => <Chip key={id} on={picked.includes(id)} onClick={() => toggle(id)}>{shortName(id)}</Chip>)}
        {q.trim() && !found.length && <p className="text-small text-ink-soft">Такого продукта нет в рецептах.</p>}
      </div>
    </Sheet>
  );
}
