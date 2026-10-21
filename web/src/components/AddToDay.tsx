// «+ Добавить в этот день» in the weekly plan: a dish straight into that day — found by name, from «Избранное», or
// picked by the app — without leaving the plan and choosing the day again.
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { recipeById, searchRecipes, type Recipe } from "../engine";
import { useStore } from "../app/store";
import { RecipeImage } from "./RecipeCard";
import { Sheet } from "./ui";
import { timeShort } from "../app/recipeTime";

export function AddToDaySheet({ open, title, onAdd, onPick, onClose }: {
  open: boolean; title: string; onAdd: (r: Recipe) => void;
  /** «Подберу сам» (only for an empty day). */
  onPick?: () => void;
  onClose: () => void;
}) {
  const { s } = useStore();
  const [q, setQ] = useState("");
  const found = useMemo(() => (q.trim().length >= 2 ? searchRecipes(q.trim()).slice(0, 12) : []), [q]);
  const saved = useMemo(() => s.favorites.map((f) => recipeById(f.id)).filter((r): r is Recipe => !!r).slice(0, 12), [s.favorites]);
  const list = q.trim().length >= 2 ? found : saved;
  const close = () => { setQ(""); onClose(); };
  const Row = ({ r }: { r: Recipe }) => (
    <button className="flex min-h-[56px] w-full items-center gap-3 rounded-input p-1.5 text-left hover:bg-sunken" onClick={() => { onAdd(r); close(); }}>
      <RecipeImage recipe={r} className="h-11 w-11 shrink-0" rounded="rounded-[10px]" />
      <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-semibold">{r.title}</span><span className="block text-caption text-ink-soft">{timeShort(r)}</span></span>
    </button>
  );
  return (
    <Sheet open={open} title={title} onClose={close} tall>
      <label className="flex h-12 items-center gap-2 rounded-input border border-line bg-card px-3 focus-within:border-line-strong">
        <Search size={18} className="shrink-0 text-ink-soft" aria-hidden />
        <input className="min-w-0 flex-1 bg-transparent text-body outline-none" placeholder="Найти рецепт: плов, суп, сырники…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Найти рецепт" />
      </label>
      {onPick && !q && (
        <button className="btn-soft mt-3 h-12 w-full" onClick={() => { onPick(); close(); }}><Sparkles size={18} aria-hidden />Подберу сам</button>
      )}
      <p className="label mb-1 mt-4">{q.trim().length >= 2 ? (found.length ? "Нашлось" : "Ничего не нашлось — попробуйте по-другому") : saved.length ? "Из избранного" : "Начните вводить название"}</p>
      <div className="grid gap-0.5">{list.map((r) => <Row key={r.id} r={r} />)}</div>
    </Sheet>
  );
}
