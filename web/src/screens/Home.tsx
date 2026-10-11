import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Mic, RotateCcw, Square, Sparkles, GraduationCap, ChevronRight, CalendarDays, Refrigerator } from "lucide-react";
import {
  dayLabel, dateKey, expiryLabel, expiringSoon, freshConditions, rankRecipes, recipeById, recipes, resultNote, shortName, useVoiceInput,
  type Conditions, type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goalConditions } from "../app/profile";
import { replace, routeHash } from "../app/router";
import { RecipeRow, RecipeTile } from "../components/RecipeCard";
import { Chip, Section, cx } from "../components/ui";
import { LESSONS } from "./learn-data";

const greeting = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : h < 23 ? "Добрый вечер" : "Доброй ночи";
};
const mealNow = (): "breakfast" | "lunch" | "dinner" => {
  const h = new Date().getHours();
  return h >= 5 && h < 11 ? "breakfast" : h < 16 ? "lunch" : "dinner";
};

const MOODS = [
  { label: "😮‍💨 Устал", text: "устал, хочу что-нибудь попроще" },
  { label: "🥺 Грустно", text: "мне грустно, хочется чего-то уютного" },
  { label: "🥶 Холодно", text: "холодно, хочу горячего" },
  { label: "🥵 Жарко", text: "жарко, хочется лёгкого и свежего" },
  { label: "🎉 Гости", text: "придут гости" },
  { label: "💕 Вдвоём", text: "романтический ужин на двоих" },
];

export function Home() {
  const { s, profile, ready, online, ensureSession, toast, catalog } = useStore();
  const { openRecipe } = useActions();
  const a = useAssistant(openRecipe);
  const [text, setText] = useState("");
  const voice = useVoiceInput((t) => void a.ask(t, { voice: true }), toast, ensureSession, ready && online);
  const threadEnd = useRef<HTMLDivElement>(null);
  const hasThread = s.conversation.length > 0;

  useEffect(() => { if (hasThread) threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [s.conversation.length, a.busy, hasThread]);

  const base = (): Conditions => ({
    ...freshConditions({ servings: profile.eaters || s.conditions.servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }),
    servings: profile.eaters || 2,
  });

  const submit = () => {
    const t = text.trim();
    if (!t || a.busy) return;
    setText("");
    void a.ask(t);
  };

  const quick = [
    { label: "⚡ До 20 минут", run: () => a.show("До 20 минут", { ...base(), maxMinutes: 20 }, "Вот что успеете за 20 минут:") },
    { label: "🧊 Из того, что дома", run: () => {
      if (!s.fridge.length) { toast("Сначала отметьте, что есть дома"); return replace(routeHash({ tab: "pantry" })); }
      const ids = s.fridge.map((f) => f.id);
      a.show("Из того, что дома", { ...base(), available: ids, strictPantry: ids.length >= 4 }, "Вот что приготовить из того, что есть:");
    } },
    { label: "🎲 Удиви меня", run: () => void a.ask("удиви меня", { source: "option" }) },
    { label: "🥗 Полегче", run: () => a.show("Полегче", { ...base(), maxKcal: 450 }, "Лёгкие блюда — до 450 ккал на порцию:") },
    { label: "💪 Больше белка", run: () => a.show("Больше белка", { ...base(), minProtein: 25 }, "Блюда, где от 25 г белка на порцию:") },
    { label: "👶 Детям", run: () => a.show("Детям", { ...base(), occasion: "kids" }, "Вот что обычно нравится детям:") },
    { label: "🍰 Сладкое", run: () => a.show("Сладкое", { ...base(), mood: "sweet" }, "Сладкое:") },
  ];

  return (
    <div className="pb-6">
      {!hasThread && (
        <div className="px-4 pt-4">
          <p className="text-sm text-ink-soft">{greeting()}!</p>
          <h1 className="mt-0.5 text-[28px] font-semibold leading-tight">Что приготовим{mealNow() === "breakfast" ? " на завтрак" : mealNow() === "lunch" ? " на обед" : " на ужин"}?</h1>
        </div>
      )}

      {hasThread && (
        <div className="px-4 pt-3" aria-live="polite">
          <div className="mb-2 flex justify-end">
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={a.reset}><RotateCcw size={14} /> Новый запрос</button>
          </div>
          <Thread onOpen={(id) => { a.opened(id, s.conditions.servings); openRecipe(id); }} onOption={(o) => a.choose(o, () => replace(routeHash({ tab: "pantry" })))} />
          {a.busy && <div className="mt-3 flex items-center gap-2 text-sm text-ink-faint"><Sparkles size={16} className="animate-pulse" /> Подбираю…</div>}
          <div ref={threadEnd} />
        </div>
      )}

      {/* Ask box */}
      <div className={cx("sticky z-20 px-4 pt-3", hasThread ? "bottom-[76px]" : "top-[57px]")}>
        <form className="card flex items-end gap-2 p-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <textarea
            rows={1}
            value={voice.state === "listening" ? voice.interim || "Слушаю…" : text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Курица, картошка, 30 минут…"
            aria-label="Что хотите приготовить"
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] outline-none placeholder:text-ink-faint"
            readOnly={voice.state === "listening"}
          />
          {voice.state === "listening" || voice.state === "processing" ? (
            <button type="button" className="listening grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white" onClick={voice.stop} aria-label="Остановить запись"><Square size={18} /></button>
          ) : text.trim() ? (
            <button type="submit" disabled={a.busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-50" aria-label="Подобрать"><ArrowUp size={20} /></button>
          ) : (
            <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink" aria-label="Сказать голосом"
              onClick={() => { if (!online) return toast("Для голосового ввода нужен интернет — напишите текстом."); if (!voice.available) return toast("В этом браузере голосовой ввод не работает. Откройте сайт в Chrome или Safari — или напишите текстом."); voice.start(); }}>
              <Mic size={20} />
            </button>
          )}
        </form>
      </div>

      {!hasThread && (
        <>
          <div className="scroll-x mt-3 px-4">
            {quick.map((q) => <Chip key={q.label} onClick={q.run}>{q.label}</Chip>)}
          </div>
          <div className="scroll-x mt-2 px-4">
            {MOODS.map((m) => <Chip key={m.label} onClick={() => void a.ask(m.text, { shown: m.label, source: "option" })}>{m.label}</Chip>)}
          </div>
          <Rescue />
          <TodayMenu />
          {profile.level === "beginner" && <CourseCard />}
          <Ideas key={catalog.version} />
          <Recent />
        </>
      )}
    </div>
  );
}

/** The conversation: messages, recipe cards under replies, follow-up buttons. */
function Thread({ onOpen, onOption }: { onOpen: (id: string) => void; onOption: (o: { label: string; text?: string; relax?: string; open?: string; action?: "pantry" }) => void }) {
  const { s } = useStore();
  const { isFavorite } = useActions();
  return (
    <div className="space-y-3">
      {s.conversation.map((m, i) => m.role === "user" ? (
        <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-[15px] text-white">{m.text}</div></div>
      ) : (
        <div key={i} className="space-y-2">
          <div className="max-w-[92%] whitespace-pre-line rounded-2xl rounded-bl-md bg-card px-3.5 py-2.5 text-[15px] shadow-card">{m.text}</div>
          {m.results?.map((r) => {
            const recipe = recipeById(r.id);
            return recipe ? <RecipeRow key={r.id} recipe={recipe} note={r.note || r.reason} favorite={isFavorite(r.id)} onOpen={() => onOpen(r.id)} /> : null;
          })}
          {!!m.options?.length && i === s.conversation.length - 1 && (
            <div className="flex flex-wrap gap-2 pt-1">{m.options.map((o) => <Chip key={o.label} onClick={() => onOption(o)}>{o.label}</Chip>)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Perishables that run out today or tomorrow, and what to cook with them. */
function Rescue() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const soon = useMemo(() => expiringSoon(s.fridge), [s.fridge]);
  const ideas = useMemo(() => {
    if (!soon.length) return [] as Recipe[];
    const out: Recipe[] = [];
    for (const item of soon.slice(0, 3)) {
      const c = { ...freshConditions({ servings: s.conditions.servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), desired: [item.id], available: s.fridge.map((f) => f.id) };
      for (const m of rankRecipes(recipes(), c, s.preferences, 3)) if (!out.some((r) => r.id === m.recipe.id)) out.push(m.recipe);
    }
    return out.slice(0, 6);
  }, [soon, s.fridge, s.conditions.servings, s.preferences]);
  if (!soon.length) return null;
  return (
    <Section title={<span className="flex items-center gap-2">🆘 Спасите продукты</span>}
      action={<button className="text-sm font-semibold text-brand" onClick={() => replace(routeHash({ tab: "pantry" }))}>Дома</button>}>
      <div className="mx-4 rounded-xl2 bg-warn-soft px-4 py-3 text-sm">
        {soon.slice(0, 4).map((f) => <span key={f.id} className="mr-3 inline-block">{shortName(f.id)} — <b>{expiryLabel(f)}</b></span>)}
      </div>
      {ideas.length > 0 && <div className="scroll-x mt-3 px-4">{ideas.map((r) => <RecipeTile key={r.id} recipe={r} onOpen={() => openRecipe(r)} />)}</div>}
    </Section>
  );
}

function TodayMenu() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const today = dateKey(new Date());
  const items = (s.menu.find((d) => d.date === today)?.items ?? []).map((i) => ({ i, r: recipeById(i.recipeId) })).filter((x) => x.r) as { i: { recipeId: string; servings: number; leftover?: boolean }; r: Recipe }[];
  if (!items.length) return null;
  return (
    <Section title={<span className="flex items-center gap-2"><CalendarDays size={18} /> {dayLabel(today)} по меню</span>}
      action={<button className="text-sm font-semibold text-brand" onClick={() => replace(routeHash({ tab: "menu" }))}>Меню</button>}>
      <div className="space-y-2 px-4">{items.map(({ i, r }) => <RecipeRow key={r.id + i.servings} recipe={r} note={i.leftover ? "Приготовлено вчера — только разогреть" : i.servings + " порц."} onOpen={() => openRecipe(r)} />)}</div>
    </Section>
  );
}

function CourseCard() {
  const { profile } = useStore();
  const next = LESSONS.find((l) => !profile.lessonsDone.includes(l.id));
  if (!next) return null;
  return (
    <Section>
      <button onClick={() => replace(routeHash({ tab: "learn" }))} className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl2 bg-herb-soft p-4 text-left">
        <GraduationCap className="shrink-0 text-herb" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-herb">Школа готовки · урок {LESSONS.indexOf(next) + 1} из {LESSONS.length}</span>
          <span className="block font-semibold">{next.title}</span>
        </span>
        <ChevronRight className="text-herb" />
      </button>
    </Section>
  );
}

function Ideas() {
  const { s, profile, update } = useStore();
  const { openRecipe } = useActions();
  const today = dateKey(new Date());
  const skip = s.today.date === today ? s.today.skip : [];
  const list = useMemo(() => {
    const c = goalConditions(profile, { ...freshConditions({ servings: profile.eaters, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), servings: profile.eaters });
    if (profile.level === "beginner" && c.maxMinutes == null) c.maxMinutes = 45;
    if (profile.kids) c.occasion = null;
    return rankRecipes(recipes(), c, s.preferences, 40, { meal: mealNow() })
      .filter((m) => !skip.includes(m.recipe.id) && (profile.level !== "beginner" || m.recipe.difficulty === "easy"))
      .slice(0, 6);
  }, [s.preferences, profile, skip]);
  if (!list.length) return null;
  const hide = (id: string) => update((st) => ({ ...st, today: { date: today, skip: [...(st.today.date === today ? st.today.skip : []), id].slice(-40) } }));
  return (
    <Section title="Идеи на сегодня" action={<button className="text-sm text-ink-faint" onClick={() => list.forEach((m) => hide(m.recipe.id))}>Другие</button>}>
      <div className="space-y-2 px-4">{list.slice(0, 4).map((m) => <RecipeRow key={m.recipe.id} recipe={m.recipe} note={resultNote(m) || m.recipe.summary} onOpen={() => openRecipe(m.recipe)} />)}</div>
    </Section>
  );
}

function Recent() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const list = s.favorites.length ? s.favorites.slice(0, 10) : s.recent.slice(0, 10);
  if (!list.length) return (
    <Section>
      <button className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl2 border border-dashed border-line p-4 text-left" onClick={() => replace(routeHash({ tab: "pantry" }))}>
        <Refrigerator className="shrink-0 text-brand" />
        <span className="text-sm text-ink-soft"><b className="text-ink">Отметьте, что есть дома</b> — буду подбирать рецепты из ваших продуктов и напомню, что пора использовать.</span>
      </button>
    </Section>
  );
  return (
    <Section title={s.favorites.length ? "Сохранённое" : "Недавно смотрели"}>
      <div className="scroll-x px-4">{list.map((r) => { const fresh = recipeById(r.id) ?? r; return <RecipeTile key={r.id} recipe={fresh} onOpen={() => openRecipe(fresh)} />; })}</div>
    </Section>
  );
}
