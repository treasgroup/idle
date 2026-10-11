// Шеф, the assistant: what the person typed or said → conditions → recipes and a reply.
// One provider for the whole app, so the home screen and the conversation share the same turn and "typing" state.
// The server AI is used only when it is configured; otherwise the local engine answers (the default).
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_CONDITIONS, apiUrl, classifyIntent, cleanMessage, freshConditions, parseMessage, patchSchema, rankRecipes, recipeById, recipes,
  relaxCondition, relaxOptions, respond, toStoredResults, track, type ChatMessage, type ChatOption, type Conditions,
} from "../engine";
import { useStore } from "./store";
import { goalConditions } from "./profile";
import { archiveChat, markChatActive, takeChat } from "./chats";

const lastShown = (conv: ChatMessage[]) => [...conv].reverse().find((m) => m.role === "assistant" && !!m.results?.length) ?? null;

export interface AskOptions {
  voice?: boolean; shown?: string; source?: string;
  /** Starts a new conversation (the current one goes to the archive). */
  fresh?: boolean;
  /** A new topic in the same conversation: the earlier conditions are dropped, the messages stay. */
  reset?: boolean;
}
interface Assistant {
  busy: boolean;
  /** Sends a message. `fresh`: starts a new conversation (the current one goes to the archive). */
  ask: (text: string, opts?: AskOptions) => Promise<void>;
  /** A follow-up chip under a reply. */
  choose: (o: ChatOption) => void;
  /** Ready-made conditions (quick buttons, "из того, что дома"). */
  show: (label: string, c: Conditions, intro: string, opts?: { fresh?: boolean }) => void;
  /** New conditions from the condition bar (a removed filter), with fresh results. */
  adjust: (c: Conditions, label: string) => void;
  /** Remembers the recipe opened from a reply, so "а сколько там соли?" is about it. */
  opened: (id: string, servings: number) => void;
  /** Archives the current conversation and starts an empty one. */
  newChat: () => void;
  /** Brings back an archived conversation. */
  restore: (id: string) => void;
  /** Conditions a new conversation starts from: the profile's servings, nothing else. */
  base: () => Conditions;
}

const Ctx = createContext<Assistant | null>(null);
export const useAssistant = (): Assistant => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAssistant outside AssistantProvider");
  return v;
};

export function AssistantProvider({ children, onOpen }: { children: ReactNode; onOpen: (id: string) => void }) {
  const { s, update, server, online, ensureSession, toast, profile } = useStore();
  const [busy, setBusy] = useState(false);
  const turn = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const focus = useRef<{ id: string; servings: number; after: ChatMessage | null } | null>(null);
  const stateRef = useRef(s);
  stateRef.current = s;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  const base = useCallback((): Conditions => ({
    ...freshConditions({ servings: profileRef.current.eaters, appliances: DEFAULT_CONDITIONS.appliances, vegetarian: stateRef.current.preferences.vegetarian }),
    servings: profileRef.current.eaters,
  }), []);

  /** Appends messages (or replaces the conversation) and the conditions they produced. */
  const push = useCallback((msgs: ChatMessage[], conditions?: Conditions, replace = false) => {
    const next = replace ? msgs : [...stateRef.current.conversation, ...msgs].slice(-20);
    stateRef.current = { ...stateRef.current, conversation: next, ...(conditions ? { conditions } : {}) };
    update((st) => ({ ...st, ...(conditions ? { conditions } : {}), conversation: replace ? msgs : [...st.conversation, ...msgs].slice(-20) }));
    markChatActive();
  }, [update]);

  const stop = () => { turn.current++; abort.current?.abort(); setBusy(false); };

  const newChat = useCallback(() => {
    stop();
    const st = stateRef.current;
    archiveChat(st.conversation, st.conditions);
    focus.current = null;
    const c = base();
    stateRef.current = { ...st, conversation: [], conditions: c };
    update((x) => ({ ...x, conversation: [], conditions: c }));
  }, [base, update]);

  const restore = useCallback((id: string) => {
    const saved = takeChat(id);
    if (!saved) return;
    stop();
    const st = stateRef.current;
    archiveChat(st.conversation, st.conditions);
    stateRef.current = { ...st, conversation: saved.messages, conditions: saved.conditions };
    update((x) => ({ ...x, conversation: saved.messages, conditions: saved.conditions }));
    markChatActive();
  }, [update]);

  const ask = useCallback(async (raw: string, opts: AskOptions = {}) => {
    const text = raw.trim();
    if (!text) return;
    if (opts.fresh && stateRef.current.conversation.length) newChat();
    const id = ++turn.current;
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setBusy(true);
    const st = opts.fresh ? { ...stateRef.current, conversation: [], conditions: base() }
      : opts.reset ? { ...stateRef.current, conditions: { ...base(), servings: stateRef.current.conditions.servings } } : stateRef.current;
    const started = Date.now();
    push([{ role: "user", text: opts.shown || text }], opts.fresh || opts.reset ? st.conditions : undefined, !!opts.fresh);
    let patch: Record<string, unknown> | null = null;
    let reply = "";
    let note = "";
    const timer = setTimeout(() => ac.abort(), 30000);
    try {
      if (online && server.aiReady) {
        try {
          await ensureSession();
          const r = await fetch(apiUrl("recommendations"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operationId: crypto.randomUUID(), message: text, conditions: st.conditions, preferences: st.preferences,
              history: st.conversation.slice(-10).map(({ role, text: t }) => ({ role, text: t })),
            }),
            signal: ac.signal,
          });
          const body = await r.json().catch(() => ({}));
          const parsed = patchSchema.safeParse(body.patch);
          if (r.ok && parsed.success) { patch = parsed.data; reply = body.reply || parsed.data.reply; }
          else note = body.code === "daily_limit" ? "Дневной лимит ИИ исчерпан — разобрал запрос сам." : "ИИ сейчас недоступен — разобрал запрос сам.";
        } catch {
          if (id !== turn.current) return;
          note = "ИИ не ответил вовремя — разобрал запрос сам.";
        }
      }
      if (id !== turn.current) return;
      const cleaned = cleanMessage(text);
      const local = parseMessage(cleaned, st.conditions);
      const isLocal = !patch;
      if (!patch) { patch = local; reply = local.reply; }
      else {
        const dish = (v: unknown) => (Array.isArray(v) ? v.filter((x: string) => x.startsWith("dish:")) : []);
        patch = { ...patch,
          desiredAdd: [...(patch.desiredAdd as string[]), ...dish(local.desiredAdd)], desiredRemove: [...(patch.desiredRemove as string[]), ...dish(local.desiredRemove)],
          excludedAdd: [...(patch.excludedAdd as string[]), ...dish(local.excludedAdd)], excludedRemove: [...(patch.excludedRemove as string[]), ...dish(local.excludedRemove)] };
      }
      const f = focus.current;
      const shown = lastShown(st.conversation);
      const focusRecipe = f && f.after === shown ? recipeById(f.id) ?? null : st.cooking && !st.cooking.done ? st.cooking.recipe : null;
      const out = respond({
        message: cleaned, patch, reply, local: isLocal,
        conditions: goalConditions(profileRef.current, st.conditions), preferences: st.preferences, conversation: st.conversation,
        guess: isLocal ? classifyIntent(cleaned) : null, focus: focusRecipe,
        focusServings: f && f.after === shown ? f.servings : st.cooking?.servings, voice: !!opts.voice,
      });
      if (out.kind !== "talk")
        track({ type: "query", text, count: out.kind === "unclear" ? -1 : out.kind === "near" ? 0 : out.results.length, source: opts.source ?? (opts.voice ? "voice" : "chat") });
      // A short pause so the answer does not flash in before the question has settled on screen.
      const wait = 400 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (id !== turn.current) return;
      push([{ role: "assistant", text: out.text, results: toStoredResults(out.results.slice(0, 5)), ...(out.options ? { options: out.options } : {}) }], out.conditions);
      if (note) toast(note);
      if (out.open) openRef.current(out.open);
    } catch (e) {
      if (id === turn.current) toast(e instanceof Error ? e.message : "Не получилось. Попробуйте ещё раз.");
    } finally {
      clearTimeout(timer);
      if (id === turn.current) setBusy(false);
    }
  }, [online, server.aiReady, ensureSession, push, toast, base, newChat]);

  const found = useCallback((c: Conditions, limit = 5) => rankRecipes(recipes(), goalConditions(profileRef.current, c), stateRef.current.preferences, limit), []);

  const choose = useCallback((o: ChatOption) => {
    if (o.open) return openRef.current(o.open);
    if (o.text) return void ask(o.text, { shown: o.label, source: "option" });
    if (!o.relax) return;
    stop();
    const c = relaxCondition(stateRef.current.conditions, o.relax);
    const list = found(c);
    const more = list.length ? [] : relaxOptions(c, stateRef.current.preferences);
    push([
      { role: "user", text: o.label },
      { role: "assistant", text: list.length ? "Готово, вот что подходит теперь:" : "И так пока ничего не находится." + (more.length ? " Можно ослабить ещё одно условие:" : ""),
        results: toStoredResults(list), ...(more.length ? { options: more } : {}) },
    ], c);
  }, [ask, push, found]);

  const adjust = useCallback((c: Conditions, label: string) => {
    stop();
    const list = found(c);
    const more = list.length ? [] : relaxOptions(c, stateRef.current.preferences);
    push([
      { role: "user", text: label },
      { role: "assistant", text: list.length ? "Учёл. Вот что подходит теперь:" : "Так ничего не находится." + (more.length ? " Можно ослабить ещё одно условие:" : ""),
        results: toStoredResults(list), ...(more.length ? { options: more } : {}) },
    ], c);
  }, [push, found]);

  const show = useCallback((label: string, c: Conditions, intro: string, opts: { fresh?: boolean } = {}) => {
    if (opts.fresh && stateRef.current.conversation.length) newChat();
    stop();
    const list = found(c);
    track({ type: "query", text: "[кнопка] " + label, count: list.length, source: "option" });
    push([
      { role: "user", text: label },
      { role: "assistant", text: list.length ? intro : "По этим условиям пока ничего нет. Напишите по-другому — например, назовите продукты.", results: toStoredResults(list),
        ...(list.length ? {} : { options: relaxOptions(c, stateRef.current.preferences) }) },
    ], c, !!opts.fresh);
  }, [push, found, newChat]);

  const opened = useCallback((id: string, servings: number) => {
    focus.current = { id, servings, after: lastShown(stateRef.current.conversation) };
  }, []);

  const value = useMemo<Assistant>(() => ({ busy, ask, choose, show, adjust, opened, newChat, restore, base }),
    [busy, ask, choose, show, adjust, opened, newChat, restore, base]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
