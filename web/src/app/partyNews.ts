// The organiser hears of the guests without opening the table: «Оля придёт +1, Петя возьмёт: мангал» on Главная.
// Works in the Android app too (no web push there): the coming tables this device organises are looked at when
// Главная is open (every 5 minutes), and compared with what the organiser saw last time on the table itself.
// On the site the browser can also show a notice by itself — «Сообщать мне об ответах» on the table (web push).
import { useEffect, useState } from "react";
import { guestSecret, knownParties, partyCall, type Party } from "./party";
import { post, subscription } from "./reminders";
import { isNativeApp } from "../engine";

type Seen = { g: Record<string, string>; i: Record<string, string> };
const key = (token: string) => "cook-party-seen-" + token;
const snap = (p: Party): Seen => ({
  g: Object.fromEntries(p.guests.filter((x) => x.key !== p.host && x.name).map((x) => [x.key, x.status + (x.plus ? "+" + x.plus : "")])),
  i: Object.fromEntries([...p.dishes, ...p.things].map((x) => [x.key, x.by ?? ""])),
});
/** The organiser has seen the table as it is now. */
export function markSeen(token: string, p: Party): void {
  try { localStorage.setItem(key(token), JSON.stringify(snap(p))); } catch { /* private mode */ }
}
/** What changed since the organiser last looked: «Оля придёт +1», «Петя возьмёт: мангал». */
export function newsOf(p: Party, seen: Seen): string[] {
  const out: string[] = [];
  const now = snap(p);
  for (const g of p.guests) {
    if (g.key === p.host || !g.name || seen.g[g.key] === now.g[g.key]) continue;
    out.push(g.name + (g.status === "yes" ? " придёт" + (g.plus ? " +" + g.plus : "") : g.status === "no" ? " не сможет" : " пока не знает"));
  }
  for (const x of [...p.dishes, ...p.things]) {
    if (!x.by || x.by === p.me || seen.i[x.key] === x.by) continue;
    const who = p.guests.find((g) => g.key === x.by)?.name;
    if (who) out.push(who + " возьмёт: " + x.title.toLowerCase());
  }
  return out;
}

/** The organiser's coming tables with news, for Главная. */
export function usePartyNews(): { token: string; title: string; news: string[] }[] {
  const [list, setList] = useState<{ token: string; title: string; news: string[] }[]>([]);
  useEffect(() => {
    let alive = true;
    const look = async () => {
      if (document.visibilityState !== "visible") return;
      const today = new Date().toISOString().slice(0, 10);
      const mine = knownParties().filter((k) => k.admin && k.date >= today).slice(0, 3);
      const out: { token: string; title: string; news: string[] }[] = [];
      for (const k of mine) {
        try {
          const p = await partyCall<Party>("party.get", { token: k.token, guest: guestSecret(), admin: k.admin });
          let seen: Seen | null = null;
          try { seen = JSON.parse(localStorage.getItem(key(k.token)) || "null"); } catch { /* ignore */ }
          if (!seen) { markSeen(k.token, p); continue; }
          const news = newsOf(p, seen);
          if (news.length) out.push({ token: k.token, title: p.title, news });
        } catch { /* offline or the table is gone: nothing to say */ }
      }
      if (alive) setList(out);
    };
    void look();
    const t = setInterval(look, 5 * 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return list;
}

// ---------- «Сообщать мне об ответах» (the site; the Android app shows the news on Главная) ----------
export const canNotify = () => !isNativeApp() && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
/** This browser's push subscription, made if needed — without touching the reminders' schedule when they are on. */
export async function notifyEndpoint(remindersOn: boolean): Promise<string> {
  if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted")
    throw new Error("Уведомления запрещены в браузере. Разрешите их в настройках сайта.");
  const had = await subscription(false);
  const sub = had ?? (await subscription(true));
  if (!sub) throw new Error("Этот браузер не умеет показывать уведомления.");
  // A new subscription is made known to the server (no daily reminder); one already there keeps its schedule.
  if (!had || !remindersOn) await post("push.subscribe", { endpoint: sub.endpoint, daily: null, weekly: false, tz: -new Date().getTimezoneOffset(), plan: [] });
  return sub.endpoint;
}
