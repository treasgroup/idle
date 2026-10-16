// Keeps the screen on: while cooking and while a timer runs anywhere in the app — a phone that goes dark
// stops the page, and a timer that cannot ring is worse than none. Released as soon as nothing needs it.
import { useEffect } from "react";

type Lock = { release: () => Promise<void> };

export function useWakeLock(on: boolean): void {
  useEffect(() => {
    if (!on) return;
    let lock: Lock | null = null, gone = false;
    const take = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<Lock> } }).wakeLock;
        if (wl && document.visibilityState === "visible") lock = await wl.request("screen");
        if (gone) await lock?.release();
      } catch { /* not allowed (battery saver, old browser) */ }
    };
    void take();
    // The browser drops the lock when the tab is hidden; take it again on return.
    const vis = () => { if (document.visibilityState === "visible") void take(); };
    document.addEventListener("visibilitychange", vis);
    return () => { gone = true; document.removeEventListener("visibilitychange", vis); lock?.release().catch(() => {}); };
  }, [on]);
}
