// Running kitchen timers as a row of pills: a progress ring, «Шаг 2 · хлеб 9:54», and ⋯ for +1 мин / пауза / стоп.
import { useState } from "react";
import { MoreHorizontal, Pause, Play, Plus, X, BellRing } from "lucide-react";
import { addMinute, secondsLeft, stopTimer, timerTitle, togglePause, useTick, useTimers, type CookTimer } from "../app/timers";
import { Sheet, cx, mmss, useEdgeFade } from "./ui";

export function TimerRing({ t, size = 28, now }: { t: CookTimer; size?: number; now: number }) {
  const left = secondsLeft(t, now);
  const part = t.total > 0 ? Math.max(0, Math.min(1, left / t.total)) : 0;
  const r = size / 2 - 2.5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} className="stroke-line" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-brand transition-[stroke-dashoffset] duration-1000 ease-linear"
        strokeDasharray={c} strokeDashoffset={c * (1 - part)} />
    </svg>
  );
}

/**
 * `only`: show just the timers of one recipe. `onJump`: tapping a timer started from a step goes to that step.
 * `flush`: no edge-to-edge bleed (inside cards).
 * Renders nothing when there are no timers.
 */
export function TimerStrip({ only, hide, onJump, className, flush }: {
  only?: string;
  /** A timer shown big elsewhere on the screen (the current step's card in cooking): not twice. */
  hide?: (t: CookTimer) => boolean;
  onJump?: (t: CookTimer) => void; className?: string; flush?: boolean;
}) {
  const all = useTimers();
  const shown = (only ? all.filter((t) => t.recipeId === only || !t.recipeId) : all).filter((t) => !hide?.(t));
  const now = useTick(shown.some((t) => t.end && !t.rang));
  // The one to ring first leads (a rung one before all), so with three or four the urgent one is never off the screen.
  const list = [...shown].sort((a, b) => (a.rang ? -1 : 0) - (b.rang ? -1 : 0) || secondsLeft(a, now) - secondsLeft(b, now));
  const [menu, setMenu] = useState<CookTimer | null>(null);
  const [fadeRef, fade] = useEdgeFade();
  if (!list.length) return null;
  return (
    <div ref={fadeRef} className={cx("scroller", fade, !flush && "-mx-4 px-4", className)} role="group" aria-label="Таймеры">
      {list.map((t) => {
        const left = secondsLeft(t, now);
        const paused = t.pausedLeft != null;
        return (
          <div key={t.id} className={cx("flex h-10 shrink-0 items-center rounded-full border pl-1.5", t.rang ? "border-brand-fill bg-brand-fill text-white" : "border-line bg-card")}>
            <button className="flex h-10 items-center gap-2 pr-1 text-small" onClick={() => onJump?.(t)} disabled={!onJump}
              aria-label={timerTitle(t) + (t.rang ? ": время вышло" : ": осталось " + mmss(left))}>
              {t.rang ? <BellRing size={20} className="ml-1 animate-pulse" aria-hidden /> : <TimerRing t={t} now={now} />}
              <span className="max-w-[9rem] truncate">{timerTitle(t)}</span>
              <span className={cx("font-semibold tabular-nums", paused && "opacity-60")}>{t.rang ? "Готово" : mmss(left)}</span>
            </button>
            {t.rang ? (
              <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={() => stopTimer(t.id)} aria-label={"Убрать таймер «" + timerTitle(t) + "»"}><X size={18} /></button>
            ) : (
              <button className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-sunken" onClick={() => setMenu(t)} aria-label={"Таймер «" + timerTitle(t) + "»: действия"}><MoreHorizontal size={18} /></button>
            )}
          </div>
        );
      })}
      <Sheet open={!!menu} title={menu ? timerTitle(menu) : ""} onClose={() => setMenu(null)}>
        {menu && (
          <div className="grid gap-2">
            <button className="btn-outline justify-start" onClick={() => { addMinute(menu.id); setMenu(null); }}><Plus size={18} />Добавить минуту</button>
            <button className="btn-outline justify-start" onClick={() => { togglePause(menu.id); setMenu(null); }}>
              {menu.pausedLeft != null ? <><Play size={18} />Продолжить</> : <><Pause size={18} />Пауза</>}
            </button>
            <button className="btn-outline justify-start" onClick={() => { stopTimer(menu.id); setMenu(null); }}><X size={18} />Остановить</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
