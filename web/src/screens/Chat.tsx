// The conversation with Шеф (#/chat): full screen on phones, a centred column next to the sidebar on desktop.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, SquarePen, Timer, Sparkles, MessageCircle, GraduationCap } from "lucide-react";
import { cleanMessage, parseMessage, type ChatOption } from "../engine";
import { useStore } from "../app/store";
import { useAssistant } from "../app/assistant";
import { CONTINUES_TOPIC } from "../app/chatText";
import { FOCUS_COMPOSER, takeFocusRequest } from "../app/chatNav";
import { close, routeHash } from "../app/router";
import { minutesIn, startTimer } from "../app/timers";
import { Composer } from "../components/Composer";
import { TimerStrip } from "../components/TimerStrip";
import { ConditionBar, Message, MoodTiles, PantryPicker, SuggestionCards, Typing, useSuggestions } from "../components/ChatParts";
import { ChefAvatar, cx, useScrolled } from "../components/ui";

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

  const send = (text: string, opts: { voice?: boolean; shown?: string; source?: string } = {}) => {
    const reset = has && newTopic(text, a.base());
    void a.ask(text, { ...opts, reset });
  };
  const onOption = (o: ChatOption) => (o.action === "pantry" ? setPicker(true) : a.choose(o));
  const suggestions = useSuggestions((t) => send(t), () => fromPantry());
  const fromPantry = () => {
    if (!s.fridge.length) return setPicker(true);
    const ids = s.fridge.map((f) => f.id);
    a.show("Из того, что дома", { ...a.base(), servings: s.conditions.servings, available: ids, strictPantry: ids.length >= 4 }, "Вот что приготовить из того, что есть:");
  };
  const back = () => close(routeHash({ tab: "home" }));

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className={cx("pt-safe sticky top-0 z-30 border-b bg-paper/95 backdrop-blur transition-colors", scrolled ? "border-line" : "border-transparent")}>
        <div className="mx-auto flex h-14 max-w-chat items-center gap-1 px-2 sm:px-4">
          <button className="icon-btn lg:hidden" onClick={back} aria-label="Назад"><ArrowLeft size={22} /></button>
          <span className="flex flex-1 items-center gap-2.5 pl-1">
            <ChefAvatar size={32} />
            <span className="leading-tight">
              <span className="block font-serif text-[1.125rem] font-semibold">Шеф</span>
              <span className="block text-caption text-ink-soft">{a.busy ? "подбирает…" : "кулинарный помощник"}</span>
            </span>
          </span>
          {has && <button className="btn-ghost h-10 px-3" onClick={() => { a.newChat(); setFocusKey((k) => k + 1); }}><SquarePen size={18} />Новый</button>}
        </div>
        <div className="mx-auto max-w-chat px-4"><TimerStrip className="pb-2" /></div>
      </header>

      <div className="mx-auto w-full max-w-chat flex-1 px-4" style={{ paddingBottom: "calc(var(--dock) + 24px)" }}>
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

      <div ref={dock} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 shadow-e2 backdrop-blur sm:left-20 lg:left-64">
        <div className="mx-auto max-w-chat px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
          <ConditionBar />
          <Composer variant="dock" busy={a.busy} focusKey={focusKey} onSend={(t, o) => send(t, o)}
            placeholder={has ? undefined : "Например: курица, картошка, 30 минут"} />
        </div>
      </div>
      <PantryPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}

function EmptyChat({ suggestions, send }: { suggestions: ReturnType<typeof useSuggestions>; send: (t: string, o?: { shown?: string; source?: string }) => void }) {
  return (
    <div className="anim-rise pb-6 pt-8 sm:pt-12">
      <div className="flex flex-col items-center text-center">
        <ChefAvatar size={64} />
        <h1 className="mt-4 text-h1">Спросите что угодно о еде</h1>
        <p className="mt-2 max-w-md text-body-sm text-ink-soft">Назовите продукты, время или настроение — подберу рецепт. Или задайте кухонный вопрос.</p>
      </div>
      <SuggestionCards items={suggestions} className="mt-8" />
      <h2 className="label mt-8">Под настроение</h2>
      <div className="mt-3"><MoodTiles send={(t, shown) => send(t, { shown, source: "option" })} /></div>
      <h2 className="label mt-8">Что я умею</h2>
      <ul className="mt-3 grid gap-3 text-body-sm">
        <li className="flex gap-3"><Sparkles size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />Подбираю блюда из того, что есть, под время, технику и ограничения.</li>
        <li className="flex gap-3"><MessageCircle size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />Отвечаю на вопросы: чем заменить, сколько варить, как спасти пересоленный суп.</li>
        <li className="flex gap-3"><GraduationCap size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />Помню, что вы не едите, и учусь на ваших оценках.</li>
      </ul>
    </div>
  );
}
