// A dish's photo over the whole screen, as in the phone's gallery: two fingers or a double tap bring it closer
// (up to 3×; our covers are not big enough for more), one finger moves it, a swipe down, ✕, Esc or the phone's
// «Назад» closes it.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOverlay } from "./ui";

const MAX = 3;
type View = { s: number; x: number; y: number };
type Pt = { x: number; y: number };
const NONE: View = { s: 1, x: 0, y: 0 };
const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

export function PhotoViewer({ src, title, open, onClose }: { src: string; title: string; open: boolean; onClose: () => void }) {
  useOverlay(open, onClose);
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [v, setV] = useState<View>(NONE);
  const [drop, setDrop] = useState(0);
  const [moving, setMoving] = useState(false);
  const pts = useRef(new Map<number, Pt>());
  const start = useRef<{ v: View; a: Pt; d: number; m: Pt; moved: boolean } | null>(null);
  const lastTap = useRef<{ t: number; p: Pt } | null>(null);

  useEffect(() => { if (open) { setV(NONE); setDrop(0); } }, [open]);
  if (!open) return null;

  // Points relative to the screen's centre (the photo's resting place).
  const rel = (e: { clientX: number; clientY: number }): Pt => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };
  // The photo never leaves an empty edge on screen when it is bigger than the screen.
  const clamp = (n: View): View => {
    const s = Math.min(MAX, Math.max(1, n.s));
    const r = box.current!.getBoundingClientRect(), i = img.current;
    const w = (i?.offsetWidth ?? r.width) * s, h = (i?.offsetHeight ?? r.height) * s;
    const mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
    return s === 1 ? NONE : { s, x: Math.min(mx, Math.max(-mx, n.x)), y: Math.min(my, Math.max(-my, n.y)) };
  };
  // Zoom to `s` keeping the photo's point under `p` where it is.
  const zoomAt = (from: View, s: number, p0: Pt, p: Pt): View =>
    clamp({ s, x: p.x - (s / from.s) * (p0.x - from.x), y: p.y - (s / from.s) * (p0.y - from.y) });
  const begin = () => {
    const l = [...pts.current.values()];
    const m = l.length > 1 ? { x: (l[0].x + l[1].x) / 2, y: (l[0].y + l[1].y) / 2 } : l[0];
    start.current = { v, a: l[0], d: l.length > 1 ? Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y) : 0, m, moved: start.current?.moved ?? false };
  };

  const down = (e: ReactPointerEvent) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* an old WebView: the moves still come */ }
    pts.current.set(e.pointerId, rel(e));
    if (pts.current.size === 1) start.current = null;
    begin();
    setMoving(true);
  };
  const move = (e: ReactPointerEvent) => {
    if (!pts.current.has(e.pointerId) || !start.current) return;
    pts.current.set(e.pointerId, rel(e));
    const st = start.current, l = [...pts.current.values()];
    if (Math.hypot(l[0].x - st.a.x, l[0].y - st.a.y) > 8) st.moved = true;
    if (l.length > 1 && st.d > 0) {
      const m = { x: (l[0].x + l[1].x) / 2, y: (l[0].y + l[1].y) / 2 };
      setV(zoomAt(st.v, st.v.s * (Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y) / st.d), st.m, m));
    } else if (st.v.s > 1) {
      setV(clamp({ ...st.v, x: st.v.x + l[0].x - st.a.x, y: st.v.y + l[0].y - st.a.y }));
    } else {
      setDrop(Math.max(0, l[0].y - st.a.y));
    }
  };
  const up = (e: ReactPointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    const p = pts.current.get(e.pointerId)!;
    pts.current.delete(e.pointerId);
    const st = start.current;
    if (pts.current.size) { begin(); return; }
    setMoving(false);
    if (drop > 110) { onClose(); return; }
    setDrop(0);
    if (!st || st.moved || e.type === "pointercancel") return;
    // A double tap: closer at that point, or the whole photo again.
    const now = Date.now(), t = lastTap.current;
    if (t && now - t.t < 320 && Math.hypot(t.p.x - p.x, t.p.y - p.y) < 40) {
      lastTap.current = null;
      setV(v.s > 1 ? NONE : zoomAt(v, 2.5, p, p));
    } else lastTap.current = { t: now, p };
  };
  // A mouse wheel or a touchpad on a computer.
  const wheel = (e: ReactWheelEvent) => setV(zoomAt(v, v.s * Math.exp(-e.deltaY * 0.0025), rel(e), rel(e)));

  const fade = Math.max(0.35, 1 - drop / 400);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={"Фото: " + title} className="fixed inset-0 z-[90] select-none" style={{ background: `rgba(14,12,11,${fade})` }}>
      <div ref={box} className="absolute inset-0 grid touch-none place-items-center overflow-hidden"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
        <img ref={img} src={src} alt={title} draggable={false} decoding="async"
          className={moving ? "max-h-full max-w-full" : "max-h-full max-w-full transition-transform duration-200 ease-out"}
          style={{ transform: `translate(${v.x}px, ${v.y + drop}px) scale(${v.s * (drop ? 1 - drop / 1600 : 1)})` }} />
      </div>
      <button className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
        onClick={onClose} aria-label="Закрыть фото"><X size={24} /></button>
      {v.s === 1 && !drop && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-10 text-white">
          <p className="text-body font-semibold">{title}</p>
          <p className="mt-1 text-small text-white/75">{touch ? "Двумя пальцами или двойным касанием — приблизить" : "Колёсиком мыши или двойным щелчком — приблизить"}</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
