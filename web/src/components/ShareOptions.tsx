// Ways to send a link or a text: the phone's share sheet, messengers, copy, print. Used by the recipe, План and Покупки.
import { Link2, Printer, Send } from "lucide-react";
import { SHARE_TARGETS, canShare, copyText, shareLink } from "../engine";
import { useStore } from "../app/store";

export function ShareOptions({ text, title, url, onDone, onPrint }: { text: string; title: string; url?: string; onDone: (copied?: boolean) => void; onPrint?: () => void }) {
  const { toast } = useStore();
  return (
    <div className="grid gap-2">
      {canShare() && (
        <button className="btn-primary btn-bar" onClick={() => navigator.share({ title, text, ...(url ? { url } : {}) }).then(() => onDone()).catch(() => {})}>
          <Send size={18} />Отправить…
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        {SHARE_TARGETS.map((t) => (
          <button key={t.id} className="btn-outline" onClick={() => {
            // ВКонтакте with a link: its own «Поделиться» window (to a friend or on the wall), with the link's picture.
            if (t.id === "vk" && url) {
              window.open("https://vk.com/share.php?url=" + encodeURIComponent(url) + "&title=" + encodeURIComponent(title), "_blank", "noopener");
              return onDone();
            }
            const l = shareLink(t.id, text);
            // Copied in the same tap (a browser forgets the tap after a page opens), and said so.
            if (l.copyFirst) { void copyText(text); toast("Текст скопирован — вставьте его в сообщение"); }
            window.open(l.url, "_blank", "noopener");
            onDone();
          }}>{t.label}{t.id === "whatsapp" && "*"}</button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center">
        <button className="btn-ghost" onClick={async () => { await copyText(url ?? text); onDone(true); }}><Link2 size={18} />{url ? "Скопировать ссылку" : "Скопировать текст"}</button>
        {onPrint !== undefined && <button className="btn-ghost" onClick={() => { onPrint(); onDone(); }}><Printer size={18} />Распечатать</button>}
      </div>
      {SHARE_TARGETS.some((t) => t.id === "whatsapp") && (
        <p className="text-center text-caption text-ink-faint">*WhatsApp принадлежит компании Meta, которая признана экстремистской и запрещена на территории РФ.</p>
      )}
    </div>
  );
}
