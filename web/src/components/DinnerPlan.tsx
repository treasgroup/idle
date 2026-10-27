// «Ужин к сроку» on screen (the scheduling is app/dinner): a sheet to pick the time and one or two dishes to serve
// with, then one big timeline of every dish's steps — «Сейчас», what comes next, free windows while things stew,
// «Я опаздываю на 10 минут». A reminder rings before each step, also with the screen off (it is an ordinary timer).
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChefHat, Clock, Coffee, X } from "lucide-react";
import { courseOf, recipeById, recipes, suggestSides, type Recipe } from "../engine";
import { DINNER_EVENT, dinnerTitle, loadDinner, saveDinner, schedule, type DinnerPlan, type Schedule } from "../app/dinner";
import { startTimer, stopTimer, useTimers } from "../app/timers";
import { push, replace, routeHash } from "../app/router";
import { useStore } from "../app/store";
import { cue } from "../app/feedback";
import { RecipeImage } from "./RecipeCard";
import { Chip, Layer, Sheet, cx } from "./ui";

const hhmm = (t: number | Date) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const COLORS = ["bg-brand-fill", "bg-herb", "bg-[#7F77DD]"];
const MIN = 60e3;

/** The plan kept on the device, live across screens. */
export function useDinner(): DinnerPlan | null {
  const [p, setP] = useState(loadDinner);
  useEffect(() => {
    const on = () => setP(loadDinner());
    window.addEventListener(DINNER_EVENT, on);
    return () => window.removeEventListener(DINNER_EVENT, on);
  }, []);
  return p;
}

function planOf(p: DinnerPlan | null): { list: Recipe[]; s: Schedule } | null {
  if (!p) return null;
  const list = p.dishes.map((d) => recipeById(d.recipeId)).filter((r): r is Recipe => !!r);
  return list.length ? { list, s: schedule(list, p.serveAt) } : null;
}

/** Dishes that go well with this one: sides for a main, a quick salad, something sweet — at most six to choose from. */
function companions(base: Recipe): Recipe[] {
  const all = recipes().filter((r) => r.id !== base.id && r.totalMinutes <= 120);
  const course = courseOf(base);
  const sides = course === "main" && base.needsSide ? suggestSides(base).slice(0, 2) : [];
  const salads = all.filter((r) => courseOf(r) === "salad" && r.totalMinutes <= 30).slice(0, 2);
  const sweet = course === "dessert" || course === "baking" ? [] : all.filter((r) => (courseOf(r) === "dessert" || (courseOf(r) === "baking" && r.tags.includes("sweet"))) && r.totalMinutes <= 60).slice(0, 2);
  const seen = new Set<string>();
  return [...sides, ...salads, ...sweet].filter((r) => !seen.has(r.id) && seen.add(r.id)).slice(0, 6);
}

/** Times worth offering: the first half-hour the whole dinner can still make, then every half-hour for three hours. */
function choices(list: Recipe[], now = Date.now()): number[] {
  const probe = schedule(list, now + 24 * 60 * MIN);
  const need = probe.serveAt - probe.start;
  const first = new Date(now + need + 5 * MIN);
  first.setSeconds(0, 0);
  first.setMinutes(Math.ceil(first.getMinutes() / 30) * 30);
  return Array.from({ length: 6 }, (_, i) => first.getTime() + i * 30 * MIN);
}

export function DinnerSetup({ open, base, preset, onClose }: { open: boolean; base: Recipe; preset?: Recipe[]; onClose: () => void }) {
  const { profile } = useStore();
  const offer = useMemo(() => (open ? (preset ? preset.filter((r) => r.id !== base.id) : companions(base)) : []), [open, base, preset]);
  const [picked, setPicked] = useState<string[]>(() => (preset ? preset.filter((r) => r.id !== base.id).slice(0, 2).map((r) => r.id) : []));
  const list = useMemo(() => [base, ...offer.filter((r) => picked.includes(r.id))], [base, offer, picked]);
  const times = useMemo(() => (open ? choices(list) : []), [open, list]);
  const [at, setAt] = useState<number | null>(null);
  const serve = at && times.includes(at) ? at : times[1] ?? times[0];
  const s = useMemo(() => (serve ? schedule(list, serve) : null), [list, serve]);
  if (!open || !s) return null;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? p : [...p, id]));
  const make = () => {
    saveDinner({ serveAt: serve, dishes: list.map((r) => ({ recipeId: r.id, servings: profile.eaters })), done: [], at: Date.now() });
    cue("tap");
    onClose();
    push(routeHash({ dinner: true }));
  };
  return (
    <Sheet open title="Подать к сроку" onClose={onClose}
      footer={<button className="btn-primary h-13 w-full" onClick={make}><Clock size={18} aria-hidden />Составить план ужина</button>}>
      <p className="label mb-2">К какому времени?</p>
      <div className="flex flex-wrap gap-2">{times.map((t) => <Chip key={t} on={t === serve} onClick={() => setAt(t)}>{hhmm(t)}</Chip>)}</div>
      {offer.length > 0 && (
        <>
          <p className="label mb-2 mt-5">Подать вместе с <span className="font-normal normal-case text-ink-soft">· до двух блюд</span></p>
          <div className="grid gap-2">
            {offer.map((r) => {
              const on = picked.includes(r.id);
              return (
                <button key={r.id} onClick={() => toggle(r.id)} aria-pressed={on}
                  className={cx("flex min-h-[56px] items-center gap-3 rounded-input border p-1.5 pr-3 text-left", on ? "border-brand bg-brand-soft" : "border-line bg-card hover:border-line-strong")}>
                  <RecipeImage recipe={r} className="h-11 w-11 shrink-0" rounded="rounded-[10px]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-semibold">{r.title}</span><span className="block text-caption text-ink-soft">{r.totalMinutes} мин</span></span>
                  {on && <Check size={20} className="shrink-0 text-brand" aria-hidden />}
                </button>
              );
            })}
          </div>
        </>
      )}
      <p className="mt-5 rounded-input bg-sunken px-4 py-3 text-body-sm">
        Начать в <b>{hhmm(s.start)}</b> · у плиты около {s.handsOn} мин{s.free.length ? ", остальное — само томится и печётся" : ""}.
      </p>
    </Sheet>
  );
}

/** Keeps one reminder going: for the next step that has not started yet. Mounted once in the app shell. */
export function useDinnerReminders(): void {
  const plan = useDinner();
  const timers = useTimers();
  const { catalog } = useStore();
  // Recomputed when the full catalog arrives: on a first start some dishes are not loaded yet.
  const p = useMemo(() => planOf(plan), [plan, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const title = plan ? dinnerTitle(plan) : "";
    const mine = timers.filter((t) => t.dish.startsWith("Ужин к ") || t.dish.startsWith("Заготовки к "));
    const next = p?.s.items.find((it) => !plan!.done.includes(it.key) && it.start > Date.now() + 30e3);
    const want = next ? { label: short(p!.list[next.dish].title, next.text), end: next.start } : null;
    for (const t of mine) if (!want || t.label !== want.label || t.dish !== title || Math.abs((t.end ?? 0) - want.end) > 60e3) { if (!t.rang) stopTimer(t.id); }
    if (want && !mine.some((t) => t.label === want.label && t.dish === title && Math.abs((t.end ?? 0) - want.end) <= 60e3))
      startTimer({ dish: title, label: want.label, seconds: Math.round((want.end - Date.now()) / 1000) });
  }, [p, plan, timers]);
}
const short = (dish: string, text: string) => dish + ": " + (text.split(/(?<=[.!?])\s/)[0] ?? text).slice(0, 60);

export function DinnerLayer({ onClose }: { onClose: () => void }) {
  const plan = useDinner();
  const { catalog } = useStore();
  const p = useMemo(() => planOf(plan), [plan, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20e3); return () => clearInterval(t); }, []);
  if (!plan || !p) {
    return (
      <Layer title="Ужин к сроку" onClose={onClose}>
        <div className="mx-auto max-w-md px-5 pt-10 text-center">
          <ChefHat size={48} className="mx-auto text-ink-soft" aria-hidden />
          <h1 className="mt-4 text-h1">Плана ужина нет</h1>
          <p className="mt-2 text-body text-ink-soft">Откройте рецепт и нажмите «Подать к сроку» — соберу шаги всех блюд в одну ленту.</p>
          <button className="btn-primary mt-6 h-13 w-full" onClick={() => { onClose(); replace(routeHash({ tab: "recipes" })); }}>Выбрать рецепт</button>
        </div>
      </Layer>
    );
  }
  const { list, s } = p;
  const done = new Set(plan.done);
  const current = s.items.find((it) => !done.has(it.key)) ?? null;
  const markDone = () => { if (!current) return; cue("tap"); saveDinner({ ...plan, done: [...plan.done, current.key] }); };
  const late = () => { cue("tap"); saveDinner({ ...plan, serveAt: plan.serveAt + 10 * MIN }); };
  const end = () => { saveDinner(null); onClose(); };
  const finished = !current;
  return (
    <Layer title={dinnerTitle(plan)} onClose={onClose} width="max-w-xl lg:max-w-5xl">
      {/* On a computer: the plan and its buttons on the left (they stay in view), the steps on the right. */}
      <div className="mx-auto max-w-xl px-4 pb-40 pt-2 sm:px-6 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:pb-16">
        <div className="lg:sticky lg:top-4">
        <h1 className="text-h1">{dinnerTitle(plan)}</h1>
        <p className="mt-1 text-body-sm text-ink-soft">Начать в {hhmm(s.start)} · у плиты около {s.handsOn} мин</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 lg:flex-col lg:gap-2">
          {list.map((r, i) => <li key={r.id} className="flex items-center gap-1.5 text-small"><span className={cx("h-2.5 w-2.5 rounded-full", COLORS[i])} aria-hidden />{r.title}</li>)}
        </ul>
        <div className="mt-6 hidden gap-2 lg:grid">
          {finished
            ? <button className="btn-primary h-13" onClick={end}><Check size={20} aria-hidden />{plan.kind === "prep" ? "Всё заготовлено" : "Приятного аппетита"}</button>
            : <button className="btn-primary h-13" onClick={markDone}><Check size={20} aria-hidden />Готово — дальше</button>}
          <button className="btn-outline h-12" onClick={late}>Опаздываю на 10 мин</button>
        </div>
        </div>
        <div>
        <ol className="mt-5 grid gap-1.5 lg:mt-0">
          {s.items.map((it) => {
            const isDone = done.has(it.key);
            const isNow = current?.key === it.key;
            const freeAfter = s.free.find((f) => f.from >= it.start && f.from <= it.handsEnd + 60e3 && f.from > it.start);
            const expanded = open === it.key || isNow;
            return (
              <li key={it.key}>
                <button onClick={() => setOpen(open === it.key ? null : it.key)} aria-expanded={expanded}
                  className={cx("flex w-full gap-3 rounded-card px-3 py-2.5 text-left transition-colors", isNow ? "bg-warn-soft" : "hover:bg-sunken", isDone && "opacity-45")}>
                  <span className="w-12 shrink-0 pt-0.5 text-body font-semibold tabular-nums">{hhmm(it.start)}</span>
                  <span className={cx("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", COLORS[it.dish])} aria-hidden />
                  <span className="min-w-0 flex-1">
                    {isNow && <span className="block text-caption font-semibold text-brand">{it.start > now ? "Следующее · через " + Math.max(1, Math.round((it.start - now) / MIN)) + " мин" : "Сейчас"}</span>}
                    <span className={cx("block text-body", !expanded && "line-clamp-2")}>{it.text}</span>
                    {expanded && it.wait > 0 && <span className="mt-1 block text-small text-ink-soft">Потом ждать {Math.round(it.wait / 60)} мин — таймер напомнит.</span>}
                  </span>
                  {isDone && <Check size={18} className="mt-1 shrink-0 text-herb" aria-label="Сделано" />}
                </button>
                {freeAfter && (
                  <p className="flex items-center gap-2 py-1 pl-[4.25rem] text-small text-herb"><Coffee size={16} aria-hidden />Свободно до {hhmm(freeAfter.to)} — само томится и печётся</p>
                )}
              </li>
            );
          })}
          <li className="flex gap-3 px-3 py-2.5">
            <span className="w-12 shrink-0 text-body font-semibold tabular-nums">{hhmm(s.serveAt)}</span>
            <span className="text-body font-semibold">{plan.kind === "prep" ? "Остудите и разложите по контейнерам — что на 4-й и 5-й день, в морозилку" : "Подавайте! 🍽"}</span>
          </li>
        </ol>
        <p className="mt-4 flex items-center gap-2 text-small text-ink-soft"><Bell size={16} aria-hidden />Перед каждым шагом прозвенит напоминание — и при выключенном экране.</p>
        <button className="btn-ghost mt-6 w-full text-ink-soft" onClick={end}><X size={18} aria-hidden />Закончить и убрать план</button>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-6">
          <button className="btn-outline h-13 px-4" onClick={late}>Опаздываю на 10 мин</button>
          {finished
            ? <button className="btn-primary h-13 flex-1" onClick={end}><Check size={20} aria-hidden />{plan.kind === "prep" ? "Всё заготовлено" : "Приятного аппетита"}</button>
            : <button className="btn-primary h-13 flex-1" onClick={markDone}><Check size={20} aria-hidden />Готово — дальше</button>}
        </div>
      </div>
    </Layer>
  );
}
