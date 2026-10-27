// The deck: one dish on the screen at a time, «Хочу» or «Не то» — a swipe or two big buttons (not everyone swipes).
// After 8 cards (or «выбрать из них») the liked ones come back as a short list to choose from; one liked dish opens
// at once. «Выбрать за меня» asks first how much time there is; a collection opens straight on the cards.
// Swipes teach the personal picks softly: «Не то» means «not now», not «never» (see app/personal).
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { X, Heart, List, Zap, Timer, Clock3, UtensilsCrossed, ChevronRight, Star } from "lucide-react";
import { mainIngredientOf, nutritionOf, proteinOf, type Recipe } from "../engine";
import { useActions } from "../app/actions";
import { signal } from "../app/personal";
import { useRatings, ratingLabel } from "../app/ratings";
import { RecipeImage, RecipeTile } from "./RecipeCard";
import { Layer, cx } from "./ui";
import { timeShort } from "../app/recipeTime";
import { cue } from "../app/feedback";

const ROUND = 8;
const DIFF: Record<string, string> = { easy: "просто", medium: "средне", hard: "сложно" };
const TIMES: { label: string; max: number | null; icon: typeof Zap }[] = [
  { label: "До 15 минут", max: 15, icon: Zap }, { label: "До 30 минут", max: 30, icon: Timer },
  { label: "До часа", max: 60, icon: Clock3 }, { label: "Неважно", max: null, icon: UtensilsCrossed },
];
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A light shuffle of the best-fitting dishes: the order stays roughly by fit, but no two decks are the same. */
function shuffleTop(list: Recipe[], top = 48): Recipe[] {
  return varied(list.slice(0, top).map((r, i) => ({ r, k: i + Math.random() * 16 })).sort((a, b) => a.k - b.k).map((x) => x.r));
}
/** The same main product never twice in a row nor two cards apart (a morning deck was six egg dishes out of eight):
 *  the next card is the first one in order whose main product differs from the last two shown. */
function varied(list: Recipe[]): Recipe[] {
  // What the dish is «about»: eggs (гречка с яйцом, омлет, яичница — eggs whatever the main product says), its meat or
  // fish, else its main product.
  const main = (r: Recipe) => (/яйц|яичн|омлет|фриттат|шакшук/i.test(r.title) ? "egg" : proteinOf(r) ?? mainIngredientOf(r) ?? r.ingredients[0]?.id ?? r.id);
  const rest = [...list], out: Recipe[] = [];
  while (rest.length) {
    const last = out.slice(-2).map(main);
    const k = rest.findIndex((r) => !last.includes(main(r)));
    out.push(rest.splice(k < 0 ? 0 : k, 1)[0]);
  }
  return out;
}

export function Deck({ title, pool, askTime, startList, onClose, from }: {
  title: string; pool: Recipe[];
  /** For «Откуда открывают» in the admin: «pick» (Выбрать за меня), «collections», «holiday», «season». */
  from?: string;
  /** «Выбрать за меня»: one question about time before the cards. */
  askTime?: boolean;
  /** Opened from «Все» of a shelf: the list first. */
  startList?: boolean;
  onClose: () => void;
}) {
  const { openRecipe } = useActions();
  const [max, setMax] = useState<number | null | undefined>(askTime ? undefined : null);
  const [list, setList] = useState(!!startList);
  const queue = useMemo(() => (max === undefined ? [] : shuffleTop(pool.filter((r) => max == null || r.totalMinutes <= max))), [pool, max]);
  const [i, setI] = useState(0);
  const [liked, setLiked] = useState<Recipe[]>([]);
  const [picking, setPicking] = useState(false);
  const roundStart = Math.floor(i / ROUND) * ROUND;
  const r = queue[i] ?? null;

  const open = (x: Recipe) => { onClose(); openRecipe(x); };
  const toPick = () => { if (liked.length === 1) open(liked[0]); else setPicking(true); };
  const answer = (want: boolean) => {
    if (!r) return;
    signal(r, want ? "deck_yes" : "deck_no");
    const next = want ? [...liked, r] : liked;
    if (want) setLiked(next);
    const n = i + 1;
    setI(n);
    // The end of a round (or of the dishes): what was liked, to choose from.
    if (n % ROUND === 0 || n >= queue.length) { if (next.length === 1) open(next[0]); else setPicking(true); }
  };

  const header = list
    ? <button className="chip h-10" onClick={() => setList(false)}>По одному</button>
    : max !== undefined && !picking ? <button className="chip h-10" onClick={() => setList(true)}><List size={18} aria-hidden />Списком</button> : null;

  // On the page itself, not inside the screen that opened it (its fade-in would make the deck see-through).
  return createPortal(
    <Layer title={title} onClose={onClose} closeIcon="close" label={title} actions={header} width="max-w-lg lg:max-w-4xl">
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2" data-from={from}>
        {list ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {pool.slice(0, 60).map((x) => <RecipeTile key={x.id} recipe={x} onOpen={() => openRecipe(x)} />)}
          </div>
        ) : max === undefined ? (
          <TimeQuestion onPick={setMax} />
        ) : picking ? (
          <Pick liked={liked} onOpen={open} onMore={() => setPicking(false)} more={i < queue.length} />
        ) : !queue.length ? (
          <div className="anim-rise pt-4">
            <h2 className="text-h1">Под это время блюд не нашлось</h2>
            <button className="btn-outline btn-bar mt-5 w-full" onClick={() => setMax(null)}>Показать любые</button>
          </div>
        ) : r ? (
          <>
            <div className="flex items-center gap-2" aria-label={"Блюдо " + (i - roundStart + 1) + " из " + ROUND}>
              {Array.from({ length: ROUND }, (_, k) => <span key={k} className={cx("h-1.5 flex-1 rounded-full", k <= i - roundStart ? "bg-brand-fill" : "bg-sunken")} />)}
            </div>
            <Card key={r.id} r={r} next={queue[i + 1]} onAnswer={answer} />
            {liked.length > 0 && (
              <button className="mx-auto mt-4 flex h-11 items-center gap-1 rounded-full px-3 text-body-sm font-semibold text-brand hover:bg-brand-soft" onClick={toPick}>
                {liked.length === 1 ? "Понравилось 1 — открыть" : "Понравились " + liked.length + " — выбрать из них"}<ChevronRight size={18} aria-hidden />
              </button>
            )}
          </>
        ) : (
          <Pick liked={liked} onOpen={open} onMore={() => setPicking(false)} more={false} />
        )}
      </div>
    </Layer>,
    document.body,
  );
}

function TimeQuestion({ onPick }: { onPick: (max: number | null) => void }) {
  return (
    <div className="anim-rise pt-4 lg:max-w-xl">
      <h2 className="text-h1">Сколько есть времени?</h2>
      <p className="mt-2 text-body text-ink-soft">Покажу блюда по одному. Нравится — ♥, нет — ✕.</p>
      <div className="mt-5 grid gap-2.5">
        {TIMES.map(({ label, max, icon: Icon }) => (
          <button key={label} className="flex min-h-[64px] items-center gap-4 rounded-card border border-line bg-card px-5 text-left text-h3 hover:border-line-strong active:scale-[.99]" onClick={() => onPick(max)}>
            <Icon size={22} className="shrink-0 text-brand" aria-hidden />{label}
          </button>
        ))}
      </div>
    </div>
  );
}

const FAR = 90; // px past which letting go answers
const FLICK = 0.5; // px per ms: a quick throw answers even when short

/** One card: drag it sideways (it follows the finger and tilts), or tap ✕ / ♥ under it; ← and → on a keyboard.
 * The drag moves the card directly (no React render per finger move): smooth on modest phones too. The word on
 * the side the card goes («Не то» left, «Хочу» right, as the buttons under it); a light tick when it is far enough. */
function Card({ r, next, onAnswer }: { r: Recipe; next?: Recipe; onAnswer: (want: boolean) => void }) {
  const card = useRef<HTMLDivElement>(null);
  const behind = useRef<HTMLDivElement>(null);
  const yes = useRef<HTMLSpanElement>(null);
  const no = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x0: number; dx: number; lx: number; lt: number; v: number; past: boolean; raf: number } | null>(null);
  const done = useRef(false);
  const rating = useRatings()[r.id];
  const kcal = nutritionOf(r).perServing.kcal;

  const paint = (x: number, ease = false) => {
    const c = card.current;
    if (!c) return;
    const t = ease ? "transform 220ms cubic-bezier(.2,.7,.3,1)" : "none";
    c.style.transition = t;
    c.style.transform = "translate3d(" + x + "px,0,0) rotate(" + x / 22 + "deg)";
    const k = Math.min(1, Math.abs(x) / FAR);
    if (yes.current) { yes.current.style.transition = ease ? "opacity 200ms" : "none"; yes.current.style.opacity = x > 0 ? String(k) : "0"; }
    if (no.current) { no.current.style.transition = ease ? "opacity 200ms" : "none"; no.current.style.opacity = x < 0 ? String(k) : "0"; }
    if (behind.current) { behind.current.style.transition = t; behind.current.style.transform = "translate3d(0," + 12 * (1 - k) + "px,0) scale(" + (0.95 + 0.05 * k) + ")"; }
  };
  const go = (want: boolean) => {
    if (done.current) return;
    done.current = true;
    cue(want ? "like" : "skip");
    if (reduced()) return onAnswer(want);
    paint((want ? 1 : -1) * (window.innerWidth + 160), true);
    window.setTimeout(() => onAnswer(want), 200);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(true); if (e.key === "ArrowLeft") go(false); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (done.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { x0: e.clientX, dx: 0, lx: e.clientX, lt: e.timeStamp, v: 0, past: false, raf: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g) return;
    g.dx = e.clientX - g.x0;
    const dt = e.timeStamp - g.lt;
    if (dt > 0) { g.v = 0.6 * ((e.clientX - g.lx) / dt) + 0.4 * g.v; g.lx = e.clientX; g.lt = e.timeStamp; }
    const past = Math.abs(g.dx) > FAR;
    if (past && !g.past) cue("tap");
    g.past = past;
    // One paint per frame, however often the finger reports.
    if (!g.raf) g.raf = requestAnimationFrame(() => { g.raf = 0; if (drag.current === g) paint(g.dx); });
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g) return;
    drag.current = null;
    if (g.raf) cancelAnimationFrame(g.raf);
    // A cancel is the phone taking the gesture over (a scroll): the card goes back, nothing is answered.
    const thrown = Math.abs(g.v) > FLICK && Math.abs(g.dx) > 30 && Math.sign(g.v) === Math.sign(g.dx);
    if (e.type === "pointerup" && (Math.abs(g.dx) > FAR || thrown)) go(g.dx > 0);
    else paint(0, true);
  };

  return (
    <>
      <div className="relative mt-4 aspect-[4/5] max-h-[58vh] w-full lg:aspect-[16/9] lg:max-h-[min(62vh,500px)]">
        {next && (
          <div ref={behind} className="absolute inset-0 overflow-hidden rounded-[24px] opacity-60" style={{ transform: "translate3d(0,12px,0) scale(.95)" }} aria-hidden>
            <RecipeImage recipe={next} full className="h-full w-full" rounded="rounded-[24px]" />
          </div>
        )}
        <div ref={card} className="absolute inset-0 touch-pan-y select-none overflow-hidden rounded-[24px] bg-card shadow-e2 will-change-transform lg:flex"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <RecipeImage recipe={r} full eager className="pointer-events-none h-full w-full lg:w-[56%] lg:shrink-0" rounded="rounded-[24px] lg:rounded-none" />
          {/* A computer: the dish's words beside the photo, not over it. */}
          <div className="pointer-events-none hidden min-w-0 flex-1 flex-col p-7 lg:flex">
            <h3 className="text-h1 leading-tight">{r.title}</h3>
            <p className="mt-2 text-body text-ink-soft">{timeShort(r)} · {DIFF[r.difficulty]}{kcal ? " · " + kcal + " ккал" : ""}{rating ? <> · <Star size={15} className="-mt-0.5 inline fill-current text-warn" aria-hidden /> {ratingLabel(rating)}</> : null}</p>
            {r.summary && <p className="mt-4 line-clamp-6 text-body text-ink-soft">{r.summary}</p>}
            <p className="mt-auto pt-4 text-caption text-ink-faint">Можно и клавишами: ← не то, → хочу</p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-black/0 px-5 pb-5 pt-20 text-white lg:hidden">
            <h3 className="text-h2 leading-tight">{r.title}</h3>
            <p className="mt-1.5 text-body opacity-90">{timeShort(r)} · {DIFF[r.difficulty]}{rating ? <> · <Star size={15} className="-mt-0.5 inline fill-current" aria-hidden /> {ratingLabel(rating)}</> : null}</p>
          </div>
        </div>
        {/* Above the card, so they stay in view while it moves. */}
        <span ref={no} className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-4 py-1.5 text-body font-semibold text-white opacity-0" aria-hidden><X size={18} />Не то</span>
        <span ref={yes} className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-brand-fill px-4 py-1.5 text-body font-semibold text-white opacity-0" aria-hidden><Heart size={17} className="fill-current" />Хочу</span>
      </div>
      <div className="mt-5 flex items-start justify-center gap-10">
        <button className="flex flex-col items-center gap-1.5 text-small text-ink-soft" onClick={() => go(false)}>
          <span className="grid h-[72px] w-[72px] place-items-center rounded-full border border-line bg-card shadow-e1"><X size={32} aria-hidden /></span>Не то
        </button>
        <button className="flex flex-col items-center gap-1.5 text-small text-ink-soft" onClick={() => go(true)}>
          <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-fill text-white shadow-e2"><Heart size={30} className="fill-current" aria-hidden /></span>Хочу
        </button>
      </div>
    </>
  );
}

function Pick({ liked, onOpen, onMore, more }: { liked: Recipe[]; onOpen: (r: Recipe) => void; onMore: () => void; more: boolean }) {
  return (
    <div className="anim-rise pt-2 lg:max-w-xl">
      {liked.length ? (
        <>
          <h2 className="text-h1">{liked.length === 1 ? "Вам понравилось" : "Вам понравились " + liked.length}</h2>
          <p className="mt-2 text-body text-ink-soft">Выберите одно — откроется рецепт.</p>
          <ul className="mt-4 grid gap-2.5">
            {liked.map((x) => (
              <li key={x.id}>
                <button className="flex w-full items-center gap-3 rounded-card border border-line bg-card p-2.5 pr-3 text-left hover:border-line-strong" onClick={() => onOpen(x)}>
                  <RecipeImage recipe={x} className="h-[84px] w-[84px] shrink-0" rounded="rounded-input" />
                  <span className="min-w-0 flex-1"><span className="block text-body font-semibold leading-snug">{x.title}</span><span className="mt-1 block text-small text-ink-soft">{timeShort(x)} · {DIFF[x.difficulty]}</span></span>
                  <ChevronRight size={20} className="shrink-0 text-ink-faint" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className="text-h1">Ничего не приглянулось</h2>
          <p className="mt-2 text-body text-ink-soft">Бывает. Покажу другие.</p>
        </>
      )}
      {more && <button className="btn-outline btn-bar mt-5 w-full" onClick={onMore}>{liked.length ? "Полистать ещё" : "Показать другие"}</button>}
    </div>
  );
}
