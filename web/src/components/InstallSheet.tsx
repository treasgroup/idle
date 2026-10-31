// Профиль → «Приложение на телефон»: the app from a store (RuStore now; Google Play and App Store later, app/stores) or a
// shortcut on the home screen for those without a store — on iPhone only by hand, so it says how.
import { ChevronRight, Download, Smartphone, Share, Check } from "lucide-react";
import { STORES, platform } from "../app/stores";
import type { Pwa } from "../screens/Profile";
import { Sheet } from "./ui";

export function InstallSheet({ open, onClose, pwa }: { open: boolean; onClose: () => void; pwa: Pwa }) {
  const where = platform();
  const stores = STORES.filter((s) => s.on.includes(where));
  const row = "flex min-h-[72px] w-full items-center gap-3 rounded-card border border-line bg-card px-4 py-3 text-left hover:border-line-strong";
  const mark = "grid h-11 w-11 shrink-0 place-items-center rounded-full";
  return (
    <Sheet open={open} title="Приложение на телефон" onClose={onClose}>
      <div className="grid gap-2.5">
        {stores.map((s) => (
          <a key={s.id} href={s.url} target="_blank" rel="noopener" className={row} onClick={onClose}>
            <span className={mark + " bg-brand-fill text-white"} aria-hidden><Download size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block text-body font-semibold">{s.title}</span><span className="mt-0.5 block text-body-sm text-ink-soft">{s.hint}</span></span>
            <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
          </a>
        ))}

        {/* The shortcut: for a phone without a store, an iPhone, a computer. */}
        {pwa.installed ? (
          <div className={row + " cursor-default hover:border-line"}>
            <span className={mark + " bg-herb-soft text-herb"} aria-hidden><Check size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block text-body font-semibold">Ярлык уже на экране</span><span className="mt-0.5 block text-body-sm text-ink-soft">Открывайте «Что приготовить?» с рабочего стола</span></span>
          </div>
        ) : where === "ios" ? (
          <div className={row + " cursor-default hover:border-line"}>
            <span className={mark + " bg-sunken text-ink"} aria-hidden><Share size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block text-body font-semibold">Ярлык на экран «Домой»</span><span className="mt-0.5 block text-body-sm text-ink-soft">В Safari нажмите «Поделиться», затем «На экран „Домой“». Откроется как приложение.</span></span>
          </div>
        ) : (
          <button className={row} onClick={() => { if (pwa.canInstall) void pwa.install().then((ok) => { if (ok) onClose(); }); }} disabled={!pwa.canInstall}>
            <span className={mark + " bg-sunken text-ink"} aria-hidden><Smartphone size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold">Ярлык на рабочий стол</span>
              <span className="mt-0.5 block text-body-sm text-ink-soft">{pwa.canInstall ? "Без магазина приложений: значок на экране, открывается как приложение" : "В меню браузера выберите «Установить приложение» или «Добавить на главный экран»"}</span>
            </span>
            {pwa.canInstall && <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />}
          </button>
        )}
      </div>
    </Sheet>
  );
}
