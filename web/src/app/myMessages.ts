// The messages this device sent through «Написать нам», and the owner's answers to them. Each message has a key
// that only this device knows; with it the server gives back the answer. Kept on the device, nothing else is sent.
import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../engine";

export interface MyMessage { id: number; key: string; text: string; at: number; reply?: string; replyAt?: number; read?: boolean }
const KEY = "cook-my-messages";
const CHECKED = "cook-my-messages-checked";
const EVENT = "cook-my-messages";

export function myMessages(): MyMessage[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function save(list: MyMessage[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-30))); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}
export function rememberMessage(m: MyMessage): void { save([...myMessages(), m]); }
export function markRepliesRead(): void {
  const list = myMessages();
  if (list.some((m) => m.reply && !m.read)) save(list.map((m) => (m.reply ? { ...m, read: true } : m)));
}
export const unreadReplies = (): number => myMessages().filter((m) => m.reply && !m.read).length;

/** Asks the server for answers (at most every 30 minutes, only while some message has none yet or is recent).
 *  Returns how many answers arrived just now. */
export async function checkReplies(force = false): Promise<number> {
  const list = myMessages();
  const open = list.filter((m) => !m.reply || Date.now() - m.at < 30 * 864e5);
  if (!open.length) return 0;
  try { if (!force && Number(localStorage.getItem(CHECKED) || 0) > Date.now() - 30 * 60e3) return 0; } catch { /* ignore */ }
  try {
    const r = await fetch(apiUrl("message.replies"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: open.map(({ id, key }) => ({ id, key })) }) });
    if (!r.ok) return 0;
    const j = await r.json();
    try { localStorage.setItem(CHECKED, String(Date.now())); } catch { /* ignore */ }
    const got = new Map<number, { reply: string; at: number }>((Array.isArray(j.replies) ? j.replies : []).map((x: { id: number; reply: string; at: number }) => [x.id, x]));
    let fresh = 0;
    const next = myMessages().map((m) => {
      const g = got.get(m.id);
      if (!g || (g.reply === m.reply)) return m;
      fresh++;
      return { ...m, reply: g.reply, replyAt: g.at, read: false };
    });
    if (fresh) save(next);
    return fresh;
  } catch { return 0; /* offline */ }
}

/** The list and the count of answers not read yet; follows changes made anywhere in the app. */
export function useMyMessages(): { list: MyMessage[]; unread: number; refresh: () => void } {
  const [list, setList] = useState(myMessages);
  const refresh = useCallback(() => setList(myMessages()), []);
  useEffect(() => {
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [refresh]);
  return { list, unread: list.filter((m) => m.reply && !m.read).length, refresh };
}
