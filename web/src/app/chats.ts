// Past conversations with Шеф, kept on this device (like the chat list in ChatGPT). The current one lives in the
// engine state (conversation + conditions); a new topic archives it here.
import { useEffect, useState } from "react";
import type { ChatMessage, Conditions } from "../engine";

export interface SavedChat { id: string; title: string; at: number; messages: ChatMessage[]; conditions: Conditions }

const KEY = "cook-chats-v1";
const MAX = 10;

export function loadChats(): SavedChat[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages) && c.messages.length).slice(0, MAX) : [];
  } catch { return []; }
}

function store(list: SavedChat[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch { /* private mode: no archive */ }
  window.dispatchEvent(new Event(KEY));
}

export const CHATS_EVENT = KEY;

/** Saves a finished conversation at the top of the list (no-op for an empty one). */
export function archiveChat(messages: ChatMessage[], conditions: Conditions): void {
  if (!messages.some((m) => m.role === "user")) return;
  const title = (messages.find((m) => m.role === "user")?.text ?? "Разговор").trim().slice(0, 60);
  const list = loadChats();
  store([{ id: crypto.randomUUID(), title, at: Date.now(), messages, conditions }, ...list]);
}

/** Takes a chat out of the archive (to make it the current one). */
export function takeChat(id: string): SavedChat | null {
  const list = loadChats();
  const c = list.find((x) => x.id === id) ?? null;
  if (c) store(list.filter((x) => x.id !== id));
  return c;
}

export function removeChat(id: string): void { store(loadChats().filter((x) => x.id !== id)); }

/** When the person last wrote to Шеф in the current conversation (for "continue" vs "new"). */
const LAST = "cook-chat-last";
export function markChatActive(): void { try { localStorage.setItem(LAST, String(Date.now())); } catch { /* ignore */ } }
export function lastChatAt(): number { try { return Number(localStorage.getItem(LAST)) || 0; } catch { return 0; } }
export const CHAT_FRESH_MS = 6 * 3600 * 1000;

/** The archive, kept fresh when a conversation is archived or restored. */
export function useChats(): SavedChat[] {
  const [list, setList] = useState(loadChats);
  useEffect(() => {
    const on = () => setList(loadChats());
    window.addEventListener(KEY, on);
    return () => window.removeEventListener(KEY, on);
  }, []);
  return list;
}
