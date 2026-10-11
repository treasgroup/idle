import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Timer, Volume2, VolumeX, Mic, MicOff, ListChecks, Plus, X, PartyPopper, Bell } from "lucide-react";
import {
  answerKitchenQuestion, answerRecipeQuestion, cancelNativeTimer, displayName, formatAmount, isNativeApp, recipeById, recipes, scaleIngredient,
  scheduleNativeTimer, searchRecipes, useHandsFree, updateTaste, formatMinutes, clampServings, type Recipe, type VoiceCommand,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useReminders } from "../app/reminders";
import { Layer, Sheet, Stepper, cx, mmss, useCountdown } from "../components/ui";
import { RecipeImage } from "../components/RecipeCard";

let audio: AudioContext | null = null;
function beep() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const t0 = audio.currentTime + 0.05;
    for (let n = 0; n < 3; n++)
      for (const [k, f] of [[0, 880], [1, 660], [2, 880]] as const) {
        const t = t0 + n + k * 0.22, o = audio.createOscillator(), g = audio.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.22);
      }
  } catch { /* no audio */ }
}
function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[«»•]/g, ""));
    u.lang = "ru-RU";
    const v = synth.getVoices().find((x) => x.lang.startsWith("ru"));
    if (v) u.voice = v;
    synth.speak(u);
  } catch { /* no speech */ }
}
async function notify(title: string, body: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted" || !document.hidden) return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag: "cook-timer", data: { focusOnly: true } });
    else new Notification(title, { body });
  } catch { /* ignore */ }
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
  const { finishCooking, openRecipe } = useActions();
  const c = s.cooking;
  const [activeTab, setActive] = useState<"main" | "second">("main");
  const [showIngredients, setShowIngredients] = useState(false);
  const [pickSecond, setPickSecond] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const firedFor = useRef<number | null>(null);
  useWakeLock(!!c && !c.done);

  const second = profile.parallel ? recipeById(profile.parallel.recipeId) ?? null : null;
  // The first dish is finished but the second is still cooking: stay on the second one.
  const active: "main" | "second" = c?.done && second ? "second" : activeTab;
  const left = useCountdown(c?.timerEnd ?? null);
  const left2 = useCountdown(profile.parallel?.timerEnd ?? null);

  // Timer finished: sound, vibration, voice, a system notification when the page is in the background.
  useEffect(() => {
    const ends = [c?.timerEnd, profile.parallel?.timerEnd].filter((x): x is number => !!x);
    if (!ends.length) return;
    const tick = () => {
      for (const end of ends) {
        if (Date.now() >= end && firedFor.current !== end) {
          firedFor.current = end;
          toast("Таймер закончился. Проверьте блюдо.");
          beep();
          navigator.vibrate?.([300, 120, 300, 120, 300]);
          void notify("Таймер закончился", "«" + (end === c?.timerEnd ? c?.recipe.title : second?.title) + "»: проверьте блюдо");
          if (s.readAloud || handsFree) setTimeout(() => speak("Таймер закончился. Проверьте блюдо."), 2600);
        }
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [c?.timerEnd, profile.parallel?.timerEnd, c?.recipe.title, second?.title, s.readAloud, handsFree, toast]);

  // In the Android app the timer is a system alarm too.
  useEffect(() => {
    const end = c?.timerEnd;
    if (!isNativeApp() || !end || end <= Date.now()) return;
    void scheduleNativeTimer(end, "Таймер закончился", "«" + c?.recipe.title + "»: проверьте блюдо");
    return () => cancelNativeTimer();
  }, [c?.timerEnd, c?.recipe.title]);

  const setStep = useCallback((n: number) => {
    if (active === "second" && profile.parallel && second) {
      setProfile((p) => (p.parallel ? { ...p, parallel: { ...p.parallel, step: Math.max(0, Math.min(second.steps.length - 1, n)) } } : p));
    } else update((st) => (st.cooking ? { ...st, cooking: { ...st.cooking, step: Math.max(0, Math.min(st.cooking.recipe.steps.length - 1, n)) } } : st));
  }, [active, profile.parallel, second, setProfile, update]);

  const startTimer = useCallback((seconds: number, stepIndex: number) => {
    const end = Date.now() + seconds * 1000;
    if (active === "second") setProfile((p) => (p.parallel ? { ...p, parallel: { ...p.parallel, timerEnd: end } } : p));
    else update((st) => (st.cooking ? { ...st, cooking: { ...st.cooking, timerEnd: end, timerStep: stepIndex } } : st));
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission().catch(() => {});
  }, [active, setProfile, update]);
  const stopTimer = useCallback(() => {
    if (active === "second") setProfile((p) => (p.parallel ? { ...p, parallel: { ...p.parallel, timerEnd: null } } : p));
    else update((st) => (st.cooking ? { ...st, cooking: { ...st.cooking, timerEnd: null, timerStep: null } } : st));
  }, [active, setProfile, update]);

  const recipe: Recipe | null = active === "second" && second ? second : c?.recipe ?? null;
  const servings = active === "second" && profile.parallel ? profile.parallel.servings : c?.servings ?? 2;
  const step = active === "second" && profile.parallel ? profile.parallel.step : c?.step ?? 0;
  const timerLeft = active === "second" ? left2 : left;
  const timerOn = active === "second" ? !!profile.parallel?.timerEnd : !!c?.timerEnd;

  // Hands-free voice commands.
  const onCommand = useCallback((cmd: VoiceCommand) => {
    if (!recipe) return;
    const say = (t: string) => speak(t);
    switch (cmd.type) {
      case "next": if (step < recipe.steps.length - 1) { setStep(step + 1); say(recipe.steps[step + 1].text); } else say("Это последний шаг."); break;
      case "back": if (step > 0) { setStep(step - 1); say(recipe.steps[step - 1].text); } break;
      case "repeat": say(recipe.steps[step].text); break;
      case "timer": if (cmd.seconds) { startTimer(cmd.seconds, step); say("Таймер на " + Math.round(cmd.seconds / 60) + " минут."); } else if (recipe.steps[step].timerSeconds) { startTimer(recipe.steps[step].timerSeconds!, step); say("Таймер запущен."); } else say("На сколько минут поставить таймер?"); break;
      case "timerStop": stopTimer(); say("Таймер выключен."); break;
      case "timeLeft": say(timerOn ? "Осталось " + mmss(timerLeft).replace(":", " минут ") + " секунд." : "Таймер не запущен."); break;
      case "ingredients": say(recipe.ingredients.map((i) => { const x = scaleIngredient(i, recipe, servings); return x.name + " " + formatAmount(x.amount, x.unit); }).join(", ") + "."); break;
      case "close": onClose(); break;
      case "stopListening": setHandsFree(false); say("Голосовое управление выключено."); break;
      case "help": say("Говорите: дальше, назад, повторите, таймер на пять минут, сколько осталось, какие продукты. Можно спросить: сколько муки, чем заменить сметану."); break;
      case "ask": { const a = answerRecipeQuestion(cmd.text, [recipe], servings)?.text ?? answerKitchenQuestion(cmd.text, true)?.text; say(a ? a.replace(/\n/g, ". ") : "Не знаю ответа. Скажите «дальше», «повторите» или «какие продукты»."); break; }
    }
  }, [recipe, step, servings, setStep, startTimer, stopTimer, timerOn, timerLeft, onClose]);
  const hf = useHandsFree(handsFree && !!c && !c.done, onCommand, toast);

  useEffect(() => { if (s.readAloud && recipe && c && !c.done) speak(recipe.steps[step]?.text ?? ""); }, [step, active, s.readAloud]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }, []);

  if (!c) return (
    <Layer title="Готовка" onClose={onClose}>
      <div className="p-6 text-center text-ink-soft">Сейчас ничего не готовится. Откройте рецепт и нажмите «Готовить».</div>
    </Layer>
  );
  if (c.done && !second) return <Done onClose={onClose} />;
  if (!recipe) return null;

  const cur = recipe.steps[step];
  const uses = (cur.uses || []).map((id) => recipe.ingredients.find((i) => i.id === id)).filter(Boolean).map((i) => scaleIngredient(i!, recipe, servings));
  const last = step === recipe.steps.length - 1;
  const offset = second ? c.recipe.totalMinutes - second.totalMinutes : 0;

  return (
    <Layer title={recipe.title} onClose={onClose} actions={
      <>
        <button className="btn-ghost px-2" onClick={() => update((st) => ({ ...st, readAloud: !st.readAloud }))} aria-label={s.readAloud ? "Не читать шаги вслух" : "Читать шаги вслух"}>{s.readAloud ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
        {hf.supported && <button className={cx("btn-ghost px-2", handsFree && "text-brand")} onClick={() => { setHandsFree((v) => !v); if (!handsFree) speak("Слушаю. Говорите: дальше, назад, таймер."); }} aria-label={handsFree ? "Выключить голосовое управление" : "Голосовое управление"}>{handsFree ? <Mic size={20} /> : <MicOff size={20} />}</button>}
      </>
    }>
      <div className="flex min-h-full flex-col px-4 pb-32 pt-3">
        {second && (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-line/50 p-1 text-sm">
            {(["main", "second"] as const).map((k) => {
              const r = k === "main" ? c.recipe : second;
              const t = k === "main" ? left : left2;
              return <button key={k} onClick={() => setActive(k)} className={cx("truncate rounded-full px-3 py-1.5", active === k ? "bg-card font-semibold shadow-sm" : "text-ink-soft")}>{t > 0 ? "⏱ " + mmss(t) + " · " : ""}{r.title}</button>;
            })}
          </div>
        )}
        {second && offset !== 0 && step === 0 && (
          <p className="mb-3 rounded-xl bg-herb-soft px-3 py-2 text-sm text-herb">
            {offset > 0 ? "Начните «" + second.title + "» примерно через " + formatMinutes(offset) + " после первого блюда — тогда оба будут готовы вместе." : "«" + second.title + "» готовится дольше: начните с него, а первое блюдо — через " + formatMinutes(-offset) + "."}
          </p>
        )}

        <div className="mb-2 flex items-center justify-between text-sm text-ink-faint">
          <span>Шаг {step + 1} из {recipe.steps.length}</span>
          <button className="inline-flex items-center gap-1 font-semibold text-brand" onClick={() => setShowIngredients(true)}><ListChecks size={16} /> Продукты</button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand transition-all" style={{ width: ((step + 1) / recipe.steps.length) * 100 + "%" }} /></div>

        <p className="mt-6 font-serif text-[22px] leading-snug sm:text-2xl">{cur.text}</p>
        {uses.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{uses.map((i) => <span key={i.id} className="rounded-full bg-card px-3 py-1 text-sm shadow-card">{displayName(i.id, i.name)} · {formatAmount(i.amount, i.unit)}</span>)}</div>}

        {(cur.timerSeconds || timerOn) && (
          <div className="mt-6 flex items-center gap-3 rounded-xl2 bg-warn-soft p-4">
            <Timer className="shrink-0 text-warn" />
            {timerOn ? (
              <>
                <span className="flex-1 font-mono text-3xl font-semibold tabular-nums" aria-live="polite">{mmss(timerLeft)}</span>
                <button className="btn-outline" onClick={stopTimer}>Стоп</button>
              </>
            ) : (
              <>
                <span className="flex-1">Таймер на {Math.round((cur.timerSeconds ?? 0) / 60)} мин</span>
                <button className="btn-primary" onClick={() => startTimer(cur.timerSeconds!, step)}>Запустить</button>
              </>
            )}
          </div>
        )}
        {handsFree && <p className="mt-4 text-center text-xs text-ink-faint">{hf.listening ? "🎙 Слушаю: «дальше», «назад», «таймер на 5 минут», «сколько муки»…" : "Микрофон на паузе"}{hf.heard ? " · услышал: «" + hf.heard + "»" : ""}</p>}

        {!second && step === 0 && (
          <button className="mt-6 inline-flex items-center gap-1.5 self-start text-sm text-ink-soft" onClick={() => setPickSecond(true)}><Plus size={16} /> Готовлю ещё одно блюдо параллельно</button>
        )}
        {second && <button className="mt-6 inline-flex items-center gap-1.5 self-start text-sm text-ink-soft" onClick={() => { setProfile((p) => ({ ...p, parallel: null })); setActive("main"); }}><X size={16} /> Убрать второе блюдо</button>}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl gap-2 border-t border-line/60 bg-paper/95 px-4 py-3 backdrop-blur">
        <button className="btn-outline px-5 py-3" disabled={step === 0} onClick={() => setStep(step - 1)} aria-label="Назад"><ChevronLeft size={20} /></button>
        {last ? (
          <button className="btn-primary flex-1 py-3 text-base" onClick={() => {
            if (active === "second" && second) { finishCooking(second, false, false); setProfile((p) => ({ ...p, parallel: null })); setActive("main"); toast("«" + second.title + "» готово!"); }
            else { finishCooking(c.recipe); if (second) setActive("second"); }
          }}>Готово! 🎉</button>
        ) : (
          <button className="btn-primary flex-1 py-3 text-base" onClick={() => setStep(step + 1)}>Дальше <ChevronRight size={20} /></button>
        )}
      </div>

      <Sheet open={showIngredients} title={"Продукты · " + servings + " порц."} onClose={() => setShowIngredients(false)}>
        <ul className="divide-y divide-line/60">
          {recipe.ingredients.map((i) => { const x = scaleIngredient(i, recipe, servings); return <li key={i.id + i.unit} className="flex justify-between gap-3 py-2"><span>{x.name}</span><span className="text-ink-soft">{formatAmount(x.amount, x.unit)}</span></li>; })}
        </ul>
      </Sheet>
      <PickSecond open={pickSecond} onClose={() => setPickSecond(false)} exclude={c.recipe.id}
        onPick={(r, n) => { setProfile((p) => ({ ...p, parallel: { recipeId: r.id, servings: n, step: 0, timerEnd: null } })); setPickSecond(false); setActive("main"); }}
        onOpen={openRecipe} />
    </Layer>
  );
}

function PickSecond({ open, onClose, exclude, onPick }: { open: boolean; onClose: () => void; exclude: string; onPick: (r: Recipe, servings: number) => void; onOpen: (id: string) => void }) {
  const { s } = useStore();
  const [q, setQ] = useState("");
  const [servings, setServings] = useState(s.cooking?.servings ?? 2);
  const list = useMemo(() => {
    const fromMenu = s.menu.flatMap((d) => d.items.map((i) => recipeById(i.recipeId))).filter((r): r is Recipe => !!r);
    const base = q.trim() ? searchRecipes(q) : [...fromMenu, ...s.favorites.map((f) => recipeById(f.id) ?? f), ...recipes().filter((r) => ["side", "salad"].includes(r.course ?? ""))];
    return [...new Map(base.filter((r) => r.id !== exclude).map((r) => [r.id, r])).values()].slice(0, 12);
  }, [q, s.menu, s.favorites, exclude]);
  return (
    <Sheet open={open} title="Второе блюдо" onClose={onClose}>
      <p className="mb-3 text-sm text-ink-soft">Например, гарнир или салат. Переключайтесь между блюдами вверху экрана — у каждого свой шаг и таймер.</p>
      <input className="input mb-3" placeholder="Найти рецепт" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mb-3 flex items-center justify-between text-sm"><span>Порций</span><Stepper value={servings} min={1} max={12} onChange={setServings} label="Порции" /></div>
      <div className="space-y-2">
        {list.map((r) => (
          <button key={r.id} className="card flex w-full items-center gap-3 p-2 text-left" onClick={() => onPick(r, clampServings(r, servings))}>
            <RecipeImage recipe={r} className="h-12 w-12 shrink-0" />
            <span className="min-w-0 flex-1"><span className="line-clamp-1 font-medium">{r.title}</span><span className="text-xs text-ink-faint">{formatMinutes(r.totalMinutes)}</span></span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** After the last step: how was it, and (once) the evening reminder. */
function Done({ onClose }: { onClose: () => void }) {
  const { s, update, profile, setProfile, toast } = useStore();
  const reminders = useReminders();
  const c = s.cooking!;
  const [rated, setRated] = useState(false);
  const feedback = (v: "liked" | "too_hard") => {
    update((st) => ({ ...st, taste: updateTaste(st.taste, c.recipe.id, v) }));
    setRated(true);
    toast(v === "liked" ? "Запомнил — буду чаще предлагать похожее" : "Понял — предложу что-нибудь попроще");
  };
  const askRemind = !profile.remindAsked && !s.reminders.daily && reminders.supported;
  return (
    <Layer title="Готово" onClose={() => { update((st) => ({ ...st, cooking: null })); onClose(); }}>
      <div className="px-5 pb-16 pt-8 text-center">
        <PartyPopper size={48} className="mx-auto text-brand" />
        <h1 className="mt-3 text-3xl font-semibold">Приятного аппетита!</h1>
        <p className="mt-1 text-ink-soft">«{c.recipe.title}» — в «Моей книге».</p>
        {!rated ? (
          <div className="mt-6">
            <p className="text-sm text-ink-soft">Как вам блюдо?</p>
            <div className="mt-2 flex justify-center gap-2">
              <button className="btn-soft" onClick={() => feedback("liked")}>😋 Понравилось</button>
              <button className="btn-outline" onClick={() => feedback("too_hard")}>😓 Сложновато</button>
            </div>
          </div>
        ) : <p className="mt-6 text-sm text-herb">Спасибо! Отзыв с фото можно оставить на странице рецепта.</p>}
        {askRemind && (
          <div className="mx-auto mt-8 max-w-sm rounded-xl2 bg-card p-4 text-left shadow-card">
            <div className="flex items-center gap-2 font-semibold"><Bell size={18} className="text-brand" /> Подсказывать, что приготовить?</div>
            <p className="mt-1 text-sm text-ink-soft">Каждый день в 17:30 — идея на ужин или блюдо из вашего меню. Отключить можно в профиле.</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary flex-1" onClick={async () => { setProfile((p) => ({ ...p, remindAsked: true })); try { await reminders.enable("17:30", s.reminders.weekly); toast("Готово: напомню в 17:30"); } catch (e) { toast(e instanceof Error ? e.message : "Не получилось включить напоминания"); } }}>Да, в 17:30</button>
              <button className="btn-ghost" onClick={() => setProfile((p) => ({ ...p, remindAsked: true }))}>Не надо</button>
            </div>
          </div>
        )}
        <button className="btn-outline mt-8" onClick={() => { update((st) => ({ ...st, cooking: null })); onClose(); }}>Закрыть</button>
      </div>
    </Layer>
  );
}
