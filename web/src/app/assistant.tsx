// Шеф, the assistant: what the person typed or said → conditions → recipes and a reply.
// One provider for the whole app, so the home screen and the conversation share the same turn and "typing" state.
// The server AI is used only when it is configured; otherwise the local engine answers (the default).
import { measureAnswer, roastAnswer } from "./kitchenMath";
import { leftoverAnswer } from "./leftovers";
import { didYouMean } from "./didYouMean";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_CONDITIONS, apiUrl, classifyIntent, cleanMessage, loadIntentModel, freshConditions, parseMessage, patchSchema, rankRecipes, recipeById, recipes, shortName,
  dishLabel, formatMinutes, matchesDish, nutritionOf, plural, relaxCondition, relaxOptions, respond, toStoredResults, track, type ChatMessage, type ChatOption, type Conditions, type Match,
} from "../engine";
import { useStore } from "./store";
import { goalConditions } from "./profile";
import { archiveChat, markChatActive, takeChat } from "./chats";
import { fixBySound, plainWords, soundBook } from "./colloquial";
import { HEALTH, hasTopic, healthOf, isNewTopic, withHealth } from "./topic";

// The recipe titles by sound («хочопури» → «хачапури»), made again when the catalog changes.
let sounds: { n: number; book: ReturnType<typeof soundBook> } | null = null;
function titleSounds() {
  const list = recipes();
  if (!sounds || sounds.n !== list.length) sounds = { n: list.length, book: soundBook(list.map((r) => r.title), list.flatMap((r) => [r.summary ?? "", ...r.steps.map((x) => x.text)])) };
  return sounds.book;
}

/** «курица и картошка»: a dish named after the products («Курица с картошкой») goes before one that only contains them. */
function namedFirst(list: Match[], c: Conditions): Match[] {
  const stems = c.desired.filter((d) => !d.includes(":")).map((id) => shortName(id).toLowerCase().slice(0, 5)).filter((x) => x.length >= 3);
  if (stems.length < 2) return list;
  const hits = (m: Match) => stems.filter((st) => m.recipe.title.toLowerCase().includes(st)).length;
  const head = list.slice(0, 10).map((m, i) => ({ m, i, n: hits(m) })).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.m);
  return [...head, ...list.slice(10)];
}

// Products that can be left out of a dish without spoiling it: «без лука» keeps the dish, just without it.
const SOFT: Record<string, string> = { onion: "лука", "red-onion": "лука", "green-onion": "лука", garlic: "чеснока", dill: "укропа", parsley: "петрушки", cilantro: "кинзы", "black-pepper": "перца" };
const SOFT_ONE: Record<string, string> = { onion: "лук", "red-onion": "лук", "green-onion": "лук", garlic: "чеснок", dill: "укроп", parsley: "петрушку", cilantro: "кинзу", "black-pepper": "перец" };

// Memorial and fasting-eve dishes are offered only to those who ask for them.
const MEMORIAL = /кутья|кутью|кути|канун|поминал/i;
const kcalOf = (m: Match) => nutritionOf(m.recipe).perServing.kcal;
const simpleScore = (m: Match) => (m.recipe.difficulty === "easy" ? 0 : m.recipe.difficulty === "medium" ? 2 : 4)
  + (m.recipe.ingredients.length > 10 ? 2 : m.recipe.ingredients.length > 7 ? 1 : 0) + (m.recipe.totalMinutes > 60 ? 2 : m.recipe.totalMinutes > 40 ? 1 : 0);
/**
 * The last word on what is shown: no кутья unless asked; «проще» means simple to cook (easy, few products, quick);
 * and without «сытное», «для гостей» or a holiday a dish of 2+ hours or 900+ kcal does not go first.
 */
function tidyResults(list: Match[], c: Conditions, text: string, simpler: boolean, found: (c: Conditions, limit?: number) => Match[]): Match[] {
  const asked = MEMORIAL.test(text);
  let out = asked ? list : list.filter((m) => !MEMORIAL.test(m.recipe.title));
  if (simpler) {
    const pool = found(c, 40).filter((m) => asked || !MEMORIAL.test(m.recipe.title));
    if (pool.length) out = pool.map((m, i) => ({ m, i })).sort((a, b) => simpleScore(a.m) - simpleScore(b.m) || a.i - b.i).map((x) => x.m).slice(0, Math.max(5, out.length));
  }
  const festive = c.mood === "hearty" || c.occasion === "guests" || /сытн|праздн|гост|на стол|не спеша|выходн/i.test(text);
  if (!festive) {
    const heavy = (m: Match) => m.recipe.totalMinutes > 120 || kcalOf(m) > 900;
    out = [...out.filter((m) => !heavy(m)), ...out.filter(heavy)];
  }
  if (!out.length && list.length) out = found(c, 20).filter((m) => !MEMORIAL.test(m.recipe.title));
  return out.length ? out : list;
}

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
  // Profile goals (lighter, more protein, quick) apply to every search until the person removes one in this conversation.
  const relaxedGoals = useRef(new Set<string>());
  const withGoals = useCallback((c: Conditions): Conditions => {
    // A dish asked for by name («хочу равиоли») is shown even when it is heavier or longer than the profile's goals.
    if (c.desired.some((d) => d.startsWith("dish:"))) return c;
    const g = goalConditions(profileRef.current, c);
    const r = relaxedGoals.current;
    return { ...g, maxKcal: r.has("kcal") ? c.maxKcal : g.maxKcal, minProtein: r.has("protein") ? c.minProtein : g.minProtein, maxMinutes: r.has("time") ? c.maxMinutes : g.maxMinutes };
  }, []);

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
    relaxedGoals.current.clear();
    const c = base();
    stateRef.current = { ...st, conversation: [], conditions: c };
    update((x) => ({ ...x, conversation: [], conditions: c }));
  }, [base, update]);

  const restore = useCallback((id: string) => {
    const saved = takeChat(id);
    if (!saved) return;
    stop();
    relaxedGoals.current.clear();
    const st = stateRef.current;
    archiveChat(st.conversation, st.conditions);
    stateRef.current = { ...st, conversation: saved.messages, conditions: saved.conditions };
    update((x) => ({ ...x, conversation: saved.messages, conditions: saved.conditions }));
    markChatActive();
  }, [update]);

  const found = useCallback((c: Conditions, limit = 5) =>
    rankRecipes(recipes(), withGoals(c), stateRef.current.preferences, limit + 3).filter((m) => !MEMORIAL.test(m.recipe.title)).slice(0, limit), [withGoals]);

  const ask = useCallback(async (raw: string, opts: AskOptions = {}) => {
    const text = raw.trim();
    if (!text) return;
    if (opts.fresh && stateRef.current.conversation.length) newChat();
    const id = ++turn.current;
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setBusy(true);
    // A new request is not a refinement of the last one: what was said for the previous dish is dropped
    // («хочу сладкое», then «нет духовки, есть фарш»). «А без лука», «побыстрее» keep it.
    const reset = opts.reset || (!opts.fresh && isNewTopic(text) && hasTopic(stateRef.current.conditions, base()));
    const health = healthOf(text);
    let st = opts.fresh ? { ...stateRef.current, conversation: [], conditions: base() }
      : reset ? { ...stateRef.current, conditions: { ...base(), servings: stateRef.current.conditions.servings } } : stateRef.current;
    if (health) st = { ...st, conditions: withHealth(st.conditions, health) };
    const started = Date.now();
    push([{ role: "user", text: opts.shown || text }], opts.fresh || reset || health ? st.conditions : undefined, !!opts.fresh);
    // Kitchen arithmetic is answered here at once: grams in a glass, how long to roast by weight.
    const local = measureAnswer(text) ?? roastAnswer(text);
    if (local) { push([{ role: "assistant", text: local }]); setBusy(false); return; }
    const left = leftoverAnswer(text);
    if (left) { push([{ role: "assistant", text: left.text, ...(left.options ? { options: left.options } : {}) }]); setBusy(false); return; }
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
      const cleaned = cleanMessage(fixBySound(plainWords(text), titleSounds()));
      if (!patch) await loadIntentModel().catch(() => null); // usually loaded already; on a quick first question, a moment
      if (id !== turn.current) return;
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
      const turnWith = (conditions: Conditions) => respond({
        message: cleaned, patch, reply, local: isLocal,
        conditions, preferences: st.preferences, conversation: st.conversation,
        guess: isLocal ? classifyIntent(cleaned) : null, focus: focusRecipe,
        focusServings: f && f.after === shown ? f.servings : st.cooking?.servings, voice: !!opts.voice,
      });
      let out = turnWith(withGoals(st.conditions));
      // «хочу равиоли» with the goal «полегче»: the goal must not hide the dish asked for by name — once more without it.
      const goalsAdded = JSON.stringify(withGoals(st.conditions)) !== JSON.stringify(st.conditions);
      if (goalsAdded && out.conditions.desired.some((d) => d.startsWith("dish:"))) out = turnWith(st.conditions);
      // «хочу сладкое», then «а хачапури есть?»: a dish asked for by name is a new request, even after «а …». When what
      // was said for the previous dish (сладкое, суп, до 20 минут) leaves none of it, once more without that — keeping
      // only what the person does not eat and the kitchen they have.
      const asked = ((patch?.desiredAdd as string[] | undefined) ?? []).filter((d) => d.startsWith("dish:") && !st.conditions.desired.includes(d));
      const hasAsked = (o: typeof out) => o.results.some((m) => asked.some((d) => matchesDish(m.recipe, d)));
      if (asked.length && !reset && !opts.fresh && !hasAsked(out)) {
        const clean: Conditions = { ...base(), servings: st.conditions.servings, excluded: st.conditions.excluded, appliances: st.conditions.appliances, health: st.conditions.health };
        let again = turnWith(withGoals(clean));
        if (!hasAsked(again)) again = turnWith(clean);
        if (hasAsked(again)) out = again;
      }
      // Still none of it: the dish is in the catalog, but what the person does not eat (or the kitchen) rules it out — say
      // so plainly instead of «не нашлось».
      if (asked.length && !hasAsked(out) && out.kind !== "talk") {
        const have = recipes().filter((r) => asked.some((d) => matchesDish(r, d))).length;
        if (have) out.text = "«" + dishLabel(asked[0]) + "» у меня есть" + (have > 1 ? " (" + have + " " + plural(have, "вариант", "варианта", "вариантов") + ")" : "")
          + ", но под ваши условия не подходит — их можно поменять в «Условиях» вверху." + (out.results.length ? " Вот что подходит:" : "");
      }
      // Health words: the note first; when the rest of the message gave nothing to search by, the picks for it.
      if (health) {
        const c = { ...out.conditions, health };
        const results = out.results.length && out.kind !== "unclear" ? out.results : found(c);
        Object.assign(out, { kind: "found", text: HEALTH[health].reply, results, conditions: c, options: undefined });
      } else if (st.conditions.health) out.conditions = { ...out.conditions, health: st.conditions.health };
      // «есть фарш» → «а без лука»: nearly every dish with mince has onion, and the picker would fall back to
      // anything (a milkshake). Onion, garlic and herbs can simply be left out — offer those dishes and say so.
      const soft = ((patch?.excludedAdd as string[] | undefined) ?? []).filter((x) => x in SOFT);
      if (soft.length && out.conditions.available.length && out.results.length && out.results.every((m) => !m.available.length)) {
        const alt = found({ ...out.conditions, excluded: out.conditions.excluded.filter((x) => !soft.includes(x)) }).filter((m) => m.available.length);
        if (alt.length) Object.assign(out, { kind: "found", results: alt, text: "Таких блюд совсем без " + SOFT[soft[0]] + " у меня нет — вот где " + SOFT_ONE[soft[0]] + " можно просто не класть:" });
      }
      // Not understood: say so, and offer the closest things Шеф does understand.
      if (out.kind === "unclear") {
        const near = didYouMean(text);
        if (near.length) Object.assign(out, { text: "Не до конца понял. Может, вы имели в виду:", options: near });
      }
      // The named dish goes past the profile's goals — said once, gently, under the answer.
      const named = out.conditions.desired.some((d) => d.startsWith("dish:"));
      const top = out.results[0]?.recipe;
      if (named && top && out.kind !== "talk") {
        const goals = profileRef.current.goals;
        const kcal = nutritionOf(top).perServing.kcal;
        const over = goals.includes("light") && kcal > 500 ? "сытнее вашей цели «полегче» — " + kcal + " ккал на порцию"
          : goals.includes("quick") && top.totalMinutes > 30 ? "дольше, чем вы обычно готовите, — " + formatMinutes(top.totalMinutes)
          : goals.includes("protein") && nutritionOf(top).perServing.protein < 25 ? "в нём меньше белка, чем в вашей цели" : "";
        if (over) out.text = out.text.replace(/[:.]?\s*$/, "") + ". Учтите: это блюдо " + over + ".";
      }
      if (out.results.length) out.results = tidyResults(out.results, out.conditions, text, (patch?.mood as string | undefined) === "comfort", found);
      if (out.kind !== "talk")
        track({ type: "query", text, count: out.kind === "unclear" ? -1 : out.kind === "near" ? 0 : out.results.length, source: opts.source ?? (opts.voice ? "voice" : "chat") });
      // A short pause so the answer does not flash in before the question has settled on screen.
      const wait = 400 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (id !== turn.current) return;
      push([{ role: "assistant", text: out.text, results: toStoredResults(namedFirst(out.results, out.conditions).slice(0, 5)), ...(out.options ? { options: out.options } : {}) }], out.conditions);
      if (note) toast(note);
      if (out.open) openRef.current(out.open);
    } catch (e) {
      if (id === turn.current) toast(e instanceof Error ? e.message : "Не получилось. Попробуйте ещё раз.");
    } finally {
      clearTimeout(timer);
      if (id === turn.current) setBusy(false);
    }
  }, [online, server.aiReady, ensureSession, push, toast, base, newChat, withGoals, found]);


  const choose = useCallback((o: ChatOption) => {
    if (o.open) return openRef.current(o.open);
    if (o.text) return void ask(o.text, { shown: o.label, source: "option" });
    if (!o.relax) return;
    stop();
    if (["kcal", "protein", "time"].includes(o.relax)) relaxedGoals.current.add(o.relax);
    const c = relaxCondition(stateRef.current.conditions, o.relax);
    const list = found(c);
    const more = list.length ? [] : relaxOptions(c, stateRef.current.preferences);
    push([
      { role: "user", text: o.label },
      { role: "assistant", text: list.length ? "Готово, так подходит:" : "Всё ещё ничего не нашёл." + (more.length ? " Можно убрать ещё одно условие:" : ""),
        results: toStoredResults(list), ...(more.length ? { options: more } : {}) },
    ], c);
  }, [ask, push, found]);

  const adjust = useCallback((c: Conditions, label: string) => {
    stop();
    const list = found(c);
    const more = list.length ? [] : relaxOptions(c, stateRef.current.preferences);
    push([
      { role: "user", text: label },
      { role: "assistant", text: list.length ? "Учёл — вот что подходит:" : "Так ничего не находится." + (more.length ? " Можно убрать ещё одно условие:" : ""),
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
      { role: "assistant", text: list.length ? intro : "Под это пока ничего нет. Попробуйте по-другому — например, назовите продукты.", results: toStoredResults(list),
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
