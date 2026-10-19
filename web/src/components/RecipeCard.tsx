import { useState } from "react";
import { Clock, Flame, Heart, CalendarPlus, Check, Star } from "lucide-react";
import { formatMinutes, nutritionOf, photoSmallUrl, photoUrl, type Recipe } from "../engine";
import { dishEmoji, dishTint, dishVariant } from "./dishArt";
import { useStore } from "../app/store";
import { ratingLabel, useRatings } from "../app/ratings";
import { cx } from "./ui";

/** The dish photo; without one, a drawn plate with the dish's emoji over a soft colour of its kind. */
export function RecipeImage({ recipe, className, rounded = "rounded-img", eager, hero, full }: { recipe: Recipe; className?: string; rounded?: string; eager?: boolean; hero?: boolean; full?: boolean }) {
  // data-photo: the card's picture that flows into the recipe page; hero: the page's own picture (see app/transition).
  const vt = hero ? { "data-photo-hero": "1", style: { viewTransitionName: "recipe-photo" } } : { "data-photo": recipe.id };
  // Cards take the smaller copy; the recipe page and the few big pictures the full photo.
  const { catalog } = useStore();
  const src = hero || full ? photoUrl(recipe.id) : photoSmallUrl(recipe.id);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Until the server's list of photos is known (the first second or two of a first visit) the address of a photo is
  // not final: loading it now would fetch the same picture twice. A quiet placeholder for that moment.
  if (!catalog.version) return <div aria-hidden {...vt} className={cx("skeleton", rounded, className)} />;
  if (src && !failed)
    return <img {...vt} src={src} alt="" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" onError={() => setFailed(true)} onLoad={() => setLoaded(true)}
      className={cx("object-cover", loaded ? "img-in bg-sunken" : "skeleton", rounded, className)} />;
  const [a, b] = dishTint(recipe);
  const v = dishVariant(recipe);
  return (
    <div aria-hidden {...vt} className={cx("relative grid place-items-center overflow-hidden", rounded, className)} style={{ containerType: "size", ...(hero ? { viewTransitionName: "recipe-photo" } : {}) }}>
      <span className="absolute inset-0 dark:opacity-25" style={{ background: `radial-gradient(120% 120% at ${v.x}% 15%, ${a} 0%, ${b} 100%)` }} />
      <span className="absolute rounded-full bg-white/80 shadow-[0_4px_14px_rgba(60,30,10,.12)] dark:bg-white/10"
        style={{ width: "min(74cqh, 74cqw)", height: "min(74cqh, 74cqw)" }} />
      <span className="absolute rounded-full border border-black/5 dark:border-white/10" style={{ width: "min(56cqh, 56cqw)", height: "min(56cqh, 56cqw)" }} />
      <span className="relative leading-none drop-shadow-[0_3px_4px_rgba(60,30,10,.18)]" style={{ fontSize: "min(38cqh, 38cqw)", transform: `rotate(${v.tilt}deg)` }}>{dishEmoji(recipe)}</span>
    </div>
  );
}

const DIFF: Record<string, string> = { easy: "просто", medium: "средне", hard: "сложно" };

/** «★ 4,8» in a corner of a card's photo: small, but seen. Only for recipes with reviews. */
export function RatingBadge({ id, className }: { id: string; className?: string }) {
  const r = useRatings()[id];
  if (!r || !r.count) return null;
  return (
    <span className={cx("absolute inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-caption font-semibold text-ink shadow-e1", className)}
      aria-label={"Оценка " + ratingLabel(r) + " из 5"}>
      <Star size={12} className="fill-warn text-warn" aria-hidden />{ratingLabel(r)}
    </span>
  );
}

/** "25 мин · 361 ккал · просто" */
export function RecipeMeta({ recipe, size = "small", showDifficulty = true }: { recipe: Recipe; size?: "small" | "caption"; showDifficulty?: boolean }) {
  const kcal = nutritionOf(recipe).perServing.kcal;
  const icon = size === "caption" ? 14 : 16;
  return (
    <div className={cx("flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-ink-soft", size === "caption" ? "text-caption" : "text-small")}>
      <span className="inline-flex items-center gap-1"><Clock size={icon} aria-hidden />{formatMinutes(recipe.totalMinutes)}</span>
      {kcal > 0 && <span className="inline-flex items-center gap-1"><Flame size={icon} aria-hidden />{kcal} ккал</span>}
      {showDifficulty && recipe.difficulty !== "easy" && <span>{DIFF[recipe.difficulty]}</span>}
    </div>
  );
}

/** The best match in a reply: a big photo, why it fits (`note`, else the dish summary), and the main actions. */
export function RecipeFeatured({ recipe, note, onOpen, onMenu, onSave, saved }: {
  recipe: Recipe; note?: string; onOpen: () => void; onMenu?: () => void; onSave?: () => void; saved?: boolean;
}) {
  return (
    // Wider than a phone: photo on the left, so one answer does not fill the whole screen.
    <article className="card overflow-hidden sm:flex">
      <button className="relative block w-full text-left sm:w-[42%] sm:shrink-0" onClick={onOpen} aria-label={"Открыть рецепт: " + recipe.title}>
        <RecipeImage recipe={recipe} full className="aspect-video w-full sm:aspect-auto sm:h-full sm:min-h-[200px]" rounded="rounded-none" />
        <span className="absolute left-3 top-3 rounded-full bg-card/95 px-2.5 py-1 text-micro font-semibold text-ink shadow-e1">Лучше всего подходит</span>
        <RatingBadge id={recipe.id} className="right-3 top-3" />
      </button>
      <div className="p-4 sm:flex sm:flex-1 sm:flex-col sm:justify-center sm:p-5">
        <button className="block text-left" onClick={onOpen}>
          <h3 className="line-clamp-2 text-[1.125rem] font-semibold leading-snug">{recipe.title}</h3>
        </button>
        <div className="mt-1.5"><RecipeMeta recipe={recipe} /></div>
        {note
          ? <p className="mt-2 flex items-start gap-1.5 text-small text-herb"><Check size={16} className="mt-0.5 shrink-0" aria-hidden />{note}</p>
          : recipe.summary && <p className="mt-2 line-clamp-2 text-small text-ink-soft">{recipe.summary}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" onClick={onOpen}>Открыть рецепт</button>
          {onMenu && <button className="icon-btn border border-line" onClick={onMenu} aria-label="Добавить в план"><CalendarPlus size={20} /></button>}
          {onSave && <button className="icon-btn border border-line" onClick={onSave} aria-label={saved ? "Убрать из сохранённого" : "Сохранить"} aria-pressed={saved}><Heart size={20} className={cx(saved && "fill-brand text-brand")} /></button>}
        </div>
      </div>
    </article>
  );
}

/** A row: square photo left, title and facts right. */
export function RecipeRow({ recipe, note, onOpen, favorite, rating }: { recipe: Recipe; note?: string; onOpen: () => void; favorite?: boolean; rating?: { avg: number; count: number } }) {
  return (
    <button onClick={onOpen} className="card flex min-h-[88px] w-full items-center gap-3 p-2 pr-3 text-left transition-[border-color,transform] duration-150 hover:border-line-strong/60 active:scale-[.99]">
      <RecipeImage recipe={recipe} className="h-[72px] w-[72px] shrink-0" />
      <span className="min-w-0 flex-1 py-0.5">
        <span className="flex items-start gap-1.5">
          <span className="line-clamp-2 text-title leading-snug">{recipe.title}</span>
          {favorite && <Heart size={14} className="mt-1.5 shrink-0 fill-brand text-brand" aria-label="В сохранённом" />}
        </span>
        <span className="mt-0.5 block"><RecipeMeta recipe={recipe} size="caption" /></span>
        {(note || (rating && rating.count > 0)) && (
          <span className="mt-0.5 line-clamp-1 block text-caption text-ink-soft">
            {rating && rating.count > 0 && <span className="mr-1.5 font-semibold text-warn">★ {rating.avg.toFixed(1).replace(".", ",")}</span>}
            {note}
          </span>
        )}
      </span>
    </button>
  );
}

/** A tile for grids and carousels: 4:3 photo, two-line title, facts. */
export function RecipeTile({ recipe, note, onOpen, className }: { recipe: Recipe; note?: string; onOpen: () => void; className?: string }) {
  const { s } = useStore();
  const cooked = s.book.some((b) => b.recipeId === recipe.id);
  return (
    <button onClick={onOpen} className={cx("card relative flex flex-col overflow-hidden text-left transition-[border-color,transform] duration-150 hover:border-line-strong/60 active:scale-[.99]", className)}>
      <RecipeImage recipe={recipe} className="aspect-[4/3] w-full" rounded="rounded-none" />
      {cooked && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-caption text-ink shadow-e1"><Check size={12} className="text-herb" aria-hidden />Вы готовили</span>}
      <RatingBadge id={recipe.id} className="right-2 top-2" />
      <span className="flex flex-1 flex-col p-3">
        <span className="line-clamp-2 min-h-[3rem] text-title leading-snug">{recipe.title}</span>
        {/* Narrow tile: one short line, no icons (time first, calories quietly after it). */}
        <span className="mt-1 truncate text-caption text-ink-soft">{formatMinutes(recipe.totalMinutes)}{nutritionOf(recipe).perServing.kcal > 0 && " · " + nutritionOf(recipe).perServing.kcal + " ккал"}</span>
        {note && <span className="mt-1 line-clamp-2 text-caption text-ink-soft">{note}</span>}
      </span>
    </button>
  );
}

/** One line with a small photo, for side panels. */
export function RecipeMini({ recipe, note, onOpen }: { recipe: Recipe; note?: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex min-h-[56px] w-full items-center gap-3 rounded-input p-1.5 text-left hover:bg-sunken">
      <RecipeImage recipe={recipe} className="h-12 w-12 shrink-0" rounded="rounded-input" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold">{recipe.title}</span>
        <span className="block truncate text-caption text-ink-soft">{note ?? formatMinutes(recipe.totalMinutes)}</span>
      </span>
    </button>
  );
}
