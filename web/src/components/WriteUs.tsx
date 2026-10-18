// «Написать нам»: a few words to the owner about the site or the app — what to improve, what is in the way, what they
// like. Goes to the admin panel («Как идут дела» → «Сообщения от людей»). A way to answer is optional.
import { useEffect, useState } from "react";
import { apiUrl, isNativeApp } from "../engine";
import { useStore } from "../app/store";
import { Chip, Sheet } from "./ui";
import { Mascot } from "./Mascot";
import { checkReplies, markRepliesRead, rememberMessage, useMyMessages } from "../app/myMessages";

const KINDS = [
  ["idea", "Идея, что улучшить"],
  ["problem", "Что-то не так"],
  ["like", "Что нравится"],
  ["other", "Другое"],
] as const;
type Kind = (typeof KINDS)[number][0];

export function WriteUs({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { online, toast } = useStore();
  const [kind, setKind] = useState<Kind>("idea");
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const mine = useMyMessages();
  useEffect(() => { if (open) { setSent(false); void checkReplies(true); } }, [open]);
  // Answers count as read once the sheet with them has been open for a moment.
  useEffect(() => { if (!open || !mine.unread) return; const t = window.setTimeout(markRepliesRead, 1500); return () => window.clearTimeout(t); }, [open, mine.unread]);
  const answered = [...mine.list].reverse().filter((m) => m.reply).slice(0, 5);

  const send = async () => {
    if (text.trim().length < 3) return toast("Напишите хотя бы пару слов.");
    if (!online) return toast("Нет интернета. Текст останется здесь — отправьте, когда связь появится.");
    setBusy(true);
    try {
      const r = await fetch(apiUrl("message.send"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), contact: contact.trim(), kind, place: isNativeApp() ? "app" : "site" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Не получилось отправить. Попробуйте ещё раз.");
      if (j.id && j.key) rememberMessage({ id: j.id, key: j.key, text: text.trim().slice(0, 300), at: Date.now() });
      setText(""); setContact(""); setSent(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Не получилось отправить.");
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} title="Написать нам" onClose={onClose}
      footer={sent ? <button className="btn-primary w-full" onClick={onClose}>Закрыть</button>
        : <button className="btn-primary w-full" disabled={busy || text.trim().length < 3} onClick={send}>{busy ? "Отправляю…" : "Отправить"}</button>}>
      {sent ? (
        <div className="grid justify-items-center gap-3 py-6 text-center">
          <Mascot mood="happy" size={112} />
          <p className="text-h2">Спасибо!</p>
          <p className="max-w-[34ch] text-body-sm text-ink-soft">Сообщение дошло. Я читаю каждое — так сервис и становится удобнее. Ответ появится здесь же, в «Написать нам».</p>
        </div>
      ) : (
        <div className="grid gap-4 pb-1" data-private>
          {answered.length > 0 && (
            <section aria-label="Ответы на ваши сообщения" className="grid gap-2">
              {answered.map((m) => (
                <div key={m.id} className={m.read ? "rounded-card border border-line bg-card p-3" : "rounded-card border border-herb/40 bg-herb-soft p-3"}>
                  <p className="line-clamp-2 text-caption text-ink-soft">Вы: {m.text}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-body-sm"><span className="font-semibold">Ответ автора: </span>{m.reply}</p>
                </div>
              ))}
            </section>
          )}
          <p className="text-body-sm text-ink-soft">Что улучшить, что мешает или не нравится — напишите как есть. Это читает автор сервиса.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="О чём сообщение">
            {KINDS.map(([k, label]) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{label}</Chip>)}
          </div>
          <label className="grid gap-1.5">
            <span className="text-body-sm font-semibold">Сообщение</span>
            <textarea className="input min-h-[140px] py-3" value={text} maxLength={3000} onChange={(e) => setText(e.target.value)}
              placeholder={kind === "problem" ? "Например: не нашёл, где поменять число порций" : "Например: хочется больше постных рецептов"} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-body-sm font-semibold">Как вам ответить <span className="font-normal text-ink-soft">— если хотите</span></span>
            <input className="input" value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} placeholder="Почта или Telegram" autoComplete="email" />
          </label>
        </div>
      )}
    </Sheet>
  );
}
