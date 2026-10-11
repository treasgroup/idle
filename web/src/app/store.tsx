// App state: the engine's state (kept on the device and synced through the anonymous account),
// the person's profile, the catalog and the server's capabilities.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CATALOG_EVENT, DEFAULT_STATE, type EngineState, apiUrl, initNativeBridge, isNativeApp, loadCatalog, loadIntentModel, loadState,
  recipes, saveState, setTasteScorer, tasteScorer, track, deviceSource, useAccountSync, type SyncApi,
} from "../engine";
import { loadProfile, saveProfile, type Profile } from "./profile";

export interface CatalogStatus { version: number; source: string; problem?: string; count: number }
export interface Server { aiReady: boolean; voiceReady: boolean }

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
  toast: (msg: string) => void;
  message: string;
  /** Starts the server session the AI and speech routes need (once). */
  ensureSession: () => Promise<void>;
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
  const [message, setMessage] = useState("");
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
  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.clearTimeout(toastTimer.current);
    if (msg) toastTimer.current = window.setTimeout(() => setMessage(""), 4200);
  }, []);
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
      .then((loaded) => { setS(loaded); setReady(true); })
      .catch(() => { saveBroken.current = true; setReady(true); toast("Браузер не разрешил сохранения. Эта сессия работает без них."); });
    loadCatalog(4000, true).then((res) => {
      setCatalog({ version: Date.now(), source: res.source, problem: res.problem, count: recipes().length });
    });
    const onLate = () => setCatalog((c) => ({ ...c, version: Date.now(), source: "server", problem: undefined, count: recipes().length }));
    window.addEventListener(CATALOG_EVENT, onLate);
    fetch(apiUrl("status")).then((r) => r.json()).then((j) => setServer({ aiReady: !!j.aiReady, voiceReady: !!j.voiceReady })).catch(() => {});
    void loadIntentModel();
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
  useEffect(() => { setTasteScorer(tasteScorer(s.taste)); }, [s.taste, catalog.version]);
  useEffect(() => { document.documentElement.classList.toggle("large-text", s.largeText); }, [s.largeText]);

  const sync = useAccountSync(s, ready, online, update);

  const value = useMemo<Store>(() => ({ s, update, ready, profile, setProfile, catalog, server, online, sync, toast, message, ensureSession }),
    [s, update, ready, profile, setProfile, catalog, server, online, sync, toast, message, ensureSession]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
