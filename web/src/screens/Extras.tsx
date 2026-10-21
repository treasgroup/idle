// Smaller screens: the beginner course, legal documents, the family poll, first-run questions.
import { useEffect, useState } from "react";
import { CircleCheck, ArrowUpRight, Search, Egg, Soup, CalendarDays, ChevronRight } from "lucide-react";
import { apiUrl, legalDoc, legalInfo, plural, recipeById, type LegalInfo, type LegalKey } from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { KitchenTools } from "../components/KitchenTools";
import { ChefAvatar, Layer, Sheet, Stepper, Toggle, cx } from "../components/ui";
import { BEGINNER, LESSONS, SECTIONS, type Lesson } from "./learn-data";
import { LessonPlayer } from "../components/LessonPlayer";
import { RESCUE_GROUPS } from "../app/rescue";
import { cue } from "../app/feedback";
import { Mascot } from "../components/Mascot";
import { Tour, tourWanted } from "../components/Tour";
import { PlaceHint } from "../components/PlaceHint";

/** «Школа готовки»: sections (Для новичка · Основы · Техники · Продукты · Спасение), «Продолжить» with the next
 * lesson, and the lessons as short card decks (components/LessonPlayer). «Спасение» is the same help as in cooking. */
export function Learn({ onClose }: { onClose: () => void }) {
  const { profile, setProfile } = useStore();
  const done = new Set(profile.lessonsDone);
  const byId = (id: string) => LESSONS.find((l) => l.id === id)!;
  const order = [...BEGINNER, ...LESSONS.map((l) => l.id).filter((id) => !BEGINNER.includes(id))].map(byId);
  const next = order.find((l) => !done.has(l.id)) ?? null;
  const doneCount = LESSONS.filter((l) => done.has(l.id)).length;
  const [tab, setTab] = useState<(typeof SECTIONS)[number]["id"]>(() => (BEGINNER.every((id) => done.has(id)) ? "basics" : "beginner"));
  const [playing, setPlaying] = useState<Lesson | null>(null);
  // «#/learn/<lesson>»: a link from a kitchen word in a recipe step or from the lesson's page for search engines.
  useEffect(() => {
    const fromHash = () => { const id = location.hash.match(/^#\/learn\/([a-z-]+)/)?.[1]; const l = id && LESSONS.find((x) => x.id === id); if (l) setPlaying(l); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const close = () => {
    setPlaying(null);
    if (/^#\/learn\/./.test(location.hash)) history.replaceState(null, "", location.pathname + location.search + "#/learn");
  };
  const list = tab === "beginner" ? BEGINNER.map(byId) : LESSONS.filter((l) => l.section === tab);
  const finish = (l: Lesson) => {
    if (!done.has(l.id)) { setProfile((p) => ({ ...p, lessonsDone: [...p.lessonsDone, l.id] })); cue("bought"); }
    close();
  };
  const meta = (l: Lesson) => l.cards.length + " " + plural(l.cards.length, "карточка", "карточки", "карточек") + " · " + Math.max(1, Math.round((l.cards.length * 20 + l.quiz.length * 15) / 60)) + " мин";

  return (
    <Layer title="Школа готовки" onClose={onClose}>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-2 sm:px-6">
        <h1 className="text-h1">Школа готовки</h1>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-herb transition-all" style={{ width: (doneCount / LESSONS.length) * 100 + "%" }} /></div>
        <p className="mt-1.5 text-caption text-ink-soft">Пройдено {doneCount} из {LESSONS.length}</p>
        <PlaceHint id="learn" className="mt-4" text="Урок — несколько карточек: листайте пальцем, в конце — вопрос и рецепт, чтобы сразу попробовать." />

        <div className="scroller -mx-4 mt-4 px-4" role="tablist" aria-label="Разделы школы">
          {SECTIONS.map((x) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
              className={cx("chip h-10 shrink-0", tab === x.id && "border-brand-fill bg-brand-fill text-white hover:border-brand-fill")}>{x.label}</button>
          ))}
        </div>

        {tab === "rescue" ? <RescueList /> : (
          <>
            {/* Not when the lesson to take is the first one of the list right below: the card would repeat it. */}
            {next && (tab === "beginner" ? BEGINNER.includes(next.id) : next.section === tab) && list[0]?.id !== next.id && (
              <button onClick={() => setPlaying(next)} className="card mt-4 flex w-full items-center gap-3 border-brand/40 p-4 text-left hover:border-brand">
                <span className="min-w-0 flex-1">
                  <span className="block text-caption font-semibold text-brand">{doneCount ? "Продолжить" : "Начать"}</span>
                  <span className="mt-0.5 block text-title leading-snug">{next.title}</span>
                  <span className="mt-0.5 block text-caption text-ink-soft">{meta(next)}</span>
                </span>
                <ChevronRight size={20} className="shrink-0 text-brand" aria-hidden />
              </button>
            )}
            <div className="mt-4 grid gap-2">
              {list.map((l, n) => {
                const isDone = done.has(l.id);
                return (
                  <button key={l.id} onClick={() => setPlaying(l)} className="card flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left hover:border-line-strong">
                    {isDone
                      ? <CircleCheck size={32} className="shrink-0 text-herb" aria-label="Пройден" />
                      : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-herb-soft text-small font-semibold text-herb">{n + 1}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-sm font-semibold">{l.title}</span>
                      <span className="block text-caption text-ink-soft">{isDone ? "Пройден · " : ""}{meta(l)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-10">
          <KitchenTools />
        </div>
      </div>
      {playing && <LessonPlayer key={playing.id} lesson={playing} done={done.has(playing.id)} onFinish={() => finish(playing)} onClose={close} />}
    </Layer>
  );
}

/** «Спасение»: what to do when something went wrong — the answers from cooking's «Помощь», by kind of dish. */
function RescueList() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-4">
      <p className="text-body-sm text-ink-soft">Что делать, если пошло не так. Во время готовки это же — под кнопкой «Помощь».</p>
      <div className="mt-3 grid gap-3">
        {RESCUE_GROUPS.map((g) => (
          <section key={g.title} className="card overflow-hidden">
            <h2 className="px-4 pb-1 pt-3 font-sans text-title">{g.title}</h2>
            <ul className="divide-y divide-line">
              {g.items.map((t) => {
                const id = g.title + t.id;
                const expanded = open === id;
                return (
                  <li key={id}>
                    <button className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-body-sm" onClick={() => setOpen(expanded ? null : id)} aria-expanded={expanded}>
                      <span className="flex-1">{t.title}</span>
                      <ChevronRight size={18} className={cx("shrink-0 text-ink-faint transition-transform", expanded && "rotate-90")} aria-hidden />
                    </button>
                    {expanded && (
                      <ol className="space-y-2 px-4 pb-4">
                        {t.steps.map((st, i) => (
                          <li key={i} className="flex gap-3 text-body-sm">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-warn-soft text-caption font-semibold" aria-hidden>{i + 1}</span>
                            <span className="pt-0.5">{st}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
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

/** First visit: two short steps (text size, who eats what), two tour cards, then «Знакомьтесь — Шеф» — five screens.
 * «Пропустить» anywhere goes straight to the home screen. */
const LAST = 2;
const TOUR = LAST;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { s, profile, setProfile, update } = useStore();
  const a = useAssistant();
  const [step, setStep] = useState(0);
  const size = profile.textSize !== "m" ? profile.textSize : s.largeText ? "l" : "m";
  const setSize = (k: "m" | "l" | "xl") => { setProfile((p) => ({ ...p, textSize: k })); update((st) => ({ ...st, largeText: k !== "m" })); };
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

  const steps = [
    <div key="size">
      {/* «Простой режим» is not offered here (it is in the profile): on the first screen people tap it and get less than they need. */}
      <h1 className="text-h1">Какой размер текста удобнее?</h1>
      <p className="mt-2 text-body-sm text-ink-soft">Выберите — весь сервис станет таким. Поменять можно в любой момент в профиле.</p>
      <div className="mt-6 grid gap-2" role="radiogroup" aria-label="Размер текста">
        {(["m", "l", "xl"] as const).map((k, i) => (
          <button key={k} role="radio" aria-checked={size === k} onClick={() => setSize(k)}
            className={cx("flex min-h-[64px] items-center gap-4 rounded-card border px-4 py-3 text-left", size === k ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card")}>
            <span className="w-10 shrink-0 text-center font-semibold leading-none" style={{ fontSize: [18, 24, 30][i] + "px" }} aria-hidden>А</span>
            <span className="text-body">{["Обычный", "Крупный", "Очень крупный"][i]}</span>
          </button>
        ))}
      </div>
      <p className="mt-5 rounded-input bg-sunken px-4 py-3 text-body text-ink">Так будет выглядеть рецепт: «Нарежьте картофель кубиками и залейте холодной водой».</p>
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
    // Шеф also knows where things are (app/navigator).
    { icon: <CalendarDays size={20} />, text: "Где мой план?", ask: "где мой план?" },
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
              <button className="btn-primary h-13 w-full" onClick={() => { if (step === LAST - 1) save(false); setStep(step === LAST - 1 && !tourWanted() ? TOUR + 1 : step + 1); }}>Дальше</button>
              <div className="mt-1 flex">
                {step > 0 && <button className="btn-ghost flex-1" onClick={() => setStep(step - 1)}>Назад</button>}
                <button className="btn-ghost flex-1" onClick={() => { save(true); onDone(); }}>Пропустить</button>
              </div>
            </div>
          </>
        ) : step === TOUR ? (
          <div className="anim-rise flex flex-1 flex-col"><Tour first onDone={() => setStep(TOUR + 1)} onSkip={() => finish()} /></div>
        ) : (
          <div className="anim-rise flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="flex flex-1 flex-col justify-center py-8">
              <Mascot size={170} className="-ml-2" />
              <h1 className="mt-3 text-display">Знакомьтесь — Шеф</h1>
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
