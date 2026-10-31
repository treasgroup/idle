// Once, when there is something worth keeping (saved dishes, family recipes, what was cooked): a short offer to
// keep the restore code — everything lives on this phone, and without the code a new phone starts empty.
import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { canShare, copyText, siteBase } from "../engine";
import { useStore } from "../app/store";

const KEY = "cook-backup-offer";
const seen = () => { try { return !!localStorage.getItem(KEY); } catch { return true; } };
const done = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } };

export function BackupCard() {
  const { s, sync, toast, online } = useStore();
  const [hidden, setHidden] = useState(seen);
  const worth = s.favorites.length >= 3 || (s.myRecipes?.length ?? 0) > 0 || new Set(s.book.map((b) => b.recipeId)).size >= 3;
  if (hidden || !worth || !online) return null;
  const close = () => { done(); setHidden(true); };
  const keep = async () => {
    try {
      const code = await sync.code();
      const text = "Код для «Шефли»: " + code.replace(/(\d{4})(?=\d)/g, "$1 ") + ". На новом телефоне: Профиль → Другое устройство → «Это новое устройство» и ввести код. Или открыть ссылку: " + siteBase() + "#login=" + code;
      if (canShare()) { try { await navigator.share({ title: "Код восстановления", text }); close(); return; } catch (e) { if ((e as Error).name === "AbortError") return; } }
      toast((await copyText(text)) ? "Код скопирован — сохраните его себе в заметки или в избранное мессенджера" : "Код: " + code);
      close();
    } catch (e) { toast(e instanceof Error ? e.message : "Нет связи — попробуйте позже"); }
  };
  return (
    <section className="mt-6 flex items-start gap-3 rounded-card border border-line bg-card p-4">
      <KeyRound size={20} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium">Чтобы не потерять сохранённое при смене телефона</p>
        <p className="mt-0.5 text-small text-ink-soft">Сохраните код восстановления себе в заметки или мессенджер.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-soft h-11" onClick={keep}>Сохранить код</button>
          <button className="btn-ghost h-11" onClick={close}>Не сейчас</button>
        </div>
      </div>
      <button className="icon-btn -mr-2 -mt-2 shrink-0" onClick={close} aria-label="Скрыть"><X size={18} /></button>
    </section>
  );
}
