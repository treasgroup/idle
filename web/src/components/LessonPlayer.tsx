// One lesson of «Школа готовки» on the whole screen: its cards (a picture and a thought each, swiped with a finger or
// «Дальше»), then «Проверь себя» — tap an answer and see at once why, no marks — then a recipe to practise on and
// «Урок пройден». The cards scroll natively (snap): smooth on any phone.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Hand, Flame, Timer, Eye, Droplet, Sparkles, Leaf, Coffee, Utensils, Check, Grid3x3, Layers, DoorOpen, Refrigerator, CalendarDays,
  Repeat2, CookingPot, Egg, Snowflake, Clock, Carrot, Fish, RotateCcw, Moon, Salad, Blend, ChefHat, CircleCheck, type LucideIcon,
} from "lucide-react";
import { recipeById, type Recipe } from "../engine";
import { useActions } from "../app/actions";
import { cue } from "../app/feedback";
import { SchoolArt } from "./SchoolArt";
import { RecipeRow } from "./RecipeCard";
import { cx } from "./ui";
import type { Lesson } from "../screens/learn-data";

const ICONS: Record<string, LucideIcon> = {
  hand: Hand, flame: Flame, timer: Timer, eye: Eye, droplet: Droplet, drop: Droplet, sparkles: Sparkles, leaf: Leaf, cup: Coffee,
  spoon: Utensils, check: Check, grid: Grid3x3, layers: Layers, door: DoorOpen, fridge: Refrigerator, calendar: CalendarDays,
  repeat: Repeat2, pot: CookingPot, egg: Egg, snowflake: Snowflake, clock: Clock, carrot: Carrot, fish: Fish, turn: RotateCcw,
  moon: Moon, onion: Salad, tomato: Salad, blender: Blend, whisk: Blend, salt: Sparkles, pinch: Hand, board: Utensils, knife: Utensils,
};

export function LessonPlayer({ lesson, done, onFinish, onClose }: { lesson: Lesson; done: boolean; onFinish: () => void; onClose: () => void }) {
  const { openRecipe } = useActions();
  const rail = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const aim = useRef<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const pages = lesson.cards.length + lesson.quiz.length + 1;
  const recipes = lesson.recipes.map((id) => recipeById(id)).filter((r): r is Recipe => !!r);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    // While «Дальше» scrolls to a card, the number waits for it (no flicker back mid-way).
    const on = () => {
      const p = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      if (aim.current != null) { if (p !== aim.current) return; aim.current = null; }
      setAt(p);
    };
    const end = () => { aim.current = null; on(); };
    el.addEventListener("scroll", on, { passive: true });
    el.addEventListener("scrollend", end);
    return () => { el.removeEventListener("scroll", on); el.removeEventListener("scrollend", end); };
  }, []);
  // Computers: ← and → flip the cards, Esc closes.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && at < pages - 1) go(at + 1);
      if (e.key === "ArrowLeft" && at > 0) go(at - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const go = (i: number) => {
    const el = rail.current;
    if (!el) return;
    aim.current = i;
    el.scrollTo({ left: i * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setAt(i);
  };
  const last = at >= pages - 1;
  const quizAt = at - lesson.cards.length;
  const unanswered = quizAt >= 0 && quizAt < lesson.quiz.length && answers[quizAt] == null;

  return createPortal(
    <div className="anim-fade fixed inset-0 z-50 flex flex-col bg-paper" role="dialog" aria-modal="true" aria-label={"Урок: " + lesson.title}>
      <div className="pt-safe mx-auto flex w-full max-w-md items-center gap-2 px-3 pt-2">
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть урок"><X size={22} /></button>
        <span className="min-w-0 flex-1 truncate text-small text-ink-soft">{lesson.title}</span>
        <span className="shrink-0 pr-2 text-small tabular-nums text-ink-soft">{Math.min(at + 1, pages)} из {pages}</span>
      </div>

      <div ref={rail} className="mx-auto flex w-full max-w-md flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain" style={{ scrollbarWidth: "none" }}>
        {lesson.cards.map((c, i) => {
          const Icon = ICONS[c.icon ?? ""] ?? ChefHat;
          return (
            <section key={"c" + i} className="flex w-full shrink-0 snap-center flex-col overflow-y-auto px-5 pb-4 pt-3" aria-hidden={i !== at}>
              {c.art
                ? <div className="rounded-card bg-sunken/60 p-3"><SchoolArt lesson={c.art} /></div>
                : <div className="grid h-44 place-items-center rounded-card bg-herb-soft text-herb" aria-hidden><Icon size={72} strokeWidth={1.5} /></div>}
              <h1 className="mt-6 text-h1 leading-tight">{c.title}</h1>
              <p className="mt-2 text-body text-ink-soft">{c.text}</p>
            </section>
          );
        })}
        {lesson.quiz.map((q, n) => {
          const chosen = answers[n];
          const right = chosen === q.right;
          return (
            <section key={"q" + n} className="flex w-full shrink-0 snap-center flex-col overflow-y-auto px-5 pb-4 pt-3" aria-hidden={lesson.cards.length + n !== at}>
              <p className="label">Проверь себя</p>
              <h1 className="mt-2 text-h1 leading-tight">{q.q}</h1>
              <div className="mt-5 grid gap-2">
                {q.options.map((o, k) => {
                  const show = chosen != null && (k === q.right || k === chosen);
                  return (
                    <button key={k} disabled={chosen != null}
                      onClick={() => { cue("tap"); setAnswers((a) => ({ ...a, [n]: k })); }}
                      className={cx("flex min-h-[56px] items-center gap-3 rounded-input border px-4 text-left text-body transition-colors",
                        show && k === q.right ? "border-herb bg-herb-soft text-ink" : show ? "border-warn bg-warn-soft text-ink" : "border-line bg-card hover:border-line-strong")}>
                      <span className="flex-1">{o}</span>
                      {show && k === q.right && <Check size={20} className="shrink-0 text-herb" aria-label="Правильно" />}
                    </button>
                  );
                })}
              </div>
              {chosen != null && (
                <p className={cx("anim-rise mt-4 text-body", right ? "text-herb" : "text-ink")} role="status">
                  {right ? q.why : "Не совсем. Правильно — «" + q.options[q.right] + "». " + q.why.replace(/^(Да|Верно)[!:,.]?\s*/, "")}
                </p>
              )}
            </section>
          );
        })}
        <section className="flex w-full shrink-0 snap-center flex-col overflow-y-auto px-5 pb-4 pt-3" aria-hidden={!last}>
          <CircleCheck size={56} className="text-herb" aria-hidden />
          <h1 className="mt-4 text-h1 leading-tight">{done ? "Урок пройден" : "Закрепите на практике"}</h1>
          <p className="mt-2 text-body text-ink-soft">{lesson.skill}</p>
          {recipes.length > 0 && (
            <div className="mt-5 grid gap-2">
              {recipes.map((r) => <RecipeRow key={r.id} recipe={r} note="Попробуйте на практике" onOpen={() => { onClose(); openRecipe(r); }} />)}
            </div>
          )}
        </section>
      </div>

      <div className="mx-auto w-full max-w-md px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        <div className="mb-3 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: pages }, (_, i) => <span key={i} className={cx("h-1.5 rounded-full transition-all", i === at ? "w-5 bg-brand-fill" : "w-1.5 bg-line-strong/40")} />)}
        </div>
        <button className="btn-primary h-13 w-full" onClick={() => (last ? onFinish() : go(at + 1))}>
          {last ? (done ? "Готово" : <><Check size={20} aria-hidden />Урок пройден</>) : unanswered ? "Пропустить вопрос" : "Дальше"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
