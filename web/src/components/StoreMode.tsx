// «Я в магазине»: the list made for the shop floor — big rows by aisle, a tap or a swipe to the right marks it
// bought and it slides down to «Куплено», the screen stays on. Nothing else on the screen.
import { useMemo, useRef, useState } from "react";
import { Check, Refrigerator } from "lucide-react";
import { groupShopping, plural, type ShoppingItem } from "../engine";
import { shopLine } from "../app/amounts";
import { useWakeLock } from "../app/wakeLock";
import { Layer, cx } from "./ui";

export function StoreMode({ items, onToggle, onToPantry, onClose }: {
  items: ShoppingItem[]; onToggle: (key: string) => void; onToPantry: () => void; onClose: () => void;
}) {
  useWakeLock(true);
  const toBuy = items.filter((i) => !i.checked);
  const bought = items.filter((i) => i.checked);
  const groups = useMemo(() => groupShopping(toBuy), [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = toBuy.length;
  return (
    <Layer title="В магазине" onClose={onClose} closeIcon="close" full>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-[calc(env(safe-area-inset-top)+4rem)]">
        <p className="text-h2" aria-live="polite">{left ? "Осталось " + left + " " + plural(left, "продукт", "продукта", "продуктов") : "Всё куплено!"}</p>
        {left > 0 && <p className="mt-1 text-body text-ink-soft">Нажмите на продукт или смахните его вправо, когда положили в корзину.</p>}

        {groups.map((g) => (
          <section key={g.key} className="mt-6" aria-label={g.label}>
            <h2 className="mb-2 text-title text-ink-soft">{g.label}</h2>
            <ul className="card divide-y divide-line overflow-hidden">{g.items.map((i) => <BigRow key={i.key} i={i} onToggle={onToggle} />)}</ul>
          </section>
        ))}

        {!left && (
          <div className="mt-6 grid gap-2 sm:flex">
            {bought.length > 0 && <button className="btn-primary btn-bar" onClick={() => { onToPantry(); onClose(); }}><Refrigerator size={20} />Перенести в мои продукты</button>}
            <button className="btn-outline btn-bar" onClick={onClose}>Готово</button>
          </div>
        )}

        {bought.length > 0 && (
          <section className="mt-8" aria-label="Куплено">
            <h2 className="mb-2 text-title text-ink-soft">Куплено · {bought.length}</h2>
            <ul className="card divide-y divide-line overflow-hidden opacity-70">{bought.map((i) => <BigRow key={i.key} i={i} onToggle={onToggle} />)}</ul>
          </section>
        )}
      </div>
    </Layer>
  );
}

/** One product, big: a tap toggles it; a swipe to the right marks it bought. */
function BigRow({ i, onToggle }: { i: ShoppingItem; onToggle: (key: string) => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const swiped = useRef(false);
  const line = shopLine(i);
  const name = line.name;
  return (
    <li className="relative">
      {/* What the swipe uncovers */}
      {dx > 0 && <span className="absolute inset-0 flex items-center bg-herb-soft pl-5 text-herb" aria-hidden><Check size={26} strokeWidth={3} /></span>}
      <button
        className="relative flex min-h-[72px] w-full touch-pan-y items-center gap-4 bg-card px-4 py-3 text-left"
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? "none" : "transform .18s ease-out" }}
        aria-pressed={i.checked} aria-label={(i.checked ? "Куплено: " : "Купить: ") + name}
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; swiped.current = false; }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const x = e.clientX - s.x, y = Math.abs(e.clientY - s.y);
          if (x > 8 && x > y) setDx(Math.min(x, 160));
        }}
        onPointerUp={() => { if (dx > 80) { swiped.current = true; if (!i.checked) onToggle(i.key); } setDx(0); start.current = null; }}
        onPointerCancel={() => { setDx(0); start.current = null; }}
        onClick={() => { if (swiped.current) { swiped.current = false; return; } onToggle(i.key); }}>
        <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors", i.checked ? "border-herb bg-herb text-white" : "border-line-strong")} aria-hidden>
          {i.checked && <Check size={18} strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx("block text-[1.25rem] leading-snug", i.checked && "text-ink-faint line-through")}>{name}</span>
          {!i.checked && <span className="block text-body text-ink-soft">{line.text}{line.need && <span className="block text-small">{line.need}</span>}</span>}
        </span>
      </button>
    </li>
  );
}
