// Reminders: web push from the site's own server (no paid services). The push carries no text — the service
// worker asks the server what to show, and the server answers from the plan this device sent (menu, expiring food).
// In the Android app the same reminders are scheduled as local notifications.
import { useCallback, useEffect } from "react";
import { apiUrl, dateKey, expiringSoon, isNativeApp, recipeById, shortName, type EngineState } from "../engine";
import * as core from "../engine/core.js";
import { useStore } from "./store";

const GENERIC = [
  "Не знаете, что приготовить? Идея дня уже ждёт.",
  "Скажите, что есть дома, — подберу блюдо за минуту.",
  "Загляните: для вас есть идея на сегодня.",
];

/** What each of the next 8 days' reminder says: the menu, or food that has to be used, or a general idea. */
export function reminderPlan(s: EngineState, now = new Date()): { date: string; body: string }[] {
  const out: { date: string; body: string }[] = [];
  for (let d = 0; d < 8; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const date = dateKey(day);
    const titles = (s.menu.find((m) => m.date === date)?.items ?? []).map((i) => recipeById(i.recipeId)?.title).filter((t): t is string => !!t);
    const tomorrow = new Date(day.getTime() + 864e5).getTime();
    const soon = expiringSoon(s.fridge, day.getTime()).filter((f) => (f.until ?? 0) <= tomorrow + 864e5).map((f) => shortName(f.id).toLowerCase());
    out.push({
      date,
      body: titles.length
        ? "Сегодня по меню: «" + titles[0] + "»" + (titles.length > 1 ? " и ещё " + (titles.length - 1) : "") + ". Рецепт и продукты — в одно касание."
        : soon.length
          ? "Пора использовать: " + soon.slice(0, 2).join(" и ") + ". Загляните — подскажу, что приготовить."
          : GENERIC[day.getDate() % 3],
    });
  }
  return out;
}

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function post(route: string, body: unknown) {
  const r = await fetch(apiUrl(route), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Сервер не ответил. Попробуйте позже.");
  return j;
}

async function subscription(create: boolean): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) {
    const { key } = await fetch(apiUrl("push.key")).then((r) => r.json());
    if (!key) throw new Error("Напоминания на сервере пока не включены.");
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
  }
  return sub;
}

export function useReminders() {
  const { s, update, ready } = useStore();
  const native = isNativeApp();
  const supported = native || (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);

  const send = useCallback(async (daily: string | null, weekly: boolean, state: EngineState, ask: boolean) => {
    if (native) {
      if (!daily && !weekly) return void (await core.EC());
      return void (await core.k0({ daily, weekly }, reminderPlan(state), ask));
    }
    if (!daily && !weekly) {
      const sub = await subscription(false);
      if (sub) { await post("push.unsubscribe", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
      return;
    }
    if (ask && Notification.permission !== "granted") {
      const p = await Notification.requestPermission();
      if (p !== "granted") throw new Error("Уведомления запрещены в браузере. Разрешите их в настройках сайта и попробуйте снова.");
    }
    const sub = await subscription(true);
    if (!sub) return;
    await post("push.subscribe", { endpoint: sub.endpoint, daily, weekly, tz: -new Date().getTimezoneOffset(), plan: reminderPlan(state) });
  }, [native]);

  const enable = useCallback(async (daily: string | null, weekly: boolean) => {
    await send(daily, weekly, s, true);
    update((st) => ({ ...st, reminders: { daily, weekly } }));
  }, [send, s, update]);

  const test = useCallback(async () => {
    if (native) return void (await core.DC());
    const sub = await subscription(false);
    if (!sub) throw new Error("Сначала включите напоминания.");
    await post("push.test", { endpoint: sub.endpoint });
  }, [native]);

  // The plan (menu, expiring food) changes: resend it once a day per visit, so the texts stay current.
  const on = !!(s.reminders.daily || s.reminders.weekly);
  const planKey = JSON.stringify(reminderPlan(s).map((p) => p.body));
  useEffect(() => {
    if (!ready || !on || !supported) return;
    if (!native && Notification.permission !== "granted") return;
    const t = setTimeout(() => { void send(s.reminders.daily, s.reminders.weekly, s, false).catch(() => {}); }, 3000);
    return () => clearTimeout(t);
  }, [ready, on, planKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { supported, enable, test, on };
}
