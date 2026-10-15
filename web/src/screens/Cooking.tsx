// Cooking mode (#/cook): one step at a time in large type, the step's own timer, voice control, a second dish
// cooked alongside, and a finish screen. Timers are the app's kitchen timers (app/timers.ts); the shell rings them.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from "react";
import {
  Bell, BookOpenCheck, CalendarPlus, Camera, Check, ChevronLeft, ChevronRight, CircleCheck, Clock, CookingPot, Heart, ListChecks,
  MessageCircle, MessageCircleQuestion, Mic, MoreHorizontal, Pause, PenLine, Play, Plus, Refrigerator, Search, Star, Volume2, X,
} from "lucide-react";
import {
  addToFridge, answerKitchenQuestion, answerRecipeQuestion, basics, clampServings, dateKey, dayLabel, displayName, formatMinutes,
  SIDES, packageFor, plural, recipeById, recipes, scaleIngredient, searchRecipes, servingsWord, suggestSides, updateTaste, useHandsFree,
  type Recipe, type VoiceCommand,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { useReminders } from "../app/reminders";
import { replace, routeHash } from "../app/router";
import { addMinute, secondsLeft, speak, startTimer, stopTimer, timerTitle, togglePause, useTick, useTimers, type CookTimer } from "../app/timers";
import { amountText } from "../app/nowaste";
import { Chip, Layer, Sheet, Stepper, Toggle, cx, mmss } from "../components/ui";
import { RecipeMini } from "../components/RecipeCard";
import { AddToMenuSheet } from "../components/AddToMenu";
import { TimerRing, TimerStrip } from "../components/TimerStrip";
import { StepTimer } from "../components/StepTimer";
import { AskSheet } from "../components/AskSheet";
import { homeAmount, mergeSame } from "../app/amounts";
import { useHint } from "../app/hints";
import { stepTips } from "../app/stepTips";
import { ChefSecret } from "../components/ChefSecret";

type Key = "main" | "second";
/** A dish on the stove: the one from the recipe (main) or the one cooked alongside (second, kept in the profile). */
interface Dish { key: Key; recipe: Recipe; servings: number; step: number; done: boolean }

const WIDTH = "max-w-3xl lg:max-w-[1180px]";
/** Catalog recipes and the built-in sides («Картофельное пюре») the second-dish picker offers. */
const findRecipe = (id: string): Recipe | undefined => recipeById(id) ?? SIDES.find((r) => r.id === id);
const VOICE_HINT = "cook-voice-hint-v1";
const hintSeen = () => { try { return localStorage.getItem(VOICE_HINT) === "1"; } catch { return false; } };
const markHintSeen = () => { try { localStorage.setItem(VOICE_HINT, "1"); } catch { /* private mode */ } };

/** «4 минуты 30 секунд» for the voice. */
function timeWords(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return [m ? m + " " + plural(m, "минута", "минуты", "минут") : "", s ? s + " " + plural(s, "секунда", "секунды", "секунд") : ""].filter(Boolean).join(" ") || "0 секунд";
}

/** «Голубцы классические с мясом» → «голубцы», «Картофельное пюре» → «пюре». */
function shortDish(title: string): string {
  const words = title.toLowerCase().split(/\s+/);
  return words.find((w) => !/(ая|яя|ое|ее|ый|ий|ой|ые|ие)$/.test(w)) ?? words[0];
}

/** What the step's timer is for: the first product it uses, or the dish: «Шаг 3 · лук», «Шаг 2 · пюре». */
function stepLabel(r: Recipe, i: number): string {
  const id = r.steps[i]?.uses?.find((u) => u !== "water" && u !== "salt");
  const ing = id ? r.ingredients.find((x) => x.id === id) : undefined;
  return ing ? displayName(ing.id, ing.name).toLowerCase() : shortDish(r.title);
}

/** Keeps the screen on while cooking. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let lock: { release: () => Promise<void> } | null = null, gone = false;
    const take = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (wl && document.visibilityState === "visible") lock = await wl.request("screen");
        if (gone) await lock?.release();
      } catch { /* not allowed */ }
    };
    void take();
    const vis = () => { if (document.visibilityState === "visible") void take(); };
    document.addEventListener("visibilitychange", vis);
    return () => { gone = true; document.removeEventListener("visibilitychange", vis); lock?.release().catch(() => {}); };
  }, [on]);
}

export function CookingLayer({ onClose }: { onClose: () => void }) {
  const { s, update, profile, setProfile, toast } = useStore();
  const { finishCooking } = useActions();
  const timers = useTimers();
  const c = s.cooking;
  const par = profile.parallel;
  const second = par ? findRecipe(par.recipeId) ?? null : null;
  const [tab, setTab] = useState<Key>("main");
  const [sheet, setSheet] = useState<"ingredients" | "second" | "ask" | "more" | null>(null);
  const [handsFree, setHandsFree] = useState(false);
  const [hint, setHint] = useState(false);
  const [checked, setChecked] = useState<Record<string, string[]>>({});

  const dishes: Dish[] = [];
  if (c) dishes.push({ key: "main", recipe: c.recipe, servings: c.servings, step: c.step, done: c.done });
  if (par && second) dishes.push({ key: "second", recipe: second, servings: par.servings, step: par.step, done: false });
  const live = dishes.filter((d) => !d.done);
  // When the first dish is finished, the second one stays on screen until it is done too.
  const dish = live.find((d) => d.key === tab) ?? live[0] ?? null;
  const cookingNow = (!!c && !c.done) || !!second;
  useWakeLock(cookingNow);

  const setStep = useCallback((key: Key, n: number) => {
    if (key === "second") setProfile((p) => {
      const len = p.parallel ? findRecipe(p.parallel.recipeId)?.steps.length ?? 1 : 1;
      return p.parallel ? { ...p, parallel: { ...p.parallel, step: Math.max(0, Math.min(len - 1, n)) } } : p;
    });
    else update((st) => (st.cooking ? { ...st, cooking: { ...st.cooking, step: Math.max(0, Math.min(st.cooking.recipe.steps.length - 1, n)) } } : st));
  }, [setProfile, update]);

  /** «Показать рецепт на 6 порций» from a question about the dish. */
  const setServings = (key: Key, n: number) => {
    if (key === "second") setProfile((p) => (p.parallel ? { ...p, parallel: { ...p.parallel, servings: n } } : p));
    else update((st) => (st.cooking ? { ...st, cooking: { ...st.cooking, servings: n } } : st));
  };

  const startFor = useCallback((d: Dish, seconds: number) => {
    startTimer({ dish: d.recipe.title, recipeId: d.recipe.id, step: d.step, label: stepLabel(d.recipe, d.step), seconds });
  }, []);

  /** A timer in the strip: show its dish and step. */
  const jump = useCallback((t: CookTimer) => {
    const d = live.find((x) => x.recipe.id === t.recipeId);
    if (!d) return;
    setTab(d.key);
    if (t.step != null) setStep(d.key, t.step);
  }, [live, setStep]);

  const finish = (d: Dish) => {
    if (d.key === "second") {
      finishCooking(d.recipe, false, false);
      setProfile((p) => ({ ...p, parallel: null }));
      setTab("main");
      // When the first dish is done too, the finish screen follows anyway.
      if (c && !c.done) toast("«" + d.recipe.title + "» готово");
    } else {
      finishCooking(d.recipe);
      if (second) setTab("second");
    }
  };

  // Hands-free voice commands.
  const onCommand = useCallback((cmd: VoiceCommand) => {
    if (!dish) return;
    const r = dish.recipe, i = dish.step;
    const mine = timers.filter((t) => t.recipeId === r.id && !t.rang);
    switch (cmd.type) {
      case "next": if (i < r.steps.length - 1) { setStep(dish.key, i + 1); speak(r.steps[i + 1].text); } else speak("Это последний шаг."); break;
      case "back": if (i > 0) { setStep(dish.key, i - 1); speak(r.steps[i - 1].text); } break;
      case "repeat": speak(r.steps[i].text); break;
      case "timer": {
        const sec = cmd.seconds ?? r.steps[i].timerSeconds;
        if (sec) { startFor(dish, sec); speak("Таймер на " + timeWords(sec) + "."); } else speak("На сколько минут поставить таймер?");
        break;
      }
      case "timerStop": {
        const t = mine.find((x) => x.step === i) ?? mine[0];
        if (t) { stopTimer(t.id); speak("Таймер выключен."); } else speak("Таймер не запущен.");
        break;
      }
      case "timeLeft": {
        const t = mine[0] ?? timers.find((x) => !x.rang);
        speak(t ? "Осталось " + timeWords(secondsLeft(t)) + "." : "Таймер не запущен.");
        break;
      }
      case "ingredients": speak(r.ingredients.map((x) => { const y = scaleIngredient(x, r, dish.servings); return displayName(y.id, y.name) + " " + homeAmount(y); }).join(", ") + "."); break;
      case "close": onClose(); break;
      case "stopListening": setHandsFree(false); speak("Голосовое управление выключено."); break;
      case "help": speak("Говорите: дальше, назад, повтори, таймер на пять минут, сколько осталось, какие продукты. Можно спросить: сколько муки, чем заменить сметану."); break;
      case "ask": {
        const a = answerRecipeQuestion(cmd.text, [r], dish.servings)?.text ?? answerKitchenQuestion(cmd.text, true)?.text;
        speak(a ? a.replace(/\n/g, ". ") : "Не знаю ответа. Скажите «дальше», «повтори» или «какие продукты».");
        break;
      }
    }
  }, [dish, timers, setStep, startFor, onClose]);
  const hf = useHandsFree(handsFree && cookingNow, onCommand, toast);

  // Read the step aloud when it changes.
  useEffect(() => { if (s.readAloud && cookingNow && dish) speak(dish.recipe.steps[dish.step]?.text ?? ""); }, [dish?.key, dish?.step, s.readAloud]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }, []);

  // A new step starts at the top of the screen.
  const pane = useRef<HTMLDivElement>(null);
  useEffect(() => { pane.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0 }); }, [dish?.key, dish?.step]);

  const total = dish?.recipe.steps.length ?? 0;
  const go = useCallback((delta: number) => { if (dish) setStep(dish.key, dish.step + delta); }, [dish, setStep]);

  // ←/→ on a keyboard (not while typing or with a sheet open).
  useEffect(() => {
    if (!dish) return;
    const on = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable], [role=radiogroup], [role=tablist], .scroller")) return;
      if (document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1) return;
      if (e.key === "ArrowRight" && dish.step < total - 1) { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" && dish.step > 0) { e.preventDefault(); go(-1); }
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [dish, total, go]);

  const [tapHint, tapSeen] = useHint("cook-tap");
  // A horizontal swipe over the step changes it.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => { const p = e.touches[0]; touch.current = { x: p.clientX, y: p.clientY, t: Date.now() }; };
  const onTouchEnd = (e: TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    if (!from || !dish || (e.target as HTMLElement).closest(".scroller, button, input")) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - from.x, dy = p.clientY - from.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - from.t > 800) return;
    if (dx < 0 && dish.step < total - 1) go(1);
    if (dx > 0 && dish.step > 0) go(-1);
  };

  const tapStep = (e: MouseEvent<HTMLElement>) => {
    if (!dish || window.getSelection()?.toString()) return;
    tapSeen();
    const box = e.currentTarget.getBoundingClientRect();
    if (e.clientX - box.left < box.width * 0.3) { if (dish.step > 0) go(-1); }
    else if (dish.step < total - 1) go(1);
  };
  const toggleVoice = () => {
    const on = !handsFree;
    setHandsFree(on);
    if (on) { speak("Слушаю. Говорите: дальше, назад, повтори, таймер."); if (!hintSeen()) setHint(true); }
  };
  const toggleRead = () => {
    const on = !s.readAloud;
    update((st) => ({ ...st, readAloud: on }));
    if (on && dish) speak(dish.recipe.steps[dish.step]?.text ?? "");
    else { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }
  };
  const toggleChecked = (recipeId: string, key: string) =>
    setChecked((m) => ({ ...m, [recipeId]: (m[recipeId] ?? []).includes(key) ? m[recipeId].filter((k) => k !== key) : [...(m[recipeId] ?? []), key] }));
  const removeSecond = () => { if (second) setProfile((p) => ({ ...p, parallel: null })); setTab("main"); };

  if (!dish) {
    if (c?.done) return <Done onClose={onClose} />;
    return <NothingCooking onClose={onClose} />;
  }

  const r = dish.recipe;
  const cur = r.steps[dish.step] ?? r.steps[0];
  const tip = stepTips(r)[dish.step] ?? null;
  const last = dish.step >= total - 1;
  const uses = (cur.uses || []).map((id) => r.ingredients.find((i) => i.id === id)).filter((i): i is NonNullable<typeof i> => !!i).map((i) => scaleIngredient(i, r, dish.servings));
  const running = timers.find((t) => t.recipeId === r.id && t.step === dish.step);
  const seconds = cur.timerSeconds ?? running?.total ?? 0;
  const next = r.steps[dish.step + 1];
  const both = live.length === 2 && !!c && !!second;
  const offset = both ? c.recipe.totalMinutes - second.totalMinutes : 0;

  const voice = (
    <VoiceToggles supported={hf.supported} handsFree={handsFree} readAloud={s.readAloud} onVoice={toggleVoice} onRead={toggleRead} />
  );

  return (
    <Layer onClose={onClose} closeIcon="close" width={WIDTH} label={"Готовка: " + r.title}
      title={
        <span className="block min-w-0">
          <span className="block truncate leading-tight">{r.title}</span>
          <span className="mt-0.5 block font-sans text-caption font-normal text-ink-soft">Шаг {dish.step + 1} из {total}</span>
        </span>
      }
      actions={
        <button className="btn-ghost -mr-1 h-11 px-3 lg:hidden" onClick={() => setSheet("ingredients")} aria-label="Продукты">
          <ListChecks size={20} aria-hidden /><span className="hidden sm:inline">Продукты</span>
        </button>
      }>
      <div className="px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:px-8" style={{ paddingBottom: "calc(var(--dock) + 2rem)" }}>
        <div ref={pane} className="min-w-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="sticky top-0 z-10 -mx-4 bg-paper px-4 pb-3 pt-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:pt-6">
            <Progress step={dish.step} total={total} />
            <TimerStrip onJump={jump} className="mt-3 lg:hidden" />
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-4 bg-gradient-to-b from-paper to-transparent" />
          </div>

          {dishes.length > 1 && <DishTabs dishes={dishes} active={dish.key} onPick={setTab} timers={timers} />}
          {both && dish.step === 0 && Math.abs(offset) >= 5 && (
            <p className="mt-3 flex gap-2.5 rounded-input bg-herb-soft px-3.5 py-3 text-body-sm text-ink">
              <Clock size={18} className="mt-0.5 shrink-0 text-herb" aria-hidden />
              <span>{offset > 0
                ? <>Начните «{second.title}» примерно через {formatMinutes(offset)} после «{c.recipe.title}» — тогда всё будет готово одновременно.</>
                : <>Сначала начните «{second.title}»: это блюдо готовится на {formatMinutes(-offset)} дольше. «{c.recipe.title}» — следом.</>}</span>
            </p>
          )}

          <h1 className="sr-only">{r.title}</h1>
          <p className="sr-only" aria-live="polite">Шаг {dish.step + 1} из {total}. {cur.text}</p>
          <div key={dish.key + dish.step} className="anim-rise">
            {/* Like stories: a tap on the right of the text — next step, on the left — back. */}
            <p className="mt-5 cursor-pointer select-none text-step md:text-step-lg lg:mt-8" onClick={tapStep}>{cur.text}</p>
            {tapHint && total > 1 && <p className="mt-2 text-caption text-ink-faint">Коснитесь текста справа — следующий шаг, слева — назад</p>}
            {uses.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Продукты для шага">
                {uses.map((i) => (
                  <li key={i.id + i.unit} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-sunken px-3 text-body-sm">
                    {displayName(i.id, i.name)}<b className="whitespace-nowrap font-semibold">{homeAmount(i)}</b>
                  </li>
                ))}
              </ul>
            )}
            {tip && <ChefSecret text={tip} className="mt-5" large />}
            {seconds > 0 && (
              <StepTimer key={r.id + dish.step} className="mt-6" dish={r.title} recipeId={r.id} step={dish.step} seconds={seconds} label={stepLabel(r, dish.step)} />
            )}
          </div>

          {/* Phones: the voice button and «Ещё»; reading aloud and a second dish live inside. */}
          <div className="mt-6 flex flex-wrap gap-2 lg:hidden">
            {hf.supported && (
              <button type="button" aria-pressed={handsFree} onClick={toggleVoice}
                className={cx("chip", handsFree && "border-brand-fill bg-brand-fill text-white hover:border-brand-fill")}>
                <Mic size={18} aria-hidden />Голосом
              </button>
            )}
            <Chip onClick={() => setSheet("more")}><MoreHorizontal size={18} aria-hidden />Ещё</Chip>
          </div>
          {hint && <VoiceHint onClose={() => { setHint(false); markHintSeen(); }} />}

          {next && (
            <button onClick={() => go(1)} className="mt-8 block w-full border-t border-line pt-4 text-left">
              <span className="label">Следующий шаг</span>
              <span className="mt-1 line-clamp-2 block text-body-sm text-ink-soft">{next.text}</span>
            </button>
          )}
        </div>

        <aside className="hidden lg:block" aria-label="Продукты, таймеры и второе блюдо">
          <div className="sticky top-0 max-h-[calc(100vh-3.5rem-var(--dock))] space-y-4 overflow-y-auto pb-6 pt-6">
            <TimerPanel onJump={jump} />
            <section className="card p-4">
              <h2 className="flex items-baseline justify-between gap-2 font-sans text-title">
                Продукты <span className="text-caption font-normal text-ink-soft">на {dish.servings} {servingsWord(dish.servings, true)}</span>
              </h2>
              <div className="mt-1"><Ingredients compact dish={dish} checked={checked[r.id] ?? []} onToggle={(k) => toggleChecked(r.id, k)} /></div>
            </section>
            <section className="card p-4">
              <h2 className="font-sans text-title">Второе блюдо</h2>
              {second ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1"><RecipeMini recipe={second} note={"Шаг " + (par!.step + 1) + " из " + second.steps.length} onOpen={() => setTab("second")} /></div>
                  <button className="icon-btn" onClick={removeSecond} aria-label="Убрать второе блюдо"><X size={20} /></button>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-body-sm text-ink-soft">Гарнир или салат параллельно — у каждого блюда свой шаг и таймер.</p>
                  <button className="btn-outline mt-3 w-full" onClick={() => setSheet("second")}><Plus size={18} aria-hidden />Добавить блюдо</button>
                </>
              )}
            </section>
            <section className="card p-4">
              <h2 className="font-sans text-title">Голос</h2>
              <div className="mt-3 flex flex-wrap gap-2">{voice}</div>
            </section>
          </div>
        </aside>
      </div>

      <BottomBar listening={handsFree ? { on: hf.listening, heard: hf.heard, off: () => setHandsFree(false) } : null}>
        <button className="btn-outline h-13 px-4 text-body" onClick={() => setSheet("ask")} aria-label="Спросить Шефа">
          <MessageCircleQuestion size={20} aria-hidden /><span className="max-[359px]:hidden">Спросить</span>
        </button>
        <button className="btn-outline h-13 w-13 px-0 text-body sm:w-auto sm:px-5" disabled={dish.step === 0} onClick={() => go(-1)} aria-label="Назад">
          <ChevronLeft size={22} aria-hidden /><span className="hidden sm:inline">Назад</span>
        </button>
        {last
          ? <button className="btn-primary h-13 flex-1 text-body" onClick={() => finish(dish)}><Check size={20} aria-hidden />Готово</button>
          : <button className="btn-primary h-13 flex-1 text-body" onClick={() => go(1)}>Дальше<ChevronRight size={20} aria-hidden /></button>}
      </BottomBar>

      <Sheet open={sheet === "ingredients"} title={"Продукты на " + dish.servings + " " + servingsWord(dish.servings, true)} onClose={() => setSheet(null)}>
        <Ingredients dish={dish} checked={checked[r.id] ?? []} onToggle={(k) => toggleChecked(r.id, k)} />
      </Sheet>
      <Sheet open={sheet === "more"} title="Ещё" onClose={() => setSheet(null)}>
        <div className="divide-y divide-line">
          <Toggle on={s.readAloud} onChange={() => toggleRead()} label="Читать шаги вслух" hint="Телефон прочитает каждый шаг" />
          <button className="flex min-h-[64px] w-full items-center gap-3 py-2 text-left" onClick={() => { if (second) { removeSecond(); setSheet(null); } else setSheet("second"); }}>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-medium">{second ? "Убрать второе блюдо" : "Готовить второе блюдо"}</span>
              <span className="block text-caption text-ink-soft">{second ? "«" + second.title + "»" : "Например, гарнир — подскажу, когда что начинать"}</span>
            </span>
            {second ? <X size={20} className="shrink-0 text-ink-soft" aria-hidden /> : <Plus size={20} className="shrink-0 text-ink-soft" aria-hidden />}
          </button>
        </div>
      </Sheet>
      {sheet === "second" && (
        <PickSecond main={c?.recipe ?? r} onClose={() => setSheet(null)}
          onPick={(x, n) => { setProfile((p) => ({ ...p, parallel: { recipeId: x.id, servings: n, step: 0, timerEnd: null } })); setSheet(null); }} />
      )}
      <AskSheet key={r.id} open={sheet === "ask"} onClose={() => setSheet(null)} recipe={r} servings={dish.servings} prefs={s.preferences}
        onServings={(n) => setServings(dish.key, n)} />
    </Layer>
  );
}

/** One segment per step. */
function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1" role="progressbar" aria-label="Шаги рецепта" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-valuetext={"Шаг " + (step + 1) + " из " + total}>
      {total > 24
        ? <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: ((step + 1) / total) * 100 + "%" }} /></span>
        : Array.from({ length: total }, (_, i) => <span key={i} className={cx("h-1.5 flex-1 rounded-full transition-colors duration-150", i <= step ? "bg-brand" : "bg-line")} />)}
    </div>
  );
}

/** The fixed bar at the bottom (52px buttons) and, while hands-free is on, what the microphone hears. */
function BottomBar({ children, listening }: { children: ReactNode; listening: { on: boolean; heard: string; off: () => void } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  // --dock: toasts float above the bar.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement.style;
    const set = () => root.setProperty("--dock", el.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); root.setProperty("--dock", "0px"); };
  }, []);
  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper lg:left-64">
      {listening && (
        <div className="bg-brand-fill text-white" role="status">
          <div className={cx("mx-auto flex min-h-[44px] items-center gap-2.5 px-4 sm:px-6 lg:px-8", WIDTH)}>
            <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20", listening.on && "animate-pulse")}><Mic size={16} aria-hidden /></span>
            <span className="min-w-0 flex-1 py-1.5 text-small">
              {listening.on ? <><b className="font-semibold">Слушаю:</b> дальше, назад, повтори, таймер</> : "Микрофон на паузе"}
              {listening.heard && <span className="opacity-80"> · «{listening.heard}»</span>}
            </span>
            <button className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/15" onClick={listening.off} aria-label="Выключить голосовое управление"><X size={20} /></button>
          </div>
        </div>
      )}
      <div className={cx("mx-auto px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:px-8", WIDTH)}>
        <div className="flex gap-2">{children}</div>
        <p className="hidden items-center gap-2 text-caption text-ink-faint lg:flex">
          <kbd className="rounded-md border border-line bg-card px-1.5 font-sans">←</kbd><kbd className="rounded-md border border-line bg-card px-1.5 font-sans">→</kbd>листают шаги
        </p>
      </div>
    </div>
  );
}

/** «Голосом» (hands-free) and «Читать вслух»: labelled toggles. */
function VoiceToggles({ supported, handsFree, readAloud, onVoice, onRead }: { supported: boolean; handsFree: boolean; readAloud: boolean; onVoice: () => void; onRead: () => void }) {
  return (
    <>
      {supported && (
        <button type="button" aria-pressed={handsFree} onClick={onVoice}
          className={cx("chip", handsFree && "border-brand-fill bg-brand-fill text-white hover:border-brand-fill")}>
          <Mic size={18} aria-hidden />Голосом
        </button>
      )}
      <Chip on={readAloud} onClick={onRead}><Volume2 size={18} aria-hidden />Читать вслух</Chip>
    </>
  );
}

/** Shown once, the first time hands-free is turned on. */
function VoiceHint({ onClose }: { onClose: () => void }) {
  const say = ["дальше", "назад", "повтори", "таймер на 5 минут", "сколько осталось", "стоп таймер", "какие продукты", "сколько соли?", "хватит слушать"];
  return (
    <div className="anim-rise mt-4 rounded-card bg-brand-soft p-4 text-brand-ink">
      <div className="flex items-start gap-3">
        <Mic size={20} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold">Руки заняты — говорите</p>
          <p className="mt-1 text-body-sm">{say.map((w, i) => <span key={w}>«{w}»{i < say.length - 1 ? ", " : ""}</span>)}</p>
        </div>
      </div>
      <button className="btn-soft mt-3 h-10 bg-card px-4 text-ink" onClick={onClose}>Понятно</button>
    </div>
  );
}

/** Two dishes: a tab each, two lines tall, with the dish's timer as a badge. */
function DishTabs({ dishes, active, onPick, timers }: { dishes: Dish[]; active: Key; onPick: (k: Key) => void; timers: CookTimer[] }) {
  const now = useTick(timers.some((t) => t.end && !t.rang));
  return (
    <div role="tablist" aria-label="Блюда" className="mt-2 grid grid-cols-2 gap-1 rounded-[18px] bg-sunken p-1">
      {dishes.map((d) => {
        const on = d.key === active && !d.done;
        const t = timers.find((x) => x.recipeId === d.recipe.id && x.rang) ?? timers.find((x) => x.recipeId === d.recipe.id);
        return (
          <button key={d.key} role="tab" aria-selected={on} disabled={d.done} onClick={() => onPick(d.key)}
            className={cx("min-h-[60px] min-w-0 rounded-[14px] px-3 py-2 text-left transition-colors duration-150", on ? "bg-card shadow-e1" : "hover:bg-card/60 disabled:hover:bg-transparent")}>
            <span className={cx("block truncate text-small font-semibold", !on && "text-ink-soft")}>{d.recipe.title}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-caption text-ink-soft">
              {d.done ? <><Check size={14} className="text-herb" aria-hidden /><span className="text-herb">Готово</span></> : <span className="truncate"><span className="max-[359px]:hidden">Шаг </span>{d.step + 1} из {d.recipe.steps.length}</span>}
              {t && !d.done && (
                <span className={cx("ml-auto shrink-0 rounded-full px-1.5 text-micro font-semibold tabular-nums leading-5", t.rang ? "bg-brand-fill text-white" : "bg-brand-soft text-brand-ink")}>
                  {t.rang ? "время" : mmss(secondsLeft(t, now))}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** «Голубцы · Шаг 2 · рис» */
function timerCaption(t: CookTimer): string {
  const dish = t.dish && t.dish !== "Таймер" ? shortDish(t.dish) : "";
  const title = timerTitle(t);
  if (!dish || title.toLowerCase().includes(dish)) return title;
  return dish[0].toUpperCase() + dish.slice(1) + " · " + title;
}

/** Desktop panel: every running timer with its controls. */
function TimerPanel({ onJump }: { onJump: (t: CookTimer) => void }) {
  const list = useTimers();
  const now = useTick(list.some((t) => t.end && !t.rang));
  if (!list.length) return null;
  return (
    <section className="card p-4">
      <h2 className="font-sans text-title">Таймеры</h2>
      <ul className="mt-2 divide-y divide-line">
        {list.map((t) => {
          const paused = t.pausedLeft != null;
          return (
            <li key={t.id} className="py-2">
              <p className="truncate text-caption text-ink-soft">{timerCaption(t)}</p>
              <div className="flex items-center gap-1">
                <button className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onJump(t)} aria-label={timerCaption(t) + ": показать шаг"}>
                  {t.rang ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-fill text-white"><Bell size={16} aria-hidden /></span> : <TimerRing t={t} size={36} now={now} />}
                  <span className={cx("text-h2 font-sans font-semibold tabular-nums", paused && "text-ink-soft", t.rang && "text-brand")}>{t.rang ? "Время вышло" : mmss(secondsLeft(t, now))}</span>
                </button>
                {!t.rang && <button className="icon-btn" onClick={() => togglePause(t.id)} aria-label={paused ? "Продолжить" : "Пауза"}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
                <button className="icon-btn" onClick={() => addMinute(t.id)} aria-label="Добавить минуту"><Plus size={18} /></button>
                <button className="icon-btn" onClick={() => stopTimer(t.id)} aria-label="Остановить таймер"><X size={18} /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The dish's products with check-off; the ones this step needs are marked. */
function Ingredients({ dish, checked, onToggle, compact }: { dish: Dish; checked: string[]; onToggle: (key: string) => void; compact?: boolean }) {
  const r = dish.recipe;
  const now = new Set(r.steps[dish.step]?.uses ?? []);
  return (
    <ul className="divide-y divide-line">
      {mergeSame(r.ingredients.map((i) => scaleIngredient(i, r, dish.servings))).map((i) => {
        const key = i.id + "|" + i.unit;
        const on = checked.includes(key);
        return (
          <li key={key}>
            <button className={cx("flex w-full items-center gap-3 text-left", compact ? "min-h-[44px] py-1.5" : "min-h-[52px] py-2")} aria-pressed={on} onClick={() => onToggle(key)}>
              <span aria-hidden className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150", on ? "border-herb bg-herb text-paper" : "border-line-strong")}>
                {on && <Check size={14} strokeWidth={3} />}
              </span>
              <span className={cx("min-w-0 flex-1 text-body-sm", on && "text-ink-faint line-through")}>
                {displayName(i.id, i.name)}
                {now.has(i.id) && !on && <span className="ml-2 inline-block rounded-full bg-brand-soft px-2 align-[1px] text-micro font-semibold text-brand-ink">сейчас</span>}
                {i.optional && <span className="block text-caption text-ink-faint">по желанию</span>}
              </span>
              <span className={cx("shrink-0 whitespace-nowrap text-body-sm font-semibold", on ? "text-ink-faint" : "text-ink")}>{homeAmount(i)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Picking the second dish: a side for this one, something from the menu, or a saved recipe. */
function PickSecond({ main, onClose, onPick }: { main: Recipe; onClose: () => void; onPick: (r: Recipe, servings: number) => void }) {
  const { s } = useStore();
  const [q, setQ] = useState("");
  const [servings, setServings] = useState(s.cooking?.servings ?? 2);
  const groups = useMemo(() => {
    const seen = new Set([main.id]);
    const take = (list: (Recipe | undefined)[], n: number) => {
      const out: Recipe[] = [];
      for (const r of list) if (r && !seen.has(r.id) && out.length < n) { seen.add(r.id); out.push(r); }
      return out;
    };
    if (q.trim()) return [{ title: "Найдено", list: take(searchRecipes(q), 12), note: undefined as Map<string, string> | undefined }];
    const today = dateKey(new Date()), tomorrow = dateKey(new Date(Date.now() + 864e5));
    const when = new Map<string, string>();
    const menu = s.menu.filter((d) => d.date === today || d.date === tomorrow).flatMap((d) => d.items.filter((i) => !i.leftover).map((i) => {
      if (!when.has(i.recipeId)) when.set(i.recipeId, dayLabel(d.date));
      return recipeById(i.recipeId);
    }));
    const out = [
      { title: "Гарнир к этому блюду", list: take(suggestSides(main), 4), note: undefined },
      { title: "Из плана", list: take(menu, 4), note: when },
      { title: "Сохранённое", list: take(s.favorites.map((f) => recipeById(f.id) ?? f), 6), note: undefined },
    ];
    if (!out.some((g) => g.list.length)) out.push({ title: "Гарниры и салаты", list: take(recipes().filter((r) => r.course === "side" || r.course === "salad"), 8), note: undefined });
    return out.filter((g) => g.list.length);
  }, [q, main, s.menu, s.favorites]);

  return (
    <Sheet open title="Второе блюдо" onClose={onClose} tall>
      <p className="text-body-sm text-ink-soft">У каждого блюда свой шаг и таймер — переключайтесь вкладками вверху.</p>
      <label className="relative mt-4 block">
        <span className="sr-only">Найти рецепт</span>
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input className="input bg-sunken pl-10" type="search" placeholder="Найти рецепт" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="mt-3 flex min-h-[44px] items-center justify-between gap-3">
        <span className="text-body-sm">Порций</span>
        <Stepper value={servings} min={1} max={12} onChange={setServings} label="Порции второго блюда" />
      </div>
      {groups.map((g) => (
        <section key={g.title} className="mt-5" aria-label={g.title}>
          <h3 className="label px-1.5">{g.title}</h3>
          <div className="mt-1.5 grid gap-0.5">
            {g.list.map((r) => <RecipeMini key={r.id} recipe={r} note={(g.note?.get(r.id) ? g.note.get(r.id) + " · " : "") + formatMinutes(r.totalMinutes)} onOpen={() => onPick(r, clampServings(r, servings))} />)}
          </div>
        </section>
      ))}
      {!groups.length && <p className="mt-6 text-center text-body-sm text-ink-soft">Ничего не нашлось. Попробуйте другое слово.</p>}
    </Sheet>
  );
}

function NothingCooking({ onClose }: { onClose: () => void }) {
  return (
    <Layer title="Готовка" onClose={onClose} closeIcon="close">
      <div className="mx-auto max-w-md px-4 pb-16 pt-12 text-center sm:pt-20">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sunken text-ink-soft"><CookingPot size={30} aria-hidden /></span>
        <h1 className="mt-5 text-h1">Сейчас ничего не готовится</h1>
        <p className="mt-2 text-body text-ink-soft">Откройте рецепт и нажмите «Начать готовить» — здесь будут шаги крупным шрифтом, таймеры и подсказки.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={() => replace(routeHash({ tab: "recipes" }))}>Выбрать рецепт</button>
          <button className="btn-outline" onClick={() => goChat(true)}><MessageCircle size={18} aria-hidden />Спросить Шефа</button>
        </div>
      </div>
    </Layer>
  );
}

/** Scrolls the recipe page to its reviews once it has rendered. */
function scrollToReviews() {
  let tries = 0;
  const find = () => document.getElementById("reviews")
    ?? [...document.querySelectorAll("h2")].find((h) => /^Отзывы/.test(h.textContent ?? ""))?.closest("section") ?? null;
  const tick = () => {
    const el = find();
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (++tries < 30) setTimeout(tick, 100);
  };
  setTimeout(tick, 200);
}

const RATED: Record<number, string> = {
  1: "Понял — в следующий раз предложу что-нибудь другое.",
  2: "Понял — в следующий раз предложу что-нибудь другое.",
  3: "Спасибо, учту.",
  4: "Отлично! Буду чаще предлагать похожее.",
  5: "Отлично! Буду чаще предлагать похожее.",
};

/** After the last step: a rating, what to do next, and (once) the evening reminder. */
function Done({ onClose }: { onClose: () => void }) {
  const { s, update, profile, setProfile, toast } = useStore();
  const { isFavorite, toggleFavorite } = useActions();
  const a = useAssistant();
  const reminders = useReminders();
  const c = s.cooking!;
  const r = c.recipe;
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [sheet, setSheet] = useState<"menu" | "left" | "note" | null>(null);
  const askRemind = !profile.remindAsked && !s.reminders.daily && reminders.supported;
  const fav = isFavorite(r.id);

  // The finished dish leaves the state once this screen is gone (clearing it first would flash «ничего не готовится»).
  const ending = useRef(false);
  useEffect(() => () => { if (ending.current) update((st) => (st.cooking?.done ? { ...st, cooking: null } : st)); }, [update]);
  const end = () => { ending.current = true; };
  const close = () => { end(); onClose(); };
  const rate = (n: number) => {
    setStars(n);
    update((st) => ({ ...st, taste: updateTaste(st.taste, r.id, n >= 4 ? "liked" : n === 3 ? "cooked" : "too_hard") }));
  };
  const reviews = () => { end(); replace(routeHash({ tab: "home", recipe: r.id })); scrollToReviews(); };
  const book = () => {
    end();
    try { sessionStorage.setItem("cook-recipes-view", "book"); } catch { /* ignore */ }
    replace(routeHash({ tab: "favorites" }));
  };
  const tomorrow = () => { void a.ask("что приготовить завтра", { fresh: true }); goChat(); };

  return (
    <Layer title={r.title} onClose={close} closeIcon="close" label="Блюдо готово">
      <div className="mx-auto max-w-md px-4 pb-16 pt-6 sm:pt-12">
        <div className="text-center">
          <span className="anim-rise mx-auto grid h-20 w-20 place-items-center rounded-full bg-herb-soft text-herb"><CircleCheck size={44} strokeWidth={1.75} aria-hidden /></span>
          <h1 className="mt-5 text-display">Готово!</h1>
          <p className="mt-1 text-body text-ink-soft">Приятного аппетита. Как получилось?</p>
        </div>

        <section className="mt-6 text-center" aria-label="Оценка">
          <div role="radiogroup" aria-label="Оценка блюда" className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={stars === n} aria-label={n + " из 5"} onClick={() => rate(n)} onMouseEnter={() => setHover(n)}
                className="grid h-12 w-12 place-items-center rounded-full transition-transform duration-150 active:scale-90">
                <Star size={36} strokeWidth={1.5} className={cx("transition-colors duration-150", (hover || stars) >= n ? "fill-warn text-warn" : "text-line-strong")} aria-hidden />
              </button>
            ))}
          </div>
          {stars > 0 && (
            <div className="anim-rise mt-3">
              <p className="text-body-sm text-ink-soft" role="status">{RATED[stars]}</p>
              <button className="btn-soft mt-3" onClick={reviews}><Camera size={18} aria-hidden />Фото или отзыв</button>
            </div>
          )}
        </section>

        {/* Three things worth doing now; the rest is one quiet line. */}
        <ul className="card mt-8 divide-y divide-line overflow-hidden">
          <li><DoneRow icon={<Refrigerator size={20} />} title="Что-то осталось?" hint="Запишу в «Мои продукты»" onClick={() => setSheet("left")} chevron /></li>
          <li><DoneRow icon={<PenLine size={20} />} title={s.notes[r.id] ? "Ваша заметка" : "Заметка на следующий раз"} hint={s.notes[r.id] || "Например: соли меньше"} onClick={() => setSheet("note")} chevron /></li>
          <li><DoneRow icon={<MessageCircle size={20} />} title="Что приготовить завтра?" hint="Спросить Шефа" onClick={tomorrow} chevron /></li>
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1 text-small text-ink-soft">
          <button className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 hover:bg-sunken" onClick={book}><BookOpenCheck size={16} aria-hidden />В «Я готовил(а)»</button>
          <button className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 hover:bg-sunken" onClick={() => toggleFavorite(r)} aria-pressed={fav}>
            <Heart size={16} className={cx(fav && "fill-brand text-brand")} aria-hidden />{fav ? "Сохранено" : "Сохранить"}
          </button>
          <button className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 hover:bg-sunken" onClick={() => setSheet("menu")}><CalendarPlus size={16} aria-hidden />В план</button>
        </div>

        {askRemind && (
          <div className="card mt-4 p-4">
            <p className="flex items-center gap-2 text-body-sm font-semibold"><Bell size={18} className="text-ink-soft" aria-hidden />Подсказывать, что приготовить?</p>
            <p className="mt-1 text-body-sm text-ink-soft">Каждый день в 17:30 — идея на ужин или блюдо из вашего плана. Отключить можно в профиле.</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary flex-1" onClick={async () => {
                setProfile((p) => ({ ...p, remindAsked: true }));
                try { await reminders.enable("17:30", s.reminders.weekly); toast("Готово: напомню в 17:30"); }
                catch (e) { toast(e instanceof Error ? e.message : "Не получилось включить напоминания"); }
              }}>Да, в 17:30</button>
              <button className="btn-ghost" onClick={() => setProfile((p) => ({ ...p, remindAsked: true }))}>Не надо</button>
            </div>
          </div>
        )}
      </div>
      {sheet === "menu" && <AddToMenuSheet recipeId={r.id} servings={c.servings} onClose={() => setSheet(null)} />}
      {sheet === "left" && <LeftoverSheet recipe={r} servings={c.servings} onClose={() => setSheet(null)} />}
      {sheet === "note" && <NoteSheet id={r.id} onClose={() => setSheet(null)} />}
    </Layer>
  );
}

function DoneRow({ icon, title, hint, onClick, chevron }: { icon: ReactNode; title: string; hint: string; onClick: () => void; chevron?: boolean }) {
  return (
    <button onClick={onClick} className="flex min-h-[64px] w-full min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-sunken/60">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold">{title}</span>
        <span className="block truncate text-caption text-ink-soft">{hint}</span>
      </span>
      {chevron && <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />}
    </button>
  );
}

/** After cooking: products that are left over go to «Мои продукты» (the ones sold in bigger packs are pre-selected). */
function LeftoverSheet({ recipe, servings, onClose }: { recipe: Recipe; servings: number; onClose: () => void }) {
  const { s, update, toast } = useStore();
  const a = useAssistant();
  const items = useMemo(() => {
    const skip = basics(s.preferences);
    return recipe.ingredients.filter((i) => !skip.has(i.id) && i.id !== "water").map((i) => {
      const x = scaleIngredient(i, recipe, servings);
      const pack = packageFor(i.id, x.amount, x.unit);
      const left = pack ? pack.count * pack.size - x.amount : 0;
      return { id: i.id, name: displayName(i.id, i.name), left: pack && left >= pack.size * 0.25 ? amountText(left, pack.unit) : "", home: s.fridge.some((f) => f.id === i.id) };
    }).filter((x, n, all) => all.findIndex((y) => y.id === x.id) === n);
  }, [recipe, servings, s.preferences, s.fridge]);
  const [on, setOn] = useState(() => new Set(items.filter((i) => i.left && !i.home).map((i) => i.id)));
  const toggle = (id: string) => setOn((v) => { const n = new Set(v); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = () => {
    const ids = [...on];
    update((st) => ({ ...st, fridge: addToFridge(st.fridge, ids) }));
    toast("В «Мои продукты»: " + ids.length + " " + plural(ids.length, "продукт", "продукта", "продуктов"), {
      label: "Что приготовить?",
      run: () => { a.show("Из того, что осталось", { ...a.base(), available: ids, strictPantry: false }, "Из остатков можно приготовить:"); goChat(); },
    });
    onClose();
  };
  return (
    <Sheet open title="Что осталось?" onClose={onClose}
      footer={<button className="btn-primary h-13 w-full text-body" disabled={!on.size} onClick={save}>{on.size ? "Добавить в «Мои продукты» · " + on.size : "Отметьте продукты"}</button>}>
      <p className="text-body-sm text-ink-soft">Отметьте, что осталось после готовки, — Шеф подскажет, что из этого приготовить.</p>
      <ul className="mt-2 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id}>
            <button className="flex min-h-[52px] w-full items-center gap-3 py-2 text-left disabled:opacity-60" disabled={i.home} aria-pressed={i.home || on.has(i.id)} onClick={() => toggle(i.id)}>
              <span aria-hidden className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-md border-2", i.home || on.has(i.id) ? "border-herb bg-herb text-paper" : "border-line-strong")}>
                {(i.home || on.has(i.id)) && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1 text-body-sm">{i.name}</span>
              <span className="shrink-0 whitespace-nowrap text-caption text-ink-soft">{i.home ? "уже дома" : i.left ? "останется ~" + i.left : ""}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** A note for next time, written right after cooking — when it is fresh in mind. */
function NoteSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { s, update, toast } = useStore();
  const [text, setText] = useState(s.notes[id] ?? "");
  const save = () => {
    const t = text.trim();
    update((st) => { const notes = { ...st.notes }; if (t) notes[id] = t; else delete notes[id]; return { ...st, notes }; });
    if (t) toast("Заметка сохранена — покажу её вверху рецепта");
    onClose();
  };
  return (
    <Sheet open title="Заметка на следующий раз" onClose={onClose} footer={<button className="btn-primary h-13 w-full" onClick={save}>Сохранить</button>}>
      <textarea className="input min-h-[120px] py-3" autoFocus placeholder="Например: соли меньше, добавить чеснок, жарить дольше" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
      <p className="mt-1.5 text-caption text-ink-faint">Видна только вам. Можно надиктовать — кнопка микрофона на клавиатуре.</p>
    </Sheet>
  );
}
