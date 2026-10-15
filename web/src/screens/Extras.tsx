// Smaller screens: the beginner course, legal documents, the family poll, first-run questions.
import { useEffect, useState } from "react";
import { Check, CircleCheck, ArrowUpRight, Search, Egg, Soup } from "lucide-react";
import { apiUrl, legalDoc, legalInfo, recipeById, type LegalInfo, type LegalKey } from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { RecipeRow } from "../components/RecipeCard";
import { ChefAvatar, Layer, Sheet, Stepper, Toggle, cx } from "../components/ui";
import { LESSONS } from "./learn-data";

/** «Школа готовки»: short lessons, each with a skill and recipes to practise it. */
export function Learn({ onClose }: { onClose: () => void }) {
  const { profile, setProfile } = useStore();
  const { openRecipe } = useActions();
  const [open, setOpen] = useState<string | null>(() => LESSONS.find((l) => !profile.lessonsDone.includes(l.id))?.id ?? null);
  const done = profile.lessonsDone.length;
  return (
    <Layer title="Школа готовки" onClose={onClose}>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-2 sm:px-6">
        <h1 className="text-h1">Школа готовки</h1>
        <p className="mt-1 text-body-sm text-ink-soft">{LESSONS.length} коротких уроков: навык и рецепт, чтобы сразу попробовать.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-herb transition-all" style={{ width: (done / LESSONS.length) * 100 + "%" }} /></div>
        <p className="mt-1.5 text-caption text-ink-soft">Пройдено {done} из {LESSONS.length}</p>
        <div className="mt-5 grid gap-2">
          {LESSONS.map((l, n) => {
            const isDone = profile.lessonsDone.includes(l.id);
            const expanded = open === l.id;
            return (
              <section key={l.id} className="card overflow-hidden">
                <button className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(expanded ? null : l.id)} aria-expanded={expanded}>
                  {isDone
                    ? <CircleCheck size={32} className="shrink-0 text-herb" aria-label="Пройден" />
                    : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-herb-soft text-small font-semibold text-herb">{n + 1}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm font-semibold">{l.title}</span>
                    <span className="block text-caption text-ink-soft">{isDone ? "Пройден · " : ""}{l.skill}</span>
                  </span>
                </button>
                {expanded && (
                  <div className="border-t border-line px-4 pb-4 pt-3">
                    <ul className="grid gap-2 text-body-sm">{l.points.map((p) => <li key={p} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-herb" aria-hidden />{p}</li>)}</ul>
                    <div className="mt-4 grid gap-2">{l.recipes.map((id) => { const r = recipeById(id); return r ? <RecipeRow key={id} recipe={r} note="Попробуйте на практике" onOpen={() => openRecipe(r)} /> : null; })}</div>
                    <button className={cx("mt-4 w-full", isDone ? "btn-ghost" : "btn-primary")} onClick={() => {
                      setProfile((p) => ({ ...p, lessonsDone: isDone ? p.lessonsDone.filter((x) => x !== l.id) : [...p.lessonsDone, l.id] }));
                      if (!isDone) setOpen(LESSONS[n + 1]?.id ?? null);
                    }}>{isDone ? "Отметить как непройденный" : <><Check size={18} />Урок пройден</>}</button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </Layer>
  );
}

export function DocLayer({ doc, onClose }: { doc: string; onClose: () => void }) {
  const [info, setInfo] = useState<LegalInfo | null>(null);
  useEffect(() => { legalInfo().then(setInfo); }, []);
  const key = (["privacy", "rules", "terms", "info"].includes(doc) ? doc : "privacy") as LegalKey;
  const d = info ? legalDoc(key, info) : null;
  const fix = (s: string) => s.replace(/(?<![а-яё])г\.\./g, "г.");
  return (
    <Layer title={d?.title ?? "Документ"} onClose={onClose}>
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-2 text-body leading-relaxed sm:px-6">
        {!d ? <p className="text-ink-soft">Загружаю…</p> : (
          <>
            <h1 className="mb-6 text-h1">{d.title}</h1>
            {d.sections.map((sec, i) => (
              <section key={i} className="mb-6">
                {sec.h && <h2 className="mb-2 text-h2">{fix(sec.h)}</h2>}
                {sec.p.map((p, j) => <p key={j} className="mb-3 text-ink">{fix(p)}</p>)}
              </section>
            ))}
          </>
        )}
      </article>
    </Layer>
  );
}

interface PollView { day: string; options: { id: string; title: string }[]; counts: number[]; mine: number | null; closed: boolean }

/** "Что хотите на ужин?" — a relative opened the link and votes, without installing anything. */
export function PollSheet({ token, onClose }: { token: string; onClose: () => void }) {
  const { s, update, toast } = useStore();
  const { openRecipe } = useActions();
  const [poll, setPoll] = useState<PollView | null>(null);
  const [error, setError] = useState("");
  const voter = s.voter;
  useEffect(() => { if (!voter) update((st) => (st.voter ? st : { ...st, voter: crypto.randomUUID() })); }, [voter, update]);
  const call = async (route: string, body: unknown) => {
    const r = await fetch(apiUrl(route), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Опрос не открылся.");
    return j as PollView;
  };
  useEffect(() => { call("poll.get", { token, voter: voter || undefined }).then(setPoll).catch((e) => setError(e.message)); }, [token, voter]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = poll ? poll.counts.reduce((a, b) => a + b, 0) : 0;
  return (
    <Sheet open title="Что хотите на ужин?" onClose={onClose}>
      {error && <p className="text-body-sm text-ink-soft">{error}</p>}
      {poll && (
        <div className="grid gap-2">
          {poll.closed && <p className="text-body-sm text-ink-soft">Голосование уже закончилось.</p>}
          {poll.options.map((o, i) => {
            const pct = total ? Math.round((poll.counts[i] / total) * 100) : 0;
            const r = recipeById(o.id);
            return (
              <div key={o.id} className={cx("relative flex items-center overflow-hidden rounded-input border bg-card", poll.mine === i ? "border-brand" : "border-line")}>
                <div className="absolute inset-y-0 left-0 bg-brand-soft transition-all" style={{ width: (poll.mine !== null ? pct : 0) + "%" }} aria-hidden />
                <button className="relative flex min-h-[56px] flex-1 items-center gap-3 px-4 text-left disabled:opacity-60" disabled={poll.closed || !voter} aria-pressed={poll.mine === i}
                  onClick={() => call("poll.vote", { token, voter, option: i }).then(setPoll).catch((e) => toast(e.message))}>
                  <span className="flex-1 text-body-sm font-semibold">{o.title}</span>
                  {poll.mine !== null && <span className="text-small tabular-nums text-ink-soft">{poll.counts[i]}</span>}
                </button>
                {r && <button className="relative mr-1 h-11 shrink-0 rounded-full px-3 text-small font-semibold text-brand hover:bg-brand-soft" onClick={() => { onClose(); openRecipe(r); }}>Рецепт</button>}
              </div>
            );
          })}
          <p className="text-caption text-ink-soft">{poll.mine === null ? "Выберите блюдо — голос можно поменять." : "Ваш голос учтён. Проголосовали: " + total}</p>
        </div>
      )}
    </Sheet>
  );
}

const DONT_EAT = [["meat", "Мясо"], ["fish", "Рыба"], ["dairy", "Молочное"], ["gluten", "Глютен"], ["nuts", "Орехи"], ["mushrooms", "Грибы"], ["spicy", "Острое"]] as const;

/** First visit: two short steps (how it looks, who eats what), then «Знакомьтесь — Шеф». Can be skipped. */
const LAST = 2;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { s, profile, setProfile, update } = useStore();
  const a = useAssistant();
  const [step, setStep] = useState(0);
  const size = profile.textSize !== "m" ? profile.textSize : s.largeText ? "l" : "m";
  const setSize = (k: "m" | "l" | "xl") => { setProfile((p) => ({ ...p, textSize: k })); update((st) => ({ ...st, largeText: k !== "m" })); };
  const setSimple = (v: boolean) => setProfile((p) => ({ ...p, simple: v }));
  const [eaters, setEaters] = useState(2);
  const [kids, setKids] = useState(false);
  const [excluded, setExcluded] = useState<string[]>(() => s.preferences.excluded);

  const save = (skip: boolean) => {
    setProfile((p) => ({ ...p, ...(skip ? {} : { eaters, kids }), setUp: true }));
    update((st) => ({
      ...st, onboarding: skip ? "skipped" : "done",
      conditions: { ...st.conditions, servings: skip ? st.conditions.servings : eaters },
      preferences: skip ? st.preferences : { ...st.preferences, excluded: [...new Set(excluded)] },
    }));
  };
  const finish = (ask?: string) => {
    if (step < LAST) save(false);
    onDone();
    if (ask) { void a.ask(ask, { fresh: true, source: "onboarding" }); goChat(); }
  };
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const modes = [
    { simple: true, title: "Простой", hint: "Крупно и только главное", tabs: ["Главная", "Шеф", "Избранное"] },
    { simple: false, title: "Полный", hint: "Все возможности: поиск, покупки, план на неделю", tabs: ["Главная", "Поиск", "Шеф", "Избранное", "Покупки"] },
  ];
  const steps = [
    <div key="mode">
      <h1 className="text-h1">Как вам удобнее?</h1>
      <p className="mt-2 text-body-sm text-ink-soft">Можно поменять в любой момент в профиле.</p>
      <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Режим">
        {modes.map((m) => {
          const on = profile.simple === m.simple;
          return (
            <button key={m.title} role="radio" aria-checked={on} onClick={() => setSimple(m.simple)}
              className={cx("rounded-card border p-4 text-left", on ? "border-brand bg-brand-soft" : "border-line bg-card")}>
              <span className="flex items-center gap-3">
                <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", on ? "border-brand" : "border-line-strong")}>{on && <span className="h-3 w-3 rounded-full bg-brand-fill" />}</span>
                <span><span className="block text-title">{m.title}</span><span className="block text-small text-ink-soft">{m.hint}</span></span>
              </span>
              <span className="mt-3 flex gap-1 rounded-input bg-paper/80 p-1.5" aria-hidden>
                {m.tabs.map((t) => <span key={t} className={cx("min-w-0 flex-auto truncate rounded-md px-1 py-1.5 text-center text-micro", t === "Шеф" ? "bg-brand-fill text-white" : "bg-sunken text-ink-soft", m.simple && "py-2.5 text-small")}>{t}</span>)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="label mb-2 mt-6">Размер текста</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Размер текста">
        {(["m", "l", "xl"] as const).map((k, i) => (
          <button key={k} role="radio" aria-checked={size === k} onClick={() => setSize(k)}
            className={cx("flex h-16 items-center justify-center rounded-input border", size === k ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card")}>
            <span style={{ fontSize: [16, 21, 26][i] + "px" }}>А</span>
          </button>
        ))}
      </div>
    </div>,
    <div key="who">
      <h1 className="text-h1">Для кого готовите?</h1>
      <p className="mt-2 text-body-sm text-ink-soft">Рецепты и списки покупок посчитаю на нужное число порций.</p>
      <div className="mt-6 flex items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
        <span><span className="block text-body-sm font-semibold">Сколько человек едят</span><span className="block text-caption text-ink-soft">{eaters === 1 ? "только для себя" : eaters === 2 ? "вдвоём" : "семья"}</span></span>
        <Stepper value={eaters} min={1} max={12} onChange={setEaters} label="Едоков" />
      </div>
      <div className="mt-2 rounded-card border border-line bg-card px-4"><Toggle on={kids} onChange={setKids} label="Есть дети" hint="Чаще покажу то, что нравится детям" /></div>
      <p className="label mb-2 mt-6">Чего не едите?</p>
      <div className="flex flex-wrap gap-2">
        {DONT_EAT.map(([id, label]) => <button key={id} aria-pressed={excluded.includes(id)} className={cx("chip", excluded.includes(id) && "border-warn bg-warn-soft line-through decoration-warn")} onClick={() => setExcluded((x) => toggle(x, id))}>{label}</button>)}
      </div>
      <p className="mt-6 text-small text-ink-soft">Цели, технику и остальное можно настроить потом в профиле.</p>
    </div>,
  ];

  const examples = [
    { icon: <Search size={20} />, text: "Есть курица и картошка — что приготовить?", ask: "курица и картошка" },
    { icon: <Soup size={20} />, text: "Холодно, хочу горячего", ask: "холодно, хочу горячего" },
    { icon: <Egg size={20} />, text: "Сколько варить яйца?", ask: "сколько варить яйца?" },
  ];

  return (
    <div className="anim-fade fixed inset-0 z-50 overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-label="Знакомство">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        {step < LAST ? (
          <>
            <div className="flex items-center gap-3">
              <ChefAvatar size={32} />
              <div className="grid flex-1 grid-cols-2 gap-1.5" aria-label={"Шаг " + (step + 1) + " из " + LAST}>
                {[0, 1].map((i) => <span key={i} className={cx("h-1.5 rounded-full", i <= step ? "bg-brand-fill" : "bg-sunken")} />)}
              </div>
            </div>
            <div className="anim-rise mt-8 flex-1" key={step}>{steps[step]}</div>
            <div className="sticky bottom-0 -mx-5 mt-8 bg-paper px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
              <button className="btn-primary h-13 w-full" onClick={() => { if (step === LAST - 1) save(false); setStep(step + 1); }}>Дальше</button>
              <div className="mt-1 flex">
                {step > 0 && <button className="btn-ghost flex-1" onClick={() => setStep(step - 1)}>Назад</button>}
                <button className="btn-ghost flex-1" onClick={() => { save(true); onDone(); }}>Пропустить</button>
              </div>
            </div>
          </>
        ) : (
          <div className="anim-rise flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="flex flex-1 flex-col justify-center py-8">
              <ChefAvatar size={64} />
              <h1 className="mt-5 text-display">Знакомьтесь — Шеф</h1>
              <p className="mt-3 text-body text-ink-soft">Ваш кулинарный помощник. Напишите или скажите, что есть дома, сколько времени и какое настроение, — он подберёт рецепт. И ответит на любой вопрос на кухне.</p>
              <p className="label mb-2 mt-8">Попробуйте спросить</p>
              <div className="grid gap-2">
                {examples.map((e) => (
                  <button key={e.text} onClick={() => finish(e.ask)} className="flex min-h-[60px] items-center gap-3 rounded-input border border-line bg-card px-3 text-left hover:border-line-strong">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden>{e.icon}</span>
                    <span className="flex-1 text-body-sm">{e.text}</span>
                    <ArrowUpRight size={16} className="shrink-0 text-ink-soft" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary h-13 w-full" onClick={() => finish()}>Начать</button>
          </div>
        )}
      </div>
    </div>
  );
}
