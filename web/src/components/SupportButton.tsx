// «Поддержать автора» (the page /avtor, server/api/_private/support.php). Only on the site: the RuStore app has none
// (the store's rules on payments).
// - In Профиль: a row, always there.
// - While cooking: one card near the end of the first dish — the person has just seen what the service can do — then
//   no sooner than two weeks later. It sits above the bottom bar (the page's padding grows with it, so it never covers
//   the step) and closes with a big ✕. On Главная there is no heart any more: it read as «Избранное».
import { useEffect, useState } from "react";
import { Heart, X } from "lucide-react";
import { isNativeApp, siteBase } from "../engine";

export const supportUrl = () => siteBase() + "avtor";

const ASKED = "cook-support-asked";
const AGAIN = 14 * 864e5;
const due = (): boolean => {
  try { return Date.now() - Number(localStorage.getItem(ASKED) || 0) >= AGAIN; } catch { return false; }
};

/** `near`: the dish is on one of its last two steps. The card comes after a few seconds there, not while skipping. */
export function SupportAsk({ near, className }: { near: boolean; className?: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!near || shown || isNativeApp() || !due()) return;
    const t = window.setTimeout(() => {
      setShown(true);
      try { localStorage.setItem(ASKED, String(Date.now())); } catch { /* private mode: asked again next time */ }
    }, 4000);
    return () => window.clearTimeout(t);
  }, [near, shown]);
  const [open, setOpen] = useState(true);
  if (!shown || !open) return null;
  return (
    <div className={className} role="status">
      <div className="relative flex items-start gap-3 rounded-card border border-brand/20 bg-brand-soft py-3 pl-3 pr-12">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card text-brand"><Heart size={17} fill="currentColor" aria-hidden /></span>
        <div className="min-w-0">
          <p className="text-body-sm text-ink">Нравится так готовить? Сервис делает один человек — поддержите, если он вам помог.</p>
          {/* A new tab: the steps stay open here. */}
          <a href={supportUrl()} target="_blank" rel="noopener" className="btn-primary mt-2 inline-flex h-10 px-4 text-body-sm" onClick={() => setOpen(false)}>Поддержать</a>
        </div>
        <button className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-card" onClick={() => setOpen(false)} aria-label="Закрыть">
          <X size={22} />
        </button>
      </div>
    </div>
  );
}
