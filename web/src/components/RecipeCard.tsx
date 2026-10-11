import { useState } from "react";
import { Clock, Flame, Heart } from "lucide-react";
import { courseOf, formatMinutes, nutritionOf, photoUrl, type Recipe } from "../engine";
import { cx } from "./ui";

const COURSE_EMOJI: Record<string, string> = {
  soup: "🍲", main: "🍛", side: "🍚", salad: "🥗", breakfast: "🍳", baking: "🥧", dessert: "🍰", snack: "🥪", sauce: "🫙", drink: "🥤",
};
const COURSE_TINT: Record<string, string> = {
  soup: "from-amber-200 to-orange-300", main: "from-orange-200 to-rose-300", salad: "from-lime-200 to-emerald-300",
  breakfast: "from-yellow-200 to-amber-300", baking: "from-amber-200 to-yellow-400", dessert: "from-pink-200 to-rose-300",
  snack: "from-orange-100 to-amber-200", side: "from-stone-200 to-amber-200", sauce: "from-red-200 to-orange-300", drink: "from-sky-200 to-teal-200",
};

/** The dish photo; without one, a warm tile with the dish's emoji. */
export function RecipeImage({ recipe, className, rounded = "rounded-xl" }: { recipe: Recipe; className?: string; rounded?: string }) {
  const src = photoUrl(recipe.id);
  const [failed, setFailed] = useState(false);
  const course = courseOf(recipe);
  if (src && !failed)
    return <img src={src} alt={recipe.title} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cx("object-cover", rounded, className)} />;
  return (
    <div aria-hidden className={cx("grid place-items-center bg-gradient-to-br text-4xl dark:opacity-80", COURSE_TINT[course] ?? COURSE_TINT.main, rounded, className)}>
      <span className="drop-shadow-sm">{COURSE_EMOJI[course] ?? "🍽️"}</span>
    </div>
  );
}

export function RecipeMeta({ recipe, compact }: { recipe: Recipe; compact?: boolean }) {
  const kcal = nutritionOf(recipe).perServing.kcal;
  return (
    <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft", compact ? "text-xs" : "text-sm")}>
      <span className="inline-flex items-center gap-1"><Clock size={compact ? 13 : 15} />{formatMinutes(recipe.totalMinutes)}</span>
      {kcal > 0 && <span className="inline-flex items-center gap-1"><Flame size={compact ? 13 : 15} />{kcal} ккал</span>}
      {recipe.difficulty !== "easy" && <span>{recipe.difficulty === "medium" ? "средне" : "сложно"}</span>}
    </div>
  );
}

/** A row card: photo left, title and facts right. */
export function RecipeRow({ recipe, note, onOpen, favorite, rating }: { recipe: Recipe; note?: string; onOpen: () => void; favorite?: boolean; rating?: { avg: number; count: number } }) {
  return (
    <button onClick={onOpen} className="card flex w-full items-stretch gap-3 p-2.5 text-left transition hover:border-line active:scale-[.99]">
      <RecipeImage recipe={recipe} className="h-20 w-20 shrink-0" />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start gap-1.5">
          <div className="line-clamp-2 font-semibold leading-snug">{recipe.title}</div>
          {favorite && <Heart size={14} className="mt-1 shrink-0 fill-brand text-brand" aria-label="В сохранённом" />}
        </div>
        <div className="mt-1"><RecipeMeta recipe={recipe} compact /></div>
        {(note || rating) && (
          <div className="mt-1 line-clamp-2 text-xs text-ink-soft">
            {rating && rating.count > 0 && <span className="mr-1.5 font-semibold text-warn">★ {rating.avg.toFixed(1).replace(".", ",")}</span>}
            {note}
          </div>
        )}
      </div>
    </button>
  );
}

/** A tall card for horizontal carousels. */
export function RecipeTile({ recipe, note, onOpen }: { recipe: Recipe; note?: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card w-44 shrink-0 overflow-hidden text-left transition active:scale-[.98]">
      <RecipeImage recipe={recipe} className="h-28 w-full" rounded="rounded-none" />
      <div className="p-2.5">
        <div className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{recipe.title}</div>
        <div className="mt-1"><RecipeMeta recipe={recipe} compact /></div>
        {note && <div className="mt-1 line-clamp-2 text-xs text-ink-soft">{note}</div>}
      </div>
    </button>
  );
}
