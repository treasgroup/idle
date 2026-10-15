// The products people have most often, as big buttons with a picture: easier to find than a word in a list.
import { useMemo } from "react";
import { Check } from "lucide-react";
import { ingredientOptions, shortName } from "../engine";
import { cx, haptic } from "./ui";

const FREQUENT: [string, string][] = [
  ["potato", "🥔"], ["onion", "🧅"], ["carrot", "🥕"], ["egg", "🥚"], ["chicken-fillet", "🍗"], ["minced-pork-beef", "🥩"],
  ["pasta", "🍝"], ["rice", "🍚"], ["buckwheat", "🥣"], ["milk", "🥛"], ["hard-cheese", "🧀"], ["tomato", "🍅"],
  ["cucumber", "🥒"], ["cabbage", "🥬"], ["mushroom", "🍄"], ["sour-cream", "🫙"], ["cottage-cheese", "🍶"], ["sausage", "🌭"],
];

export function useFrequent(): [string, string][] {
  return useMemo(() => {
    const known = new Set(ingredientOptions().map((o) => o.id));
    return FREQUENT.filter(([id]) => known.has(id));
  }, []);
}

export function ProductTiles({ on, onToggle, className }: { on: (id: string) => boolean; onToggle: (id: string) => void; className?: string }) {
  const items = useFrequent();
  return (
    <ul className={cx("grid grid-cols-3 gap-2 min-[400px]:grid-cols-4 sm:grid-cols-6", className)} aria-label="Частые продукты">
      {items.map(([id, emoji]) => {
        const picked = on(id);
        return (
          <li key={id}>
            <button className={cx("relative flex h-[84px] w-full flex-col items-center justify-center gap-1 rounded-input border px-1 text-center transition-colors duration-150",
              picked ? "border-brand bg-brand-soft" : "border-line bg-card hover:border-line-strong")} onClick={() => { haptic(); onToggle(id); }} aria-pressed={picked}>
              <span className="text-[28px] leading-none" aria-hidden>{emoji}</span>
              <span className="line-clamp-2 text-small leading-tight">{shortName(id)}</span>
              {picked && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand text-white" aria-hidden><Check size={13} strokeWidth={3} /></span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
