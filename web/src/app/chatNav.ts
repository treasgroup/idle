// Getting to the conversation with Шеф from anywhere: the «Спросить Шефа» pill, the sidebar, home prompts.
import { useCallback } from "react";
import { useStore } from "./store";
import { useAssistant } from "./assistant";
import { CHAT_FRESH_MS, lastChatAt } from "./chats";
import { openLayer, parseRoute, routeHash } from "./router";

export const FOCUS_COMPOSER = "cook-focus-composer";
let focusWanted = false;
/** The chat screen asks once on mount whether to put the cursor into the box. */
export function takeFocusRequest(): boolean { const v = focusWanted; focusWanted = false; return v; }

/** Shows the conversation (a new history entry, so Back returns to where the person was). */
export function goChat(focus = false): void {
  if (focus) focusWanted = true;
  const r = parseRoute(location.hash);
  if (r.tab !== "chat" || r.recipe || r.cook || r.doc) openLayer(routeHash({ tab: "chat" }));
  if (focus) window.dispatchEvent(new Event(FOCUS_COMPOSER));
}

/**
 * `auto`: continues a conversation younger than 6 hours, otherwise archives it and opens an empty one.
 * `new`: always starts over. `continue`: just shows the current one.
 */
export function useOpenChat() {
  const { s } = useStore();
  const a = useAssistant();
  const has = s.conversation.length > 0;
  return useCallback((mode: "auto" | "new" | "continue" = "auto") => {
    const stale = Date.now() - lastChatAt() > CHAT_FRESH_MS;
    const fresh = mode === "new" || (mode === "auto" && has && stale);
    if (fresh && has) a.newChat();
    goChat(fresh || !has);
  }, [a, has]);
}
