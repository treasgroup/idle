// Sounds and vibration: short, quiet signals made by the browser itself (no sound files). Each event has its own
// sound and its own buzz, so a glance away from the screen still tells what happened. «Звуки и вибрация» in the
// profile turns them off; the timer's alarm stays on regardless — it matters at the stove.
import { loadProfile } from "./profile";

export type Cue = "tap" | "step" | "success" | "done" | "listen" | "stop" | "message" | "error" | "like" | "skip";

let ctx: AudioContext | null = null;
export function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** One soft note: frequency glide from `f` to `to`, starting `at` seconds from now. */
function note(a: AudioContext, f: number, at: number, len: number, vol = 0.12, to = f, type: OscillatorType = "sine") {
  const t = a.currentTime + 0.02 + at, o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to !== f) o.frequency.exponentialRampToValueAtTime(to, t + len);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t + len);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + len + 0.02);
}

const SOUND: Record<Cue, ((a: AudioContext) => void) | null> = {
  tap: null, // a light tap is felt, not heard
  step: (a) => note(a, 1320, 0, 0.05, 0.06, 1180),
  success: (a) => { note(a, 660, 0, 0.09, 0.1); note(a, 990, 0.08, 0.14, 0.1); },
  done: (a) => [523, 659, 784, 1047].forEach((f, i) => note(a, f, i * 0.11, i === 3 ? 0.5 : 0.18, 0.12)),
  listen: (a) => note(a, 520, 0, 0.12, 0.1, 880),
  stop: (a) => note(a, 760, 0, 0.12, 0.08, 480),
  message: (a) => note(a, 880, 0, 0.07, 0.07, 700),
  error: (a) => { note(a, 300, 0, 0.12, 0.09, 260, "triangle"); note(a, 260, 0.14, 0.16, 0.09, 220, "triangle"); },
  // The deck: a bright little «pop» up for «Хочу», a soft swish down for «Не то».
  like: (a) => { note(a, 740, 0, 0.07, 0.07, 1100); note(a, 1180, 0.05, 0.09, 0.05); },
  skip: (a) => note(a, 520, 0, 0.09, 0.045, 300, "triangle"),
};

const BUZZ: Record<Cue, number | number[]> = {
  tap: 10, step: 15, success: [15, 50, 25], done: [30, 70, 30, 70, 80], listen: 25, stop: 15, message: 0, error: [40, 60, 40], like: [12, 40, 18], skip: 10,
};

export function soundsOn(): boolean { return loadProfile().sounds; }

export function cue(kind: Cue): void {
  if (!soundsOn()) return;
  const b = BUZZ[kind];
  if (b) try { navigator.vibrate?.(b); } catch { /* not allowed */ }
  const play = SOUND[kind];
  if (!play || document.visibilityState !== "visible") return;
  const a = audio();
  if (a) try { play(a); } catch { /* no audio */ }
}
