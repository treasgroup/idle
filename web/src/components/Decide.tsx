// «Выбрать за меня»: one dish at a time, big; «Другое» shows the next one. Choosing from one is easier than from twenty.
import { useMemo, useState } from "react";
import { Shuffle, ChefHat, Clock } from "lucide-react";
import { formatMinutes, freshConditions, rankRecipes, recipes, type Recipe } from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { goalConditions } from "../app/profile";
import { RecipeImage } from "./RecipeCard";
import { Sheet } from "./ui";

const DIFF: Record<string, string> = { easy: "просто", medium: "средне", hard: "сложно" };

export function DecideSheet({ open, onClose, meal }: { open: boolean; onClose: () => void; meal: "breakfast" | "lunch" | "dinner" }) {
  const { s, profile } = useStore();
  const { openRecipe } = useActions();
  const [i, setI] = useState(0);
  // A fresh shuffle every time the sheet opens, from the dishes that suit this meal and the person.
  const list = useMemo(() => {
    if (!open) return [] as Recipe[];
    const c = goalConditions(profile, { ...freshConditions({ servings: profile.eaters, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), servings: profile.eaters });
    if (profile.level === "beginner" && c.maxMinutes == null) c.maxMinutes = 45;
    const pool = rankRecipes(recipes(), c, s.preferences, 60, { meal }).map((m) => m.recipe);
    return pool.map((r) => ({ r, k: Math.random() })).sort((a, b) => a.k - b.k).map((x) => x.r).slice(0, 30);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = list.length ? list[i % list.length] : null;
  const close = () => { setI(0); onClose(); };
  return (
    <Sheet open={open} title="Выбрал для вас" onClose={close} tall
      footer={r ? (
        <div className="flex gap-2">
          <button className="btn-outline h-13 flex-1 text-body" onClick={() => setI((x) => x + 1)}><Shuffle size={20} />Другое</button>
          <button className="btn-primary h-13 flex-[1.4] text-body" onClick={() => { close(); openRecipe(r); }}><ChefHat size={20} />Готовить</button>
        </div>
      ) : undefined}>
      {r ? (
        <div key={r.id} className="anim-rise">
          <RecipeImage recipe={r} full className="aspect-[4/3] w-full" rounded="rounded-card" eager />
          <h3 className="mt-4 text-h2">{r.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-body text-ink-soft"><Clock size={18} aria-hidden />{formatMinutes(r.totalMinutes)} · {DIFF[r.difficulty]}</p>
          {r.summary && <p className="mt-3 text-body text-ink-soft">{r.summary}</p>}
        </div>
      ) : <p className="text-body text-ink-soft">Подбираю…</p>}
    </Sheet>
  );
}
