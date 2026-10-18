// «Вышла новая версия — обновить»: when the site has been updated while it stays open (an app left in the
// background for days), offer a reload instead of running the old version. Compares the main script's name.
import { useEffect } from "react";
import { isNativeApp } from "../engine";

const current = () => (document.querySelector('script[type="module"][src*="assets/app-"]') as HTMLScriptElement | null)?.src.match(/assets\/app-[\w-]+\.js/)?.[0] ?? null;

export function useUpdateCheck(toast: (msg: string, action?: { label: string; run: () => void }) => void): void {
  useEffect(() => {
    const mine = current();
    // The Android app carries its own copy of the site: it is updated with the app, not by a reload.
    if (!mine || import.meta.env.DEV || isNativeApp()) return;
    let told = false, last = 0;
    const check = async () => {
      if (told || document.visibilityState !== "visible" || !navigator.onLine || Date.now() - last < 10 * 60e3) return;
      last = Date.now();
      try {
        const html = await fetch("./", { cache: "no-store", credentials: "same-origin" }).then((r) => (r.ok ? r.text() : ""));
        const fresh = html.match(/assets\/app-[\w-]+\.js/)?.[0];
        if (fresh && fresh !== mine) { told = true; toast("Вышла новая версия сайта", { label: "Обновить", run: () => location.reload() }); }
      } catch { /* offline */ }
    };
    const first = window.setTimeout(check, 60e3);
    const every = window.setInterval(check, 30 * 60e3);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearTimeout(first); window.clearInterval(every); document.removeEventListener("visibilitychange", check); };
  }, [toast]);
}
