import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Minus, Plus, ChevronLeft } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** A full-height layer over the app (recipe, cooking, documents). Esc and the back arrow close it. */
export function Layer({ title, onClose, children, actions, wide }: { title?: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.({ preventScroll: true }); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-black/30 anim-fade" onClick={onClose}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
        className={cx("anim-sheet flex h-full w-full flex-col bg-paper outline-none", wide ? "max-w-3xl" : "max-w-2xl")}
        onClick={(e) => e.stopPropagation()}>
        <div className="safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-line/60 bg-paper/95 px-2 py-2 backdrop-blur">
          <button className="btn-ghost px-2" onClick={onClose} aria-label="Назад"><ChevronLeft size={22} /></button>
          <div className="min-w-0 flex-1 truncate font-serif text-lg font-semibold">{title}</div>
          {actions}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

/** A bottom sheet for short choices and forms. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 anim-fade sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="anim-sheet safe-bottom max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button className="btn-ghost -mr-2 px-2" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chip({ on, onClick, children, className }: { on?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return <button type="button" aria-pressed={on} className={cx("chip", on && "chip-on", className)} onClick={onClick}>{children}</button>;
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-card" role="group" aria-label={label}>
      <button className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Меньше"><Minus size={16} /></button>
      <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Больше"><Plus size={16} /></button>
    </div>
  );
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("mt-6", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-end justify-between gap-3 px-4">
          {title && <h2 className="text-lg font-semibold leading-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mx-4 mt-6 rounded-xl2 border border-dashed border-line px-5 py-8 text-center">
      {icon && <div className="mb-2 flex justify-center text-ink-faint">{icon}</div>}
      <div className="font-serif text-lg font-semibold">{title}</div>
      {children && <div className="mt-1.5 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span className="min-w-0">
        <span className="block text-[15px]">{label}</span>
        {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className={cx("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-brand" : "bg-line")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </label>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[150px] z-[60] flex justify-center px-4">
      <div className="anim-sheet max-w-md rounded-2xl bg-ink px-4 py-3 text-center text-sm text-paper shadow-lg">{message}</div>
    </div>
  );
}

/** Live countdown text for a timer that ends at `end` (ms). */
export function useCountdown(end: number | null): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!end) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [end]);
  return end ? Math.max(0, Math.ceil((end - now) / 1000)) : 0;
}

export const mmss = (sec: number): string => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
};

import { Component, type ErrorInfo } from "react";
/** A screen that crashed shows a way back instead of a blank page. */
export class Boundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info.componentStack); }
  componentDidUpdate(prev: { resetKey?: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-4 mt-8 rounded-xl2 border border-line p-6 text-center">
        <div className="font-serif text-lg font-semibold">Что-то пошло не так</div>
        <p className="mt-1 text-sm text-ink-soft">Обновите страницу — ваши рецепты, меню и покупки сохранены.</p>
        <button className="btn-primary mt-4" onClick={() => location.reload()}>Обновить</button>
      </div>
    );
  }
}
