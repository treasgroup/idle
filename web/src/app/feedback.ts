// Sounds and vibration: short, quiet signals made by the browser itself (no sound files). A sound only where the
// eyes are off the screen — at the stove, speaking, pointing the camera (see app/sounds); where the screen already
// shows what happened (a swipe, «Сохранено», a toast) a light buzz is enough. On Android the web's sounds follow the
// media volume, not the silent mode, so a sound in a shop or on a quiet evening must earn its place.
// «Звуки и вибрация» in the profile turns them off; the timer's alarm stays on regardless — it matters at the stove.
import { loadProfile } from "./profile";
import { SOUNDS, type Sound } from "./sounds";

/** Felt, not heard: seen on the screen anyway, and often many times in a row. The rest: see app/sounds. */
type Quiet = "tap" | "save" | "list" | "bought" | "error" | "like" | "skip";
export type Cue = Quiet | Exclude<Sound, "alarm">;

let ctx: AudioContext | null = null;
export function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** The last question to Шеф was spoken: its answer gets a sound (a written one is being watched anyway). */
let spoken = false;
export function askedByVoice(v?: boolean): boolean { if (v !== undefined) spoken = v; return spoken; }

const BUZZ: Record<Cue, number | number[]> = {
  tap: 10, save: [12, 50, 18], list: 12, bought: [15, 50, 15, 50, 30], wind: [6, 40, 6, 40, 6], page: 8,
  done: [30, 70, 30, 70, 80], message: 0, listen: 25, stop: 15, scan: 30, error: [40, 60, 40], like: [12, 40, 18], skip: 10,
};

export function soundsOn(): boolean { return loadProfile().sounds; }

export function cue(kind: Cue): void {
  if (!soundsOn()) return;
  const b = BUZZ[kind];
  if (b) try { navigator.vibrate?.(b); } catch { /* not allowed */ }
  const play = kind in SOUNDS ? SOUNDS[kind as Sound] : null;
  if (!play || document.visibilityState !== "visible") return;
  const a = audio();
  if (a) try { play(a); } catch { /* no audio */ }
}
