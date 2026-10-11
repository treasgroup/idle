// The assistant turn: what the person typed or said → conditions → recipes and a reply.
// The server AI is used when it is configured; otherwise (or when it fails) the local parser answers.
import { useCallback, useRef, useState } from "react";
import {
  apiUrl, applyPatch, classifyIntent, cleanMessage, parseMessage, patchSchema, rankRecipes, recipeById, recipes,
  relaxCondition, relaxOptions, respond, toStoredResults, track, type ChatMessage, type ChatOption, type Conditions,
} from "../engine";
import { useStore } from "./store";
import { goalConditions } from "./profile";

const lastShown = (conv: ChatMessage[]) => [...conv].reverse().find((m) => m.role === "assistant" && !!m.results?.length) ?? null;

export function useAssistant(onOpen: (id: string) => void) {
  const { s, update, server, online, ensureSession, toast, profile } = useStore();
  const [busy, setBusy] = useState(false);
  const turn = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const focus = useRef<{ id: string; servings: number; after: ChatMessage | null } | null>(null);
  const stateRef = useRef(s);
  stateRef.current = s;

  const push = useCallback((msgs: ChatMessage[], conditions?: Conditions) => {
    update((st) => ({ ...st, ...(conditions ? { conditions } : {}), conversation: [...st.conversation, ...msgs].slice(-20) }));
  }, [update]);

  const ask = useCallback(async (raw: string, opts: { voice?: boolean; shown?: string; source?: string } = {}) => {
    const text = raw.trim();
    if (!text) return;
    const id = ++turn.current;
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setBusy(true);
    const st = stateRef.current;
    push([{ role: "user", text: opts.shown || text }]);
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
        conditions: goalConditions(profile, st.conditions), preferences: st.preferences, conversation: st.conversation,
        guess: isLocal ? classifyIntent(cleaned) : null, focus: focusRecipe,
        focusServings: f && f.after === shown ? f.servings : st.cooking?.servings, voice: !!opts.voice,
      });
      if (out.kind !== "talk")
        track({ type: "query", text, count: out.kind === "unclear" ? -1 : out.kind === "near" ? 0 : out.results.length, source: opts.source ?? (opts.voice ? "voice" : "chat") });
      push([{ role: "assistant", text: out.text, results: toStoredResults(out.results), ...(out.options ? { options: out.options } : {}) }], out.conditions);
      if (note) toast(note);
      if (out.open) onOpen(out.open);
    } catch (e) {
      if (id === turn.current) toast(e instanceof Error ? e.message : "Не получилось. Попробуйте ещё раз.");
    } finally {
      clearTimeout(timer);
      if (id === turn.current) setBusy(false);
    }
  }, [online, server.aiReady, ensureSession, push, toast, onOpen, profile]);

  /** A button under the reply: ask a follow-up, open a recipe, or relax one condition. */
  const choose = useCallback((o: ChatOption, onPantry?: () => void) => {
    if (o.open) return onOpen(o.open);
    if (o.action === "pantry") return onPantry?.();
    if (o.text) return void ask(o.text, { shown: o.label, source: "option" });
    if (!o.relax) return;
    turn.current++;
    abort.current?.abort();
    setBusy(false);
    const st = stateRef.current;
    const c = relaxCondition(st.conditions, o.relax);
    const found = rankRecipes(recipes(), goalConditions(profile, c), st.preferences);
    const more = found.length ? [] : relaxOptions(c, st.preferences);
    push([
      { role: "user", text: o.label },
      { role: "assistant", text: found.length ? "Готово, вот что подходит теперь:" : "И так пока ничего не находится." + (more.length ? " Можно ослабить ещё одно условие:" : ""),
        results: toStoredResults(found), ...(more.length ? { options: more } : {}) },
    ], c);
  }, [ask, onOpen, push, profile]);

  /** Remembers which recipe the person opened from the replies, so "а сколько там соли?" is about it. */
  const opened = useCallback((id: string, servings: number) => {
    focus.current = { id, servings, after: lastShown(stateRef.current.conversation) };
  }, []);

  /** Shows recipes for a ready-made set of conditions (quick buttons on the home screen). */
  const show = useCallback((label: string, c: Conditions, intro: string) => {
    turn.current++;
    const st = stateRef.current;
    const found = rankRecipes(recipes(), goalConditions(profile, c), st.preferences, 5);
    track({ type: "query", text: "[кнопка] " + label, count: found.length, source: "option" });
    push([
      { role: "user", text: label },
      { role: "assistant", text: found.length ? intro : "По этим условиям пока ничего нет. Попробуйте написать по-другому.", results: toStoredResults(found) },
    ], c);
  }, [push, profile]);

  const reset = useCallback(() => {
    turn.current++;
    abort.current?.abort();
    setBusy(false);
    update((st) => ({ ...st, conversation: [], conditions: { ...st.conditions, desired: [], available: [], absent: [], excluded: [], maxMinutes: null, mood: null, strictPantry: false, maxKcal: null, minProtein: null, occasion: null } }));
  }, [update]);

  return { ask, choose, opened, show, reset, busy, applyPatch };
}
