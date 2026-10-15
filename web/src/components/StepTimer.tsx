// The timer card of a cooking step: «Таймер на 3 мин · Запустить», then the live countdown with pause, +1 мин and stop.
// It is one of the app's kitchen timers (app/timers.ts): it keeps running in the timer strip and the shell rings it.
import { BellRing, Check, Pause, Play, Timer, X } from "lucide-react";
import { formatMinutes } from "../engine";
import { addMinute, secondsLeft, startTimer, stopTimer, togglePause, useTick, useTimers, type CookTimer } from "../app/timers";
import { TimerRing } from "./TimerStrip";
import { cx, mmss } from "./ui";

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

export function StepTimer({ dish, recipeId, step, seconds, label, onStart, className }: {
  dish: string; recipeId: string; step: number;
  /** The step's own duration; a timer already running for the step wins. */
  seconds: number;
  label?: string;
  onStart?: (seconds: number) => void;
  className?: string;
}) {
  const t = useStepTimer(recipeId, step);
  const running = !!t && !t.rang && t.pausedLeft == null;
  const now = useTick(running);
  const paused = !!t && t.pausedLeft != null;
  const rang = !!t?.rang;
  const left = rang ? 0 : t ? secondsLeft(t, now) : seconds;
  // Before the start the ring is full: the whole time is still ahead.
  const ring: CookTimer = t ?? { id: "idle", dish, step, label: "", end: null, pausedLeft: seconds, total: seconds };
  const start = () => { startTimer({ dish, recipeId, step, label, seconds }); onStart?.(seconds); };

  const status = rang ? "Время вышло" : paused ? "На паузе" : running ? "Осталось" : "Таймер на " + durationText(seconds);
  const icon = "shrink-0 max-[359px]:hidden";
  const buttons = !t ? (
    <button className="btn-primary h-12 flex-1 sm:flex-none" onClick={start}><Play size={18} className="shrink-0" aria-hidden />Запустить</button>
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
    <section aria-label="Таймер шага" className={cx("rounded-card border p-4 transition-colors duration-150 sm:p-5", rang ? "border-brand bg-brand-soft" : t ? "border-brand/30 bg-card shadow-e1" : "border-line bg-card shadow-e1", className)}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="relative grid h-[72px] w-[72px] shrink-0 place-items-center">
            {rang
              ? <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-fill text-white"><BellRing size={28} className="animate-pulse" aria-hidden /></span>
              : <>
                  <span className="absolute inset-0"><TimerRing t={ring} size={72} now={now} /></span>
                  {paused ? <Pause size={24} className="text-ink-soft" aria-hidden /> : <Timer size={26} className={running ? "text-brand" : "text-ink-soft"} aria-hidden />}
                </>}
          </span>
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
  );
}
