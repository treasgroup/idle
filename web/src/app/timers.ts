// Kitchen timers shared by the whole app: started from a recipe step, the cooking screen or a chat answer
// («Таймер на 10 мин»). Several can run at once; they live on the device (localStorage) and survive a reload.
import { useEffect, useState } from "react";
import { askNativeNotifications, cancelNativeTimer, isNativeApp, scheduleNativeTimer } from "../engine";
import { audio as getAudio } from "./feedback";
import { SOUNDS } from "./sounds";

export interface CookTimer {
  id: string;
  /** The dish the timer belongs to («Котлеты»), or «Таймер». */
  dish: string;
  recipeId?: string;
  /** Step index in the recipe, when started from a step. */
  step: number | null;
  /** What it is for: «хлеб», «варить яйца»; may be empty. */
  label: string;
  /** When it rings (ms); null while paused. */
  end: number | null;
  /** Seconds left while paused. */
  pausedLeft: number | null;
  /** The full length in seconds (for the progress ring). */
  total: number;
  /** Already rang; kept on screen until dismissed. */
  rang?: boolean;
  /** When it rang: the alarm repeats for a minute unless the timer is dismissed. */
  rangAt?: number;
}

const KEY = "cook-timers-v1";
export const TIMERS_EVENT = KEY;

export function loadTimers(): CookTimer[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((t) => t && typeof t.id === "string" && typeof t.total === "number").slice(0, 8) : [];
  } catch { return []; }
}

let memory: CookTimer[] | null = null;
function save(list: CookTimer[]) {
  memory = list.slice(0, 8);
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* private mode: timers last until reload */ }
  window.dispatchEvent(new Event(KEY));
}
const current = () => memory ?? (memory = loadTimers());

/** Seconds left (0 when it has rung). */
export function secondsLeft(t: CookTimer, now = Date.now()): number {
  if (t.pausedLeft != null) return t.pausedLeft;
  return t.end ? Math.max(0, Math.ceil((t.end - now) / 1000)) : 0;
}

/** Starts a timer; one already running for the same recipe step is replaced. */
export function startTimer(o: { dish: string; recipeId?: string; step?: number | null; label?: string; seconds: number }): CookTimer {
  const t: CookTimer = {
    id: Math.random().toString(36).slice(2, 10), dish: o.dish, recipeId: o.recipeId, step: o.step ?? null, label: o.label ?? "",
    end: Date.now() + o.seconds * 1000, pausedLeft: null, total: o.seconds,
  };
  const rest = current().filter((x) => !(o.recipeId && x.recipeId === o.recipeId && x.step === t.step && t.step != null));
  save([...rest, t]);
  // Asked at the moment it is needed: the first timer, so it can ring with the screen off.
  if (isNativeApp()) void askNativeNotifications().catch(() => {});
  else if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission().catch(() => {});
  return t;
}

export function stopTimer(id: string): void { save(current().filter((t) => t.id !== id)); }
export function stopTimersFor(recipeId: string): void { save(current().filter((t) => t.recipeId !== recipeId)); }

export function addMinute(id: string): void {
  save(current().map((t) => t.id !== id ? t
    : t.pausedLeft != null ? { ...t, pausedLeft: t.pausedLeft + 60, total: t.total + 60 }
    : { ...t, end: Math.max(t.end ?? 0, Date.now()) + 60000, total: t.total + 60, rang: false }));
}

export function togglePause(id: string): void {
  save(current().map((t) => t.id !== id || t.rang ? t
    : t.pausedLeft != null ? { ...t, end: Date.now() + t.pausedLeft * 1000, pausedLeft: null }
    : { ...t, pausedLeft: secondsLeft(t), end: null }));
}

/** Running and rung timers, soonest first. */
export function useTimers(): CookTimer[] {
  const [list, setList] = useState(current);
  useEffect(() => {
    const on = () => setList(current());
    const fromOtherTab = (e: StorageEvent) => { if (e.key === KEY) { memory = loadTimers(); on(); } };
    window.addEventListener(KEY, on);
    window.addEventListener("storage", fromOtherTab);
    return () => { window.removeEventListener(KEY, on); window.removeEventListener("storage", fromOtherTab); };
  }, []);
  return [...list].sort((a, b) => secondsLeft(a) - secondsLeft(b));
}

/** Re-renders every second while something is counting down. */
export function useTick(on: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

/** «Шаг 2 · хлеб» / «Таймер» */
export function timerTitle(t: CookTimer): string {
  const parts = [t.step != null ? "Шаг " + (t.step + 1) : "", t.label].filter(Boolean);
  return parts.join(" · ") || t.dish || "Таймер";
}

// ——— Ringing ———

const REPEAT_MS = 60000;

/** The alarm: a wind-up kitchen timer's bell (app/sounds), loud enough across the kitchen. */
export function beep(): void {
  try {
    const audio = getAudio();
    if (audio) SOUNDS.alarm(audio);
  } catch { /* no audio */ }
}

export function speak(text: string): void {
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

/**
 * Mounted once in the app shell: rings finished timers (toast, sound, vibration, voice, a system notification
 * when the page is hidden) and keeps the Android app's system alarm on the nearest one.
 */
export function useTimerAlarm(toast: (msg: string) => void, readAloud: boolean): void {
  const list = useTimers();
  const running = list.filter((t) => t.end && !t.rang);
  const nearest = running[0]?.end ?? null;
  useEffect(() => {
    if (!running.length) return;
    const tick = () => {
      const now = Date.now();
      const done = current().filter((t) => t.end && !t.rang && t.end <= now);
      if (!done.length) return;
      save(current().map((t) => (done.some((d) => d.id === t.id) ? { ...t, rang: true, rangAt: now } : t)));
      const what = done.map((t) => (t.dish && t.dish !== "Таймер" ? "«" + t.dish + "»" + (t.label ? ", " + t.label : "") : t.label || "таймер")).join("; ");
      toast("Время вышло: " + what);
      beep();
      navigator.vibrate?.([300, 120, 300, 120, 300]);
      void notify("Таймер закончился", what);
      if (readAloud) setTimeout(() => speak("Время вышло. " + what), 2600);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [running.length, nearest, toast, readAloud]); // eslint-disable-line react-hooks/exhaustive-deps

  // The phone may be on the table across the kitchen: ring again every few seconds for a minute, until «×».
  const ringing = list.filter((t) => t.rang && t.rangAt && Date.now() - t.rangAt < REPEAT_MS).length;
  useEffect(() => {
    if (!ringing) return;
    const again = setInterval(() => {
      const now = Date.now();
      if (!current().some((t) => t.rang && t.rangAt && now - t.rangAt < REPEAT_MS)) return clearInterval(again);
      beep();
      navigator.vibrate?.([300, 120, 300]);
    }, 6000);
    return () => clearInterval(again);
  }, [ringing]);

  useEffect(() => {
    if (!isNativeApp() || !nearest || nearest <= Date.now()) return;
    const t = running[0];
    void scheduleNativeTimer(nearest, "Таймер закончился", (t.dish ? "«" + t.dish + "»: " : "") + (t.label || "проверьте блюдо"));
    return () => cancelNativeTimer();
  }, [nearest]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Old builds kept one timer per dish in the cooking state; bring it over once. */
export function migrateOldTimer(old: { title: string; recipeId: string; end: number | null | undefined; step: number | null | undefined }[]): void {
  if (current().length) return;
  const live = old.filter((o) => o.end && o.end > Date.now());
  if (!live.length) return;
  save(live.map((o) => ({
    id: Math.random().toString(36).slice(2, 10), dish: o.title, recipeId: o.recipeId, step: o.step ?? null, label: "",
    end: o.end!, pausedLeft: null, total: Math.ceil((o.end! - Date.now()) / 1000),
  })));
}

/** «Таймер на 10 мин» in a kitchen answer: the first number of minutes, if any. */
export function minutesIn(text: string): number | null {
  // «1 ч 30 мин», «2 ч» — hours count too.
  const h = text.match(/(\d+)\s*(?:час(?:а|ов)?|ч(?![а-яё]))(?!\s*\.?\s*л)(?:\s*(\d+)\s*мин)?/i);
  if (h) { const n = Number(h[1]) * 60 + Number(h[2] ?? 0); return n > 0 && n <= 360 ? n : null; }
  const m = text.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*мин/);
  if (!m) return null;
  const n = Number(m[2] ?? m[1]);
  return n > 0 && n <= 240 ? n : null;
}
