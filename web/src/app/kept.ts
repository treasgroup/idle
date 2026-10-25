// What the person set up and wrote down travels with the account (state.kept → the personal document), so a new phone
// and «Другое устройство» have it too: the profile (with the name, the photo, «Оформление», «Соблюдаю пост»), the
// food diary, the tables of «Стол в складчину» with the organiser's keys, and the guest's secret.
// Each device keeps its own copy for speed; this file moves changes both ways. `cook-kept-base` is what this device
// and the account last agreed on: a local change since then goes up, a change from the account comes down.
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { normalizeProfile, type Profile } from "./profile";
import { DIARY_EVENT, readDiary, replaceDiary, type Diary } from "./diary";
import { PARTIES_EVENT, guestSecret, knownParties, replaceParties, type KnownParty } from "./party";
import type { EngineState } from "../engine";

type Kept = EngineState["kept"];
const BASE_KEY = "cook-kept-base";
/** Settings of this device only: its text size, its light or dark (a phone at night, a computer by day), the dish on the stove.
 *  The photo travels on its own (app/photoSync): the settings carry only its time (photoAt). */
const DEVICE_ONLY: (keyof Profile)[] = ["textSize", "theme", "parallel", "photo"];

function sharedProfile(p: Profile): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) if (!DEVICE_ONLY.includes(k as keyof Profile)) out[k] = v;
  return out;
}
function localKept(p: Profile): Kept {
  const d = readDiary();
  return { profile: sharedProfile(p), guest: guestSecret(), diary: { entries: d.entries, ...(d.goal != null ? { goal: d.goal } : {}) }, parties: knownParties() };
}
const json = (k: Kept | undefined) => JSON.stringify(k ?? {});
const empty = (k: Kept | undefined) => !k || !k.profile;

export function useKeptSync(): void {
  const { s, update, profile, setProfile, sync } = useStore();
  const [tick, setTick] = useState(0);
  const base = useRef<string | null>(null);
  if (base.current === null) { try { base.current = localStorage.getItem(BASE_KEY) ?? ""; } catch { base.current = ""; } }
  const setBase = (v: string) => { base.current = v; try { localStorage.setItem(BASE_KEY, v); } catch { /* private mode */ } };
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener(DIARY_EVENT, on);
    window.addEventListener(PARTIES_EVENT, on);
    return () => { window.removeEventListener(DIARY_EVENT, on); window.removeEventListener(PARTIES_EVENT, on); };
  }, []);
  const ready = sync.status.state === "ready";

  useEffect(() => {
    // Only once the account has answered: a new phone must not send its empty profile over the real one.
    if (!ready) return;
    const local = localKept(profile), shared = s.kept;
    const lj = json(local), sj = json(shared), bj = base.current ?? "";
    if (lj === sj) { if (bj !== lj) setBase(lj); return; }
    // The first time with the account: if it already has the person's things (another phone), they come here.
    const fromAccount = bj === "" ? !empty(shared) : lj === bj && sj !== bj;
    if (fromAccount) {
      apply(shared, profile, setProfile);
      setBase(sj);
    } else {
      update((st) => ({ ...st, kept: local }));
      setBase(lj);
    }
  }, [ready, profile, s.kept, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The account's copy onto this device: the profile keeps this device's own settings. */
function apply(k: Kept, p: Profile, setProfile: (fn: (p: Profile) => Profile) => void): void {
  if (k.profile) {
    const mine: Record<string, unknown> = Object.fromEntries(DEVICE_ONLY.map((key) => [key, p[key]]));
    // An account written before the photo travelled apart still has it inside: a device without one takes it.
    if (!p.photo && typeof k.profile.photo === "string") mine.photo = k.profile.photo;
    setProfile(() => normalizeProfile({ ...k.profile, ...mine }));
  }
  if (k.diary) replaceDiary(k.diary as Diary);
  if (k.parties) replaceParties(k.parties as KnownParty[], k.guest);
}
