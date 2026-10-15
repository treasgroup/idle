// The conversation with Шеф (#/chat): full screen on phones, a centred column next to the sidebar on desktop.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SquarePen, Timer, MessageCircle, History, X } from "lucide-react";
import { cleanMessage, parseMessage, type ChatOption } from "../engine";
import { useStore } from "../app/store";
import { useAssistant } from "../app/assistant";
import { CONTINUES_TOPIC } from "../app/chatText";
import { FOCUS_COMPOSER, takeFocusRequest } from "../app/chatNav";
import { minutesIn, startTimer } from "../app/timers";
import { Composer } from "../components/Composer";
import { TimerStrip } from "../components/TimerStrip";
import { ConditionBar, Message, PantryPicker, SuggestionCards, Typing, useSuggestions } from "../components/ChatParts";
import { ChefAvatar, Chip, Sheet, cx, useScrolled } from "../components/ui";
import { removeChat, useChats } from "../app/chats";
import { cue } from "../app/feedback";

/** A message that names new food or a new mood, and does not continue the topic ("а без лука?"), starts over. */
function newTopic(text: string, base: Parameters<typeof parseMessage>[1]): boolean {
  if (CONTINUES_TOPIC.test(text.trim())) return false;
  const p = parseMessage(cleanMessage(text), base) as Record<string, unknown>;
  return !!((p.moodChanged && p.mood) || (Array.isArray(p.desiredAdd) && p.desiredAdd.length));
}

export function Chat() {
  const { s, toast } = useStore();
  const a = useAssistant();
  const [picker, setPicker] = useState(false);
  const [focusKey, setFocusKey] = useState(() => (takeFocusRequest() ? 1 : 0));
  const dock = useRef<HTMLDivElement>(null);
  const last = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled();
  const msgs = s.conversation;
  const has = msgs.length > 0;

  useEffect(() => {
    const on = () => setFocusKey((k) => k + 1);
    window.addEventListener(FOCUS_COMPOSER, on);
    return () => window.removeEventListener(FOCUS_COMPOSER, on);
  }, []);

  // --dock: the height of the box at the bottom, so the thread and toasts stay above it.
  useLayoutEffect(() => {
    const el = dock.current;
    if (!el) return;
    const root = document.documentElement.style;
    const set = () => root.setProperty("--dock", el.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); root.setProperty("--dock", "0px"); };
  }, []);

  // A new reply scrolls so that its top is under the header; the person's own message and "typing" go to the bottom.
  const lastRole = msgs[msgs.length - 1]?.role;
  useEffect(() => {
    if (!has) return;
    if (lastRole === "assistant" && !a.busy) last.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [msgs.length, a.busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (has && lastRole === "assistant") last.current?.scrollIntoView({ block: "start" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A soft «pop» when Шеф answers (not for the conversation that was already there).
  const heard = useRef(msgs.length);
  useEffect(() => {
    if (msgs.length > heard.current && lastRole === "assistant") cue("message");
    heard.current = msgs.length;
  }, [msgs.length, lastRole]);

  const send = (text: string, opts: { voice?: boolean; shown?: string; source?: string } = {}) => {
    const reset = has && newTopic(text, a.base());
    void a.ask(text, { ...opts, reset });
  };
  const onOption = (o: ChatOption) => (o.action === "pantry" ? setPicker(true) : a.choose(o));
  const suggestions = useSuggestions((t) => send(t), () => fromPantry());
  const fromPantry = () => {
    if (!s.fridge.length) return setPicker(true);
    const ids = s.fridge.map((f) => f.id);
    a.show("Из того, что дома", { ...a.base(), servings: s.conditions.servings, available: ids, strictPantry: ids.length >= 4 }, "Из того, что есть, можно приготовить:");
  };
  const chats = useChats();
  const [history, setHistory] = useState(false);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className={cx("pt-safe sticky top-0 z-30 border-b bg-paper/95 backdrop-blur transition-colors", scrolled ? "border-line" : "border-transparent")}>
        <div className="mx-auto flex h-14 max-w-chat items-center gap-1 px-2 sm:px-4">
          <span className="flex flex-1 items-center gap-2.5 pl-2">
            <ChefAvatar size={36} />
            <span className="leading-tight">
              <span className="block text-title">Шеф</span>
              <span className="block text-caption text-ink-soft">{a.busy ? "подбирает…" : "ваш помощник"}</span>
            </span>
          </span>
          {chats.length > 0 && <button className="inline-flex h-10 items-center gap-1.5 rounded-full bg-sunken px-3 text-small font-medium hover:bg-line" onClick={() => setHistory(true)}><History size={18} aria-hidden />История</button>}
          {has && <button className="inline-flex h-10 items-center gap-1.5 rounded-full bg-sunken px-3 text-small font-medium hover:bg-line" onClick={() => { a.newChat(); setFocusKey((k) => k + 1); }}><SquarePen size={18} aria-hidden />Новый</button>}
        </div>
        <div className="mx-auto max-w-chat px-4"><TimerStrip className="pb-2" /></div>
      </header>

      <div className="mx-auto w-full max-w-chat flex-1 px-4" style={{ paddingBottom: "calc(var(--dock) + var(--nav-h) + 24px)" }}>
        {has ? (
          <div className="space-y-5 pt-4" aria-live="polite" aria-relevant="additions">
            {msgs.map((m, i) => {
              const isLast = i === msgs.length - 1;
              const prev = msgs[i - 1];
              const mins = m.role === "assistant" && !m.results?.length && prev?.role === "user" && /сколько|как долго|минут|варить|жарить|запекать|тушить/i.test(prev.text) ? minutesIn(m.text) : null;
              return (
                <div key={i} ref={isLast ? last : undefined} className="scroll-mt-[72px]">
                  <Message m={m} last={isLast && !a.busy} onOption={onOption} />
                  {mins && (
                    <div className="mt-2 sm:pl-10">
                      <button className="btn-soft h-10" onClick={() => { startTimer({ dish: "Таймер", label: prev!.text.replace(/^(сколько|как долго|сколько минут)\s+/i, "").replace(/[?!.]+$/, "").slice(0, 30), seconds: mins * 60 }); toast("Таймер на " + mins + " мин запущен"); }}>
                        <Timer size={18} />Таймер на {mins} мин
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {a.busy && <Typing />}
          </div>
        ) : (
          <EmptyChat suggestions={suggestions} send={send} />
        )}
      </div>

      <div ref={dock} className="fixed inset-x-0 z-30 border-t border-line bg-paper/95 backdrop-blur sm:left-20 lg:left-64" style={{ bottom: "var(--nav-h)" }}>
        <div className="mx-auto max-w-chat px-4 pb-3 pt-2">
          <ConditionBar />
          <Composer variant="dock" busy={a.busy} focusKey={focusKey} onSend={(t, o) => send(t, o)}
            placeholder={has ? undefined : "Например: курица и картошка"} />
        </div>
      </div>
      <PantryPicker open={picker} onClose={() => setPicker(false)} />
      <Sheet open={history} title="Прошлые разговоры" onClose={() => setHistory(false)}>
        <ul className="grid gap-1.5">
          {chats.map((c) => (
            <li key={c.id} className="flex items-center rounded-input border border-line bg-card hover:border-line-strong">
              <button className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-4 text-left"
                onClick={() => { a.restore(c.id); setHistory(false); }}>
                <MessageCircle size={20} className="shrink-0 text-ink-soft" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-medium">{c.title}</span>
                  <span className="block text-caption text-ink-soft">{new Date(c.at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                </span>
              </button>
              <button className="icon-btn mr-1 shrink-0 text-ink-faint hover:text-ink" onClick={() => removeChat(c.id)} aria-label={"Удалить разговор «" + c.title + "»"}><X size={18} /></button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/** An empty conversation looks like a messenger chat: Шеф says hello and offers ready answers to tap. */
function EmptyChat({ suggestions, send }: { suggestions: ReturnType<typeof useSuggestions>; send: (t: string, o?: { shown?: string; source?: string }) => void }) {
  const fridge = useStore().s.fridge.length > 0;
  const quick = [
    ["Что-нибудь быстрое", "что-нибудь быстрое на ужин"], ["Из того, что есть", "что приготовить из того, что есть дома"],
    ["Хочу суп", "хочу суп"], ["Удиви меня", "удиви меня"],
  ];
  return (
    <div className="anim-rise space-y-4 pb-6 pt-4">
      <p className="mx-auto w-fit rounded-full bg-sunken px-3 py-1 text-caption text-ink-soft">Сегодня</p>
      <p className="max-w-[85%] rounded-[20px] rounded-bl-md border border-line bg-card px-4 py-3 text-body">
        Здравствуйте! Я Шеф — помогу выбрать, что приготовить. Скажите, что есть дома или чего хочется. Можно голосом — кнопка с микрофоном внизу.
      </p>
      <div className="flex flex-wrap gap-2">
        {quick.map(([label, text]) => <Chip key={label} className="border-brand text-brand" onClick={() => send(text, { shown: label, source: "option" })}>{label}</Chip>)}
      </div>
      <h2 className="label pt-4">Или выберите пример</h2>
      <SuggestionCards items={fridge ? [suggestions[3], suggestions[0]] : [suggestions[0], suggestions[2]]} />
    </div>
  );
}
