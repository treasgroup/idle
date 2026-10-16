import { Component, useEffect, useId, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { X, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cue } from "../app/feedback";
import { reportError } from "../app/errors";
import { AVATAR, Mascot, type Mood } from "./Mascot";

/** A light tap of vibration for actions that change something (Android; ignored elsewhere). */
export const haptic = (): void => cue("tap");

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ---------- Overlay stack: Esc closes only the top layer, focus returns to the opener ----------
const stack: { id: string; close: () => void; sheet?: boolean }[] = [];
let locked = 0;
/** Fires when a sheet opens or closes (toasts move to the top so they do not cover a sheet's buttons). */
const SHEETS_EVENT = "cook-sheets";
export const sheetOpen = (): boolean => stack.some((x) => x.sheet);
if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !stack.length) return;
    e.preventDefault();
    stack[stack.length - 1].close();
  });
}
function useOverlay(active: boolean, close: () => void, sheet = false) {
  const id = useId();
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    stack.push({ id, close: () => closeRef.current(), sheet });
    if (locked++ === 0) document.body.style.overflow = "hidden";
    if (sheet) window.dispatchEvent(new Event(SHEETS_EVENT));
    return () => {
      const i = stack.findIndex((x) => x.id === id);
      if (i >= 0) stack.splice(i, 1);
      if (sheet) window.dispatchEvent(new Event(SHEETS_EVENT));
      if (--locked === 0) document.body.style.overflow = "";
      opener?.focus?.({ preventScroll: true });
    };
  }, [active, id]);
}

/** Шеф's round avatar. */
export function ChefAvatar({ size = 32 }: { size?: number; mood?: Mood }) {
  return (
    <span aria-hidden className="inline-block shrink-0 overflow-hidden rounded-full bg-brand-soft" style={{ width: size, height: size }}>
      <img src={AVATAR} alt="" width={size} height={size} decoding="async" draggable={false} className="h-full w-full object-cover" />
    </span>
  );
}

/** The site's logo (fork and knife) — next to «Что приготовить?» in the header and menus. */
export function Logo({ size = 32 }: { size?: number }) {
  return <img src="./favicon.svg" alt="" aria-hidden width={size} height={size} draggable={false} className="shrink-0" />;
}

/**
 * A full-height layer over the app (recipe, cooking, documents, school). On desktop it sits next to the
 * sidebar like a page. `transparentUntil`: the header stays clear over a hero image until this many px are scrolled.
 */
export function Layer({ title, onClose, children, actions, width = "max-w-3xl", transparentUntil, closeIcon = "back", label, full }: {
  title?: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode; width?: string; transparentUntil?: number;
  closeIcon?: "back" | "close"; label?: string;
  /** Over the whole window, the site menu included (cooking: nothing else on screen). */
  full?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [solid, setSolid] = useState(transparentUntil === undefined);
  useOverlay(true, onClose);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (transparentUntil === undefined) return;
    const el = scroller.current;
    if (!el) return;
    const on = () => setSolid(el.scrollTop > transparentUntil);
    on();
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, [transparentUntil]);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label ?? (typeof title === "string" ? title : undefined)}
      className={cx("anim-fade fixed inset-0 z-40 flex flex-col bg-paper outline-none", !full && "lg:left-64")}>
      <div className={cx("pt-safe absolute inset-x-0 top-0 z-20 transition-colors duration-150", solid ? "border-b border-line bg-paper" : "bg-transparent")}>
        <div className={cx("mx-auto flex h-14 items-center gap-1 px-2", width)}>
          {/* A labelled control: «Назад» or «Закрыть», easy to find for anyone. */}
          <button onClick={onClose}
            className={cx("inline-flex h-11 shrink-0 items-center gap-0.5 rounded-full pl-2 pr-4 text-body font-medium text-ink transition-colors duration-150 hover:bg-sunken",
              !solid && "bg-card/90 shadow-e1 backdrop-blur hover:bg-card")}>
            {closeIcon === "close" ? <X size={22} aria-hidden /> : <ChevronLeft size={24} aria-hidden />}
            <span className={cx(closeIcon === "close" && title ? "sr-only" : "")}>{closeIcon === "close" ? "Закрыть" : "Назад"}</span>
          </button>
          {/* Phones: «Назад» is enough when the page's own H1 is right below; the title appears once it scrolls away. */}
          <div className={cx("min-w-0 flex-1 truncate px-1 text-title transition-opacity duration-150", solid ? "opacity-100" : "opacity-0",
            closeIcon === "back" && transparentUntil === undefined && "invisible sm:visible")}>{title}</div>
          {actions && <div className={cx("flex items-center gap-1", !solid && "[&>.icon-btn]:bg-card/90 [&>.icon-btn]:text-ink [&>.icon-btn]:shadow-e1 [&>.icon-btn]:backdrop-blur")}>{actions}</div>}
        </div>
      </div>
      <div ref={scroller} className={cx("flex-1 overflow-y-auto overscroll-contain", transparentUntil === undefined && "pt-[calc(env(safe-area-inset-top)+3.5rem)]")}>
        <div className={cx("mx-auto", width)}>{children}</div>
      </div>
    </div>
  );
}

/** A bottom sheet on phones, a centred dialog on desktop. `footer` sticks to the bottom with the main action. */
export function Sheet({ open, title, onClose, children, footer, tall }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  useOverlay(open, onClose, true);
  // Phones: drag the top of the sheet down to close it, as in native apps.
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => { if (!open) setDy(0); }, [open]);
  if (!open) return null;
  const drag = {
    onTouchStart: (e: React.TouchEvent) => { start.current = e.touches[0].clientY; },
    onTouchMove: (e: React.TouchEvent) => { if (start.current !== null) setDy(Math.max(0, e.touches[0].clientY - start.current)); },
    onTouchEnd: () => { if (dy > 90) onClose(); else setDy(0); start.current = null; },
  };
  return (
    <div className="scrim anim-fade fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cx("anim-sheet flex max-h-[90vh] w-full flex-col rounded-t-sheet bg-paper shadow-e2 sm:max-w-lg sm:rounded-[24px]", tall && "min-h-[70vh]", !dy && "transition-transform duration-200")}
        style={dy ? { transform: `translateY(${dy}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}>
        <div {...drag} className="touch-none sm:touch-auto">
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden><span className="h-1.5 w-10 rounded-full bg-line-strong/40" /></div>
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-2 sm:pt-4">
            <h2 className="text-h2">{title}</h2>
            <button className="icon-btn -mr-2" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
          </div>
        </div>
        <div className={cx("flex-1 overflow-y-auto overscroll-contain px-5", footer ? "pb-4" : "pb-[calc(env(safe-area-inset-bottom)+1.25rem)]")}>{children}</div>
        {footer && <div className="border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Chip({ on, onClick, children, className, label }: { on?: boolean; onClick?: () => void; children: ReactNode; className?: string; label?: string }) {
  return <button type="button" aria-pressed={on} aria-label={label} className={cx("chip", on && "chip-on", className)} onClick={onClick}>{children}</button>;
}

export function Stepper({ value, min, max, onChange, label, suffix }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string; suffix?: string }) {
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-line-strong/60 bg-card" role="group" aria-label={label}>
      <button className="grid h-11 w-11 place-items-center rounded-full disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Меньше"><Minus size={18} /></button>
      <span className="min-w-[2.75rem] text-center text-small font-semibold tabular-nums" aria-live="polite">{value}{suffix ? " " + suffix : ""}</span>
      <button className="grid h-11 w-11 place-items-center rounded-full disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Больше"><Plus size={18} /></button>
    </div>
  );
}

/** A section with a heading and an optional action on the right ("Все", "Показать другие"). */
export function Section({ title, icon, action, onAction, children, className, id }: {
  title?: ReactNode; icon?: ReactNode;
  /** A text link on the right (with `onAction`), or any element (a stepper). */
  action?: ReactNode; onAction?: () => void; children: ReactNode; className?: string; id?: string;
}) {
  return (
    <section className={cx("mt-8", className)} id={id} aria-label={typeof title === "string" ? title : undefined}>
      {(title || action) && (
        <div className="mb-3 flex min-h-[44px] items-center justify-between gap-3">
          {title && <h2 className="flex items-center gap-2 text-h2">{icon}{title}</h2>}
          {action && !onAction && <div className="shrink-0">{action}</div>}
          {action && onAction && <button className="-mr-2 inline-flex h-11 items-center gap-0.5 rounded-full px-2 text-small font-semibold text-brand hover:bg-brand-soft" onClick={onAction}>{action}<ChevronRight size={16} /></button>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon, title, children, actions, mood = "think" }: { icon?: ReactNode; title: string; children?: ReactNode; actions?: ReactNode; mood?: Mood }) {
  return (
    <div className="mt-6 rounded-card border border-dashed border-line-strong/50 px-5 py-8 text-center">
      {/* Шеф himself rather than a grey icon: an empty screen feels like an invitation, not an error. */}
      <div className="mb-2 flex justify-center">{icon === undefined || icon ? <Mascot size={96} mood={mood} /> : null}</div>
      <h2 className="text-h2">{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">{children}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block text-body-sm">{label}</span>
        {hint && <span className="block text-caption text-ink-faint">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => { haptic(); onChange(e.target.checked); }} />
      <span aria-hidden className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-brand", on ? "bg-brand-fill" : "bg-line-strong/60")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-150", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </label>
  );
}

/** Equal-width segmented control (radio group). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid h-11 rounded-full bg-sunken p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={cx("inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-small transition-colors duration-150", value === o.id ? "bg-card font-semibold text-ink shadow-e1" : "text-ink-soft hover:text-ink")}>
          <span className="truncate">{o.label}</span>
          {o.count !== undefined && o.count > 0 && <span className="rounded-full bg-paper px-1.5 text-micro text-ink-soft">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** A horizontal card carousel with edge fades; arrows for mouse users. */
export function ScrollRow({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div className="group relative -mx-4 sm:mx-0" role="region" aria-label={label}>
      <div ref={ref} className="scroller fade-x px-4 pb-1 sm:px-0">{children}</div>
      <button className="icon-btn absolute left-1 top-1/2 hidden -translate-y-1/2 bg-card shadow-e2 [@media(pointer:fine)]:group-hover:inline-grid" onClick={() => by(-1)} aria-label="Назад"><ChevronLeft size={20} /></button>
      <button className="icon-btn absolute right-1 top-1/2 hidden -translate-y-1/2 bg-card shadow-e2 [@media(pointer:fine)]:group-hover:inline-grid" onClick={() => by(1)} aria-label="Дальше"><ChevronRight size={20} /></button>
    </div>
  );
}

export interface ToastMsg { text: string; action?: { label: string; run: () => void } }
export function Toast({ message, onClose, raised }: { message: ToastMsg | null; onClose: () => void; raised?: boolean }) {
  const [top, setTop] = useState(sheetOpen);
  useEffect(() => {
    const on = () => setTop(sheetOpen());
    window.addEventListener(SHEETS_EVENT, on);
    return () => window.removeEventListener(SHEETS_EVENT, on);
  }, []);
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className={cx("pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4",
      top ? "top-[calc(env(safe-area-inset-top)+0.75rem)]" : cx("lg:left-64", raised ? "bottom-[calc(var(--nav-h)+var(--dock,0px)+4.5rem)]" : "bottom-[calc(var(--nav-h)+var(--dock,0px)+1rem)]"))}>
      <div className="anim-sheet pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink py-2.5 pl-4 pr-2 text-small text-paper shadow-e2">
        <span className="py-1">{message.text}</span>
        {message.action && <button className="h-9 shrink-0 rounded-full px-3 font-semibold text-brand-soft hover:bg-white/10" onClick={() => { message.action!.run(); onClose(); }}>{message.action.label}</button>}
      </div>
    </div>
  );
}

/** Live seconds left until `end` (ms). */
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

/** A screen that crashed shows a way back instead of a blank page. */
export class Boundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    reportError(error, "screen: " + (info.componentStack ?? "").trim().split("\n")[0]?.trim().slice(0, 120));
  }
  componentDidUpdate(prev: { resetKey?: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-4 mt-8 rounded-card border border-line p-6 text-center">
        <div className="mb-2 flex justify-center"><Mascot size={88} mood="oops" /></div>
        <h2 className="text-h2">Что-то пошло не так</h2>
        <p className="mt-1 text-body-sm text-ink-soft">Обновите страницу — ваши рецепты, план и покупки сохранены.</p>
        <button className="btn-primary mt-4" onClick={() => location.reload()}>Обновить</button>
      </div>
    );
  }
}

/** The page has scrolled (the header gets its bottom border). */
export function useScrolled(px = 4): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(window.scrollY > px);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, [px]);
  return on;
}
