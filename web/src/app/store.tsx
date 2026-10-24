// App state: the engine's state (kept on the device and synced through the anonymous account),
// the person's profile, the catalog and the server's capabilities.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PERSONAL_EVENT, personalScorer } from "./personal";
import { refreshWeather, weatherNow, weatherScore } from "./weather";
import { useOfflinePhotos } from "./offline";
import {
  CATALOG_EVENT, DEFAULT_STATE, type EngineState, apiUrl, clearState, initNativeBridge, isNativeApp, loadCatalog, loadIntentModel, loadState,
  recipes, saveState, setTasteScorer, tasteScorer, track, deviceSource, useAccountSync, type SyncApi,
} from "../engine";
import { applyTheme, loadProfile, saveProfile, type Profile } from "./profile";
import type { ToastMsg } from "../components/ui";

export interface CatalogStatus { version: number; source: string; problem?: string; count: number }
export interface Server { aiReady: boolean; voiceReady: boolean; telegram?: string | null; alice?: string | null }

interface Store {
  s: EngineState;
  update: (fn: (s: EngineState) => EngineState) => void;
  ready: boolean;
  profile: Profile;
  setProfile: (fn: (p: Profile) => Profile) => void;
  catalog: CatalogStatus;
  server: Server;
  online: boolean;
  sync: SyncApi;
  /** A short message at the bottom; `action` adds a button such as «Отменить». */
  toast: (msg: string, action?: ToastMsg["action"]) => void;
  message: ToastMsg | null;
  clearToast: () => void;
  /** Starts the server session the AI and speech routes need (once). */
  ensureSession: () => Promise<void>;
  /** Deletes everything: the server account, the saved state, local settings; then reloads the page. */
  wipe: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<EngineState>(() => structuredClone(DEFAULT_STATE));
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile>(loadProfile);
  const [catalog, setCatalog] = useState<CatalogStatus>({ version: 0, source: "bundled", count: recipes().length });
  const [server, setServer] = useState<Server>({ aiReady: false, voiceReady: false });
  const [online, setOnline] = useState(() => navigator.onLine);
  const [message, setMessage] = useState<ToastMsg | null>(null);
  const saveChain = useRef(Promise.resolve());
  const saveBroken = useRef(false);
  const sessionReady = useRef(false);
  const toastTimer = useRef(0);

  const update = useCallback((fn: (s: EngineState) => EngineState) => setS((prev) => fn(prev)), []);
  const setProfile = useCallback((fn: (p: Profile) => Profile) => setProfileState((prev) => {
    const next = fn(prev);
    saveProfile(next);
    return next;
  }), []);
  const toast = useCallback((msg: string, action?: ToastMsg["action"]) => {
    setMessage(msg ? { text: msg, action } : null);
    window.clearTimeout(toastTimer.current);
    if (msg) toastTimer.current = window.setTimeout(() => setMessage(null), action ? 8000 : 5000);
  }, []);
  const clearToast = useCallback(() => { window.clearTimeout(toastTimer.current); setMessage(null); }, []);
  const ensureSession = useCallback(async () => {
    if (sessionReady.current) return;
    const r = await fetch(apiUrl("session"), { method: "POST" });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || "Не удалось начать сессию.");
    sessionReady.current = true;
  }, []);

  // Start: saved state, catalog, AI status, intent model, analytics.
  useEffect(() => {
    initNativeBridge();
    if (isNativeApp()) document.documentElement.classList.add("is-app");
    loadState()
      .then((loaded) => {
        setS(loaded);
        setReady(true);
        // First visit of the new design: keep the household size the person set on the old site.
        let fresh = false;
        try { fresh = !localStorage.getItem("cook-profile-v1"); } catch { /* ignore */ }
        const old = Number((loaded.preferences as { servings?: number }).servings ?? loaded.conditions.servings);
        if (fresh && Number.isInteger(old) && old >= 1 && old <= 12 && old !== 2) setProfile((p) => ({ ...p, eaters: old }));
      })
      .catch(() => { saveBroken.current = true; setReady(true); toast("Браузер не разрешил сохранения. Эта сессия работает без них."); });
    loadCatalog(4000, true).then((res) => {
      setCatalog({ version: Date.now(), source: res.source, problem: res.problem, count: recipes().length });
    });
    const onLate = () => setCatalog((c) => ({ ...c, version: Date.now(), source: "server", problem: undefined, count: recipes().length }));
    window.addEventListener(CATALOG_EVENT, onLate);
    fetch(apiUrl("status")).then((r) => r.json()).then((j) => setServer({ aiReady: !!j.aiReady, voiceReady: !!j.voiceReady, telegram: j.bots?.telegram ?? null, alice: j.bots?.alice ?? null })).catch(() => {});
    // The model that helps Шеф understand free text is not needed for the first screen: fetched when the page is idle
    // (and Шеф waits for it if asked before that).
    const later = () => void loadIntentModel();
    const idle = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const kick = () => (idle ? idle(later, { timeout: 6000 }) : window.setTimeout(later, 3000));
    if (document.readyState === "complete") kick(); else window.addEventListener("load", kick, { once: true });
    track({ type: "visit", source: deviceSource() });
    const net = () => setOnline(navigator.onLine);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      window.removeEventListener(CATALOG_EVENT, onLate);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, [toast]);

  // Save every change (in order; one failure stops further attempts and says so once).
  useEffect(() => {
    if (!ready || saveBroken.current) return;
    saveChain.current = saveChain.current.then(() => saveState(s)).catch(() => {
      saveBroken.current = true;
      toast("Не удалось сохранить изменения. Проверьте свободное место в браузере.");
    });
  }, [s, ready, toast]);

  // The taste profile nudges the ranking of every list.
  // The engine's taste score plus what was learnt quietly on this device (app/personal), the moment and variety.
  const [learnt, setLearnt] = useState(0);
  useEffect(() => { const on = () => setLearnt((n) => n + 1); window.addEventListener(PERSONAL_EVENT, on); void refreshWeather(); return () => window.removeEventListener(PERSONAL_EVENT, on); }, []);
  useEffect(() => {
    // The weather counts only when it is turned on in the profile (weatherNow is null otherwise).
    const base = tasteScorer(s.taste), mine = personalScorer(s.book), w = weatherNow();
    setTasteScorer((r) => base(r) + mine(r) + weatherScore(r, w));
  }, [s.taste, s.book, catalog.version, learnt]);
  // Text size: the profile's three steps; the synced «large text» flag from older versions counts as «large».
  const size = profile.textSize !== "m" ? profile.textSize : s.largeText || profile.simple ? "l" : "m";
  useEffect(() => {
    const c = document.documentElement.classList;
    c.toggle("large-text", size === "l");
    c.toggle("xl-text", size === "xl");
    c.toggle("simple-mode", profile.simple);
  }, [size, profile.simple]);
  useEffect(() => applyTheme(profile.theme, profile.palette), [profile.theme, profile.palette]);

  const sync = useAccountSync(s, ready, online, update);
  // Photos of the plan, Избранное and the last cooked dishes kept ahead for use without internet (app/offline).
  useOfflinePhotos(s, ready && catalog.version > 0);
  const wipe = useCallback(async () => {
    // Stop saving first, so the state is not written back after it is cleared.
    saveBroken.current = true;
    await saveChain.current.catch(() => {});
    try { await sync.remove(); } catch { /* offline: the device data is still removed */ }
    await clearState().catch(() => {});
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
    location.href = location.pathname;
  }, [sync]);

  const value = useMemo<Store>(() => ({ s, update, ready, profile, setProfile, catalog, server, online, sync, toast, message, clearToast, ensureSession, wipe }),
    [s, update, ready, profile, setProfile, catalog, server, online, sync, toast, message, clearToast, ensureSession, wipe]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
