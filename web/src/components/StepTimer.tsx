// The timer card of a cooking step: «Таймер на 3 мин · Запустить», then the live countdown with pause, +1 мин and stop.
// It is one of the app's kitchen timers (app/timers.ts): it keeps running in the timer strip and the shell rings it.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BellRing, Check, ChevronDown, Pause, Play, Timer, X } from "lucide-react";
import { formatMinutes, plural } from "../engine";
import { batchPhase, type Batches } from "../app/batches";
import { addMinute, secondsLeft, startTimer, stopTimer, togglePause, useTick, useTimers, type CookTimer } from "../app/timers";
import { TimerRing } from "./TimerStrip";
import { cx, mmss } from "./ui";
import { cue } from "../app/feedback";

/** «3 мин», «45 сек», «1 мин 30 сек» */
export function durationText(sec: number): string {
  if (sec < 60) return sec + " сек";
  if (sec % 60 === 0) return formatMinutes(sec / 60);
  return Math.floor(sec / 60) + " мин " + (sec % 60) + " сек";
}

/** The kitchen timer started from this step of this recipe, if any. */
export function useStepTimer(recipeId: string, step: number): CookTimer | null {
  return useTimers().find((t) => t.recipeId === recipeId && t.step === step) ?? null;
}

export function StepTimer({ dish, recipeId, step, seconds: whole, label, batches, onStart, className }: {
  dish: string; recipeId: string; step: number;
  /** The step's own duration; a timer already running for the step wins. */
  seconds: number;
  label?: string;
  /** Frying in batches: the timer goes side by side, «партия 2 из 4» (app/batches). */
  batches?: Batches | null;
  onStart?: (seconds: number) => void;
  className?: string;
}) {
  const t = useStepTimer(recipeId, step);
  const seconds = batches ? batches.side : whole;
  const running = !!t && !t.rang && t.pausedLeft == null;
  const now = useTick(running);
  const paused = !!t && t.pausedLeft != null;
  const rang = !!t?.rang;
  const left = rang ? 0 : t ? secondsLeft(t, now) : seconds;
  // Before the start the ring is full: the whole time is still ahead.
  const ring: CookTimer = t ?? { id: "idle", dish, step, label: "", end: null, pausedLeft: seconds, total: seconds };
  const phaseTimer = (at: number) => {
    const ph = batches ? batchPhase(batches, at) : null;
    return ph ? { label: [label, ph.label].filter(Boolean).join(" · "), phase: at, ring: ph.ring } : { label };
  };
  const start = () => { cue("wind"); startTimer({ dish, recipeId, step, seconds, ...phaseTimer(0) }); onStart?.(seconds); };
  // The next side or batch: the same step, the next phase.
  const at = t?.phase;
  const phase = batches && at != null ? batchPhase(batches, at) : null;
  const next = batches && at != null && phase && !phase.last ? batchPhase(batches, at + 1) : null;
  const goOn = () => { cue("wind"); startTimer({ dish, recipeId, step, seconds, ...phaseTimer((at ?? 0) + 1) }); };

  // With very large text the card can sit under the bottom bar: then a small copy of it floats just above the bar.
  const card = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = card.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock")) || 0;
    // Hidden = less than 60 % of the card is above the bar (above the cooking layer z-40, under the sheets z-50).
    const io = new IntersectionObserver(([e]) => setHidden(e.intersectionRatio < 0.6), { rootMargin: "0px 0px -" + Math.round(dock) + "px 0px", threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const status = phase
    ? (rang ? cap(phase.ring) : (paused ? "На паузе · " : "") + cap(phase.label))
    : rang ? "Время вышло" : paused ? "На паузе" : running ? "Осталось" : batches
      ? "По " + durationText(seconds) + (batches.flips ? " на сторону" : " на партию") + " · " + batches.rounds + " " + plural(batches.rounds, "партия", "партии", "партий")
      : "Таймер на " + durationText(seconds) + " · нажмите круг";
  const icon = "shrink-0 max-[359px]:hidden";
  const buttons = !t ? (
    <button className="btn-primary h-12 flex-1 sm:flex-none" onClick={start}><Play size={18} className="shrink-0" aria-hidden />Запустить</button>
  ) : rang && next ? (
    <>
      <button className="btn-outline h-12 flex-1 px-3 sm:flex-none sm:px-5" onClick={() => stopTimer(t.id)}><Check size={18} className={icon} aria-hidden />Всё</button>
      <button className="btn-primary h-12 flex-[2] px-3 sm:flex-none sm:px-5" onClick={goOn} aria-label={(next.second ? "Вторая сторона" : "Следующая партия") + ", " + durationText(seconds)}><Play size={18} className={icon} aria-hidden />{next.second ? "Вторая сторона" : "Следующая партия"}</button>
    </>
  ) : rang ? (
    <>
      <button className="btn-outline h-12 flex-1 px-3 sm:flex-none sm:px-5" onClick={() => addMinute(t.id)} aria-label="Добавить минуту">+1 мин</button>
      <button className="btn-primary h-12 flex-1 px-3 sm:flex-none sm:px-5" onClick={() => stopTimer(t.id)}><Check size={18} className={icon} aria-hidden />Готово</button>
    </>
  ) : (
    <>
      <button className={cx("h-12 flex-1 px-3 sm:flex-none sm:px-5", paused ? "btn-primary" : "btn-outline")} onClick={() => togglePause(t.id)}>
        {paused ? <><Play size={18} className={icon} aria-hidden />Продолжить</> : <><Pause size={18} className={icon} aria-hidden />Пауза</>}
      </button>
      <button className="btn-outline h-12 flex-1 px-3 sm:flex-none sm:px-5" onClick={() => addMinute(t.id)} aria-label="Добавить минуту">+1 мин</button>
      <button className="icon-btn h-12 w-12 border border-line bg-card hover:border-line-strong" onClick={() => stopTimer(t.id)} aria-label="Остановить таймер"><X size={20} /></button>
    </>
  );

  return (
    <>
    <section ref={card} aria-label="Таймер шага" className={cx("rounded-card border p-4 transition-colors duration-150 sm:p-5", rang ? "border-brand bg-brand-soft" : t ? "border-brand/30 bg-card shadow-e1" : "border-line bg-card shadow-e1", className)}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* Before the start the circle itself is ▶: with very large text «Запустить» below can end up under the bottom bar. */}
          {!t ? (
            <button type="button" className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-brand-fill text-white transition-transform active:scale-[.96]" onClick={start} aria-label={"Запустить таймер на " + durationText(seconds)}>
              <Play size={30} className="translate-x-0.5" aria-hidden />
            </button>
          ) : <span className="relative grid h-[72px] w-[72px] shrink-0 place-items-center">
            {rang
              ? <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-fill text-white"><BellRing size={28} className="animate-pulse" aria-hidden /></span>
              : <>
                  <span className="absolute inset-0"><TimerRing t={ring} size={72} now={now} /></span>
                  {paused ? <Pause size={24} className="text-ink-soft" aria-hidden /> : <Timer size={26} className={running ? "text-brand" : "text-ink-soft"} aria-hidden />}
                </>}
          </span>}
          <span className="min-w-0">
            <span className={cx("block text-small", rang ? "font-semibold text-brand-ink" : "text-ink-soft")} aria-live="polite">{status}</span>
            <span className={cx("block whitespace-nowrap text-timer tabular-nums sm:text-[3rem]", !t && "text-ink-soft", paused && "text-ink-soft", rang && "text-brand-ink")}>
              {mmss(left)}
            </span>
          </span>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">{buttons}</div>
      </div>
    </section>
    {hidden && createPortal(
      <div className="fixed inset-x-3 z-[45] mx-auto flex max-w-md items-center gap-3 rounded-full border bg-card p-1.5 pr-2 shadow-e1 anim-fade" style={{ bottom: "calc(var(--dock, 0px) + 8px)", borderColor: t && !rang ? "rgb(var(--brand))" : undefined }} role="group" aria-label="Таймер шага">
        {!t ? (
          <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-fill text-white active:scale-[.96]" onClick={start} aria-label={"Запустить таймер на " + durationText(seconds)}><Play size={22} className="translate-x-px" aria-hidden /></button>
        ) : rang && next ? (
          <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-fill text-white" onClick={goOn} aria-label={next.second ? "Вторая сторона" : "Следующая партия"}><Play size={22} className="translate-x-px" aria-hidden /></button>
        ) : rang ? (
          <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-fill text-white" onClick={() => stopTimer(t.id)} aria-label="Готово"><Check size={22} aria-hidden /></button>
        ) : (
          <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-brand text-brand" onClick={() => togglePause(t.id)} aria-label={paused ? "Продолжить" : "Пауза"}>{paused ? <Play size={22} aria-hidden /> : <Pause size={22} aria-hidden />}</button>
        )}
        <span className="min-w-0 flex-1">
          <span className={cx("block text-caption", rang ? "font-semibold text-brand-ink" : "text-ink-soft")}>{!t ? "Таймер шага" : status}</span>
          <span className={cx("block text-body font-semibold tabular-nums", t && !paused && !rang ? "text-brand" : "text-ink")}>{mmss(left)}</span>
        </span>
        <button type="button" className="icon-btn border border-line" onClick={() => card.current?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label="Показать таймер целиком"><ChevronDown size={20} /></button>
      </div>,
      document.body,
    )}
    </>
  );
}
