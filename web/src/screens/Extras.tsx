// Smaller screens: the beginner course, legal documents, the family poll, first-run questions.
import { useEffect, useState } from "react";
import { Check, GraduationCap } from "lucide-react";
import { apiUrl, legalDoc, legalInfo, recipeById, type LegalInfo, type LegalKey } from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { GOALS, LEVELS, type Goal, type Level } from "../app/profile";
import { RecipeRow } from "../components/RecipeCard";
import { Chip, Layer, Sheet, Stepper, cx } from "../components/ui";
import { LESSONS } from "./learn-data";

export function Learn() {
  const { profile, setProfile } = useStore();
  const { openRecipe } = useActions();
  const [open, setOpen] = useState<string | null>(() => LESSONS.find((l) => !profile.lessonsDone.includes(l.id))?.id ?? null);
  const done = profile.lessonsDone.length;
  return (
    <div className="pb-10">
      <div className="px-4 pt-4">
        <h1 className="flex items-center gap-2 text-[26px] font-semibold leading-tight"><GraduationCap className="text-herb" /> Школа готовки</h1>
        <p className="text-sm text-ink-soft">{LESSONS.length} коротких уроков: навык и рецепт, чтобы сразу попробовать.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-herb transition-all" style={{ width: (done / LESSONS.length) * 100 + "%" }} /></div>
        <p className="mt-1 text-xs text-ink-faint">Пройдено {done} из {LESSONS.length}</p>
      </div>
      <div className="mt-4 space-y-2 px-4">
        {LESSONS.map((l, n) => {
          const isDone = profile.lessonsDone.includes(l.id);
          const expanded = open === l.id;
          return (
            <div key={l.id} className={cx("card overflow-hidden", isDone && "opacity-80")}>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(expanded ? null : l.id)} aria-expanded={expanded}>
                <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold", isDone ? "bg-herb text-white" : "bg-herb-soft text-herb")}>{isDone ? <Check size={16} /> : n + 1}</span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{l.title}</span><span className="block text-xs text-ink-faint">{l.skill}</span></span>
              </button>
              {expanded && (
                <div className="px-4 pb-4">
                  <ul className="space-y-2 text-[15px]">{l.points.map((p) => <li key={p} className="flex gap-2"><span className="text-herb">•</span>{p}</li>)}</ul>
                  <div className="mt-3 space-y-2">{l.recipes.map((id) => { const r = recipeById(id); return r ? <RecipeRow key={id} recipe={r} note="Попробуйте на практике" onOpen={() => openRecipe(r)} /> : null; })}</div>
                  <button className={cx("mt-3 w-full", isDone ? "btn-ghost" : "btn-primary bg-herb")} onClick={() => {
                    setProfile((p) => ({ ...p, lessonsDone: isDone ? p.lessonsDone.filter((x) => x !== l.id) : [...p.lessonsDone, l.id] }));
                    if (!isDone) setOpen(LESSONS[n + 1]?.id ?? null);
                  }}>{isDone ? "Отметить как непройденный" : "Урок пройден ✓"}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DocLayer({ doc, onClose }: { doc: string; onClose: () => void }) {
  const [info, setInfo] = useState<LegalInfo | null>(null);
  useEffect(() => { legalInfo().then(setInfo); }, []);
  const key = (["privacy", "rules", "terms", "info"].includes(doc) ? doc : "privacy") as LegalKey;
  const d = info ? legalDoc(key, info) : null;
  return (
    <Layer title={d?.title ?? "Документ"} onClose={onClose}>
      <article className="mx-auto max-w-prose px-5 pb-16 pt-4 text-[15px] leading-relaxed">
        {!d ? <p className="text-ink-faint">Загружаю…</p> : d.sections.map((sec, i) => (
          <section key={i} className="mb-4">
            {sec.h && <h2 className="mb-1.5 text-lg font-semibold">{sec.h}</h2>}
            {sec.p.map((p, j) => <p key={j} className="mb-2">{p}</p>)}
          </section>
        ))}
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
      {error && <p className="text-sm text-ink-soft">{error}</p>}
      {poll && (
        <div className="space-y-2">
          {poll.closed && <p className="text-sm text-ink-soft">Голосование уже закончилось.</p>}
          {poll.options.map((o, i) => {
            const pct = total ? Math.round((poll.counts[i] / total) * 100) : 0;
            const r = recipeById(o.id);
            return (
              <div key={o.id} className={cx("card relative overflow-hidden", poll.mine === i && "border-brand")}>
                <div className="absolute inset-y-0 left-0 bg-brand-soft transition-all" style={{ width: (poll.mine !== null ? pct : 0) + "%" }} />
                <button className="relative flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60" disabled={poll.closed || !voter}
                  onClick={() => call("poll.vote", { token, voter, option: i }).then(setPoll).catch((e) => toast(e.message))}>
                  <span className="flex-1 font-medium">{o.title}</span>
                  {poll.mine !== null && <span className="text-sm tabular-nums">{poll.counts[i]}</span>}
                </button>
                {r && <button className="relative px-4 pb-2 text-xs text-brand" onClick={() => openRecipe(r)}>Рецепт</button>}
              </div>
            );
          })}
          <p className="text-xs text-ink-faint">{poll.mine === null ? "Выберите блюдо — голос можно поменять." : "Ваш голос учтён. Проголосовали: " + total}</p>
        </div>
      )}
    </Sheet>
  );
}

/** First visit: three taps to tailor everything. Can be skipped. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const { setProfile, update } = useStore();
  const [eaters, setEaters] = useState(2);
  const [level, setLevel] = useState<Level>("confident");
  const [goals, setGoals] = useState<Goal[]>(["tasty"]);
  const [kids, setKids] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);
  const finish = (skip: boolean) => {
    setProfile((p) => ({ ...p, ...(skip ? {} : { eaters, level, goals, kids }), setUp: true }));
    update((st) => ({
      ...st, onboarding: skip ? "skipped" : "done",
      conditions: { ...st.conditions, servings: skip ? st.conditions.servings : eaters },
      preferences: skip ? st.preferences : { ...st.preferences, appliances: [...new Set([...st.preferences.appliances, ...extra])] },
    }));
    onDone();
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper anim-fade">
      <div className="safe-top mx-auto max-w-md px-5 pb-10 pt-8">
        <div className="text-4xl">🍳</div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight">Что приготовить?</h1>
        <p className="mt-2 text-ink-soft">Подберу блюдо из того, что есть дома, за минуту. Три вопроса — и советы будут под вас.</p>

        <div className="label mb-2 mt-7">Для скольких готовите</div>
        <div className="flex items-center gap-3"><Stepper value={eaters} min={1} max={12} onChange={setEaters} label="Едоков" /><span className="text-sm text-ink-soft">{eaters === 1 ? "только для себя" : eaters === 2 ? "вдвоём" : "семья"}</span></div>
        <div className="mt-3 flex flex-wrap gap-2"><Chip on={kids} onClick={() => setKids(!kids)}>👶 Есть дети</Chip></div>

        <div className="label mb-2 mt-6">Как готовите</div>
        <div className="grid gap-2">
          {LEVELS.map((l) => (
            <button key={l.id} className={cx("card px-4 py-3 text-left", level === l.id && "border-brand bg-brand-soft")} onClick={() => setLevel(l.id)}>
              <span className="block font-medium">{l.label}</span><span className="block text-xs text-ink-faint">{l.hint}</span>
            </button>
          ))}
        </div>

        <div className="label mb-2 mt-6">Что важно (можно несколько)</div>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => <Chip key={g.id} on={goals.includes(g.id)} onClick={() => setGoals((x) => { const on = x.includes(g.id); const next = on ? x.filter((y) => y !== g.id) : [...x.filter((y) => y !== "tasty"), g.id]; return next.length ? next : ["tasty"]; })}>{g.emoji} {g.label}</Chip>)}
        </div>

        <div className="label mb-2 mt-6">Есть на кухне</div>
        <div className="flex flex-wrap gap-2">
          {[["multicooker", "Мультиварка"], ["airfryer", "Аэрогриль"], ["microwave", "Микроволновка"]].map(([id, label]) => (
            <Chip key={id} on={extra.includes(id)} onClick={() => setExtra((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))}>{label}</Chip>
          ))}
        </div>

        <button className="btn-primary mt-8 w-full py-3.5 text-base" onClick={() => finish(false)}>Начать</button>
        <button className="btn-ghost mt-2 w-full" onClick={() => finish(true)}>Пропустить</button>
        <p className="mt-4 text-center text-xs text-ink-faint">Без регистрации. Всё хранится на вашем устройстве.</p>
      </div>
    </div>
  );
}
