// The message box for Шеф: grows with the text, sends on Enter, a microphone when empty.
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { useVoiceInput } from "../engine";
import { useStore } from "../app/store";
import { cx } from "./ui";

const HERO_HINTS = ["Курица и картошка", "Мне грустно — хочу уютного", "Сколько варить яйца?", "Ужин без духовки на 4 человек", "Что приготовить из фарша?"];

export function Composer({ variant, onSend, busy, autoFocus, placeholder, focusKey }: {
  variant: "hero" | "dock";
  onSend: (text: string, opts: { voice?: boolean }) => void;
  busy?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** Changing it moves the focus into the box (the "Спросить Шефа" pill). */
  focusKey?: number;
}) {
  const { server, online, ensureSession, toast } = useStore();
  const [text, setText] = useState("");
  const [hint, setHint] = useState(0);
  const [focused, setFocused] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceInput((t) => onSend(t, { voice: true }), toast, ensureSession, server.voiceReady && online);
  const listening = voice.state === "recording" || voice.state === "transcribing";

  // Rotating examples in the big box, paused while typing or for people who prefer less motion.
  useEffect(() => {
    if (variant !== "hero" || focused || text || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setHint((h) => (h + 1) % HERO_HINTS.length), 3500);
    return () => clearInterval(t);
  }, [variant, focused, text]);

  // Auto-grow up to 6 lines.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 6 * 24 + 24) + "px";
  }, [text, voice.interim]);

  useEffect(() => { if (autoFocus || focusKey) area.current?.focus({ preventScroll: true }); }, [autoFocus, focusKey]);

  // «/» anywhere on the page (outside fields) jumps into the box, as in chat apps.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || el?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      e.preventDefault();
      area.current?.focus();
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, []);

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    onSend(t, {});
  };
  const mic = () => {
    if (!online) return toast("Для голосового ввода нужен интернет — напишите текстом.");
    if (!voice.available) return toast("В этом браузере голосовой ввод не работает. Откройте сайт в Chrome или Safari — или напишите текстом.");
    navigator.vibrate?.(20);
    voice.start();
  };

  const hero = variant === "hero";
  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }}
      className={cx("flex items-end gap-2 rounded-composer border bg-card p-2 pl-4 transition-shadow duration-150 focus-within:ring-2 focus-within:ring-brand/30",
        hero ? "min-h-[64px] border-line shadow-e2" : "min-h-14 border-line shadow-e1")}>
      <textarea
        ref={area}
        rows={1}
        value={listening ? voice.interim || (voice.state === "transcribing" ? "Распознаю…" : "Слушаю…") : text}
        readOnly={listening}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
        placeholder={placeholder ?? (hero ? HERO_HINTS[hint] : "Напишите или скажите…")}
        aria-label="Спросите Шефа"
        {...{ enterkeyhint: "send" }}
        className={cx("min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-body text-ink outline-none placeholder:text-ink-faint", hero && "sm:text-title sm:font-normal")}
      />
      {listening ? (
        <button type="button" className="listening grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-fill text-white" onClick={voice.stop} aria-label="Остановить запись"><Square size={18} /></button>
      ) : text.trim() ? (
        <button type="submit" disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-fill text-white transition-transform active:scale-95 disabled:opacity-50" aria-label="Отправить"><ArrowUp size={20} strokeWidth={2.25} /></button>
      ) : (
        <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-fill text-white transition-transform active:scale-95" onClick={mic} aria-label="Сказать голосом"><Mic size={22} /></button>
      )}
    </form>
  );
}
