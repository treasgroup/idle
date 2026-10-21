// Sounds and vibration: short, quiet signals made by the browser itself (no sound files). Each event has its own
// kitchen sound (see app/sounds) and its own buzz, so a glance away from the screen still tells what happened.
// «Звуки и вибрация» in the profile turns them off; the timer's alarm stays on regardless — it matters at the stove.
import { loadProfile } from "./profile";
import { SOUNDS, type Sound } from "./sounds";

/** `tap`: a light touch, felt and not heard. The rest: see app/sounds. */
export type Cue = "tap" | Exclude<Sound, "alarm">;

let ctx: AudioContext | null = null;
export function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

const BUZZ: Record<Cue, number | number[]> = {
  tap: 10, save: [12, 50, 18], list: 12, bought: [15, 50, 15, 50, 30], wind: [6, 40, 6, 40, 6], page: 8,
  done: [30, 70, 30, 70, 80], message: 0, listen: 25, stop: 15, scan: 30, error: [40, 60, 40], like: [12, 40, 18], skip: 10,
};

export function soundsOn(): boolean { return loadProfile().sounds; }

export function cue(kind: Cue): void {
  if (!soundsOn()) return;
  const b = BUZZ[kind];
  if (b) try { navigator.vibrate?.(b); } catch { /* not allowed */ }
  const play = kind === "tap" ? null : SOUNDS[kind];
  if (!play || document.visibilityState !== "visible") return;
  const a = audio();
  if (a) try { play(a); } catch { /* no audio */ }
}
