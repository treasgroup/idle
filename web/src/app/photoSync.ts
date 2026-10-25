// The profile's photo travels with the account on its own (server: profile.photo), not inside the personal document:
// the diary and the settings are sent often, the photo only when it changes. The settings carry just its time
// (profile.photoAt); a device that sees a newer time than its own photo fetches it.
import { useEffect } from "react";
import { apiUrl } from "../engine";
import { useStore } from "./store";

const MINE = "cook-photo-mine"; // the time of the photo this device set itself
const HAVE = "cook-photo-synced"; // the time of the photo this device has and the account agrees on
const get = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const put = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* private mode */ } };

async function upload(photo: string | undefined, at: number): Promise<void> {
  const r = await fetch(apiUrl("profile.photo"), { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ photo: photo ?? null, at }) });
  if (r.ok) put(HAVE, at);
}
/** PhotoSheet: a new photo (or none) — sent now; if offline, again on the next start. */
export function photoChanged(photo: string | undefined, at: number): void {
  put(MINE, at);
  void upload(photo, at).catch(() => {});
}

export function usePhotoSync(): void {
  const { profile, setProfile, sync } = useStore();
  const ready = sync.status.state === "ready";
  const at = profile.photoAt ?? 0;
  // A photo set before it travelled apart has no time yet: it gets one now, and so goes to the account.
  useEffect(() => {
    if (!ready || at || !profile.photo) return;
    const now = Date.now();
    put(MINE, now);
    setProfile((p) => ({ ...p, photoAt: now }));
  }, [ready, at, profile.photo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready || !at || get(HAVE) === at) return;
    // This device made the change: send it (it did not get through before).
    if (get(MINE) === at) { void upload(profile.photo, at).catch(() => {}); return; }
    // Another device of the same person did: fetch the photo of that time.
    void fetch(apiUrl("profile.photo"), { credentials: "same-origin" }).then((r) => r.json()).then((j: { photo?: string | null; at?: number }) => {
      if (j.at !== at) return;
      setProfile((p) => ({ ...p, photo: j.photo ?? undefined }));
      put(HAVE, at);
    }).catch(() => {});
  }, [ready, at]); // eslint-disable-line react-hooks/exhaustive-deps
}
