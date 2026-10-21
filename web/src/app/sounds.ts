// The kitchen's sounds, made by the browser itself (no sound files): each one is a thing heard in a real kitchen,
// so it says what happened without looking — a desk bell when the dish is ready, a wind-up timer's ring, a page
// turning to the next step, a pencil on the shopping list, a store scanner's beep. Quiet, short, never shrill.
// Built from three simple pieces: struck tones (wood, bell), filtered noise (paper, pencil), and a pitch drop (water).

type A = AudioContext;

/** A struck tone: several partials, each fading on its own (`ratios` × `f`, `amps`, `decays` in seconds). */
function strike(a: A, f: number, at: number, vol: number, ratios: number[], amps: number[], decays: number[], out: AudioNode = a.destination) {
  const t = a.currentTime + 0.01 + at;
  ratios.forEach((r, k) => {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = f * r;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * amps[k], t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decays[k]);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + decays[k] + 0.02);
  });
}

/** A wooden bar (marimba): warm, round, short. */
const wood = (a: A, f: number, at: number, vol: number) => strike(a, f, at, vol, [1, 3.93, 9.2], [1, 0.22, 0.05], [0.42, 0.09, 0.03]);
/** A small metal bell (the desk bell on a restaurant's pass, a kitchen timer's bell). */
const bell = (a: A, f: number, at: number, vol: number, len = 1.6) =>
  strike(a, f, at, vol, [1, 2.32, 4.25, 6.63], [1, 0.45, 0.22, 0.1], [len, len * 0.55, len * 0.3, len * 0.18]);

let white: AudioBuffer | null = null;
/** A breath of filtered noise: paper, a pencil, a swish. Band `f0`→`f1` Hz over `len` seconds. */
function hiss(a: A, at: number, len: number, vol: number, f0: number, f1: number, q = 1.2, rise = 0.35) {
  if (!white || white.sampleRate !== a.sampleRate) {
    white = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = white.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + 0.01 + at;
  const s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  s.buffer = white;
  bp.type = "bandpass"; bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + len);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + len * rise);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(bp); bp.connect(g); g.connect(a.destination);
  s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
}

/** A drop of water: a short pitch rise, like a bubble on the surface. */
function drop(a: A, at: number, vol: number, f = 700) {
  const t = a.currentTime + 0.01 + at, o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.1, t + 0.07);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.14);
}

/** A plain electronic beep (a store's barcode scanner). */
function beepTone(a: A, f: number, at: number, len: number, vol: number) {
  const t = a.currentTime + 0.01 + at, o = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain();
  o.type = "square"; o.frequency.value = f;
  lp.type = "lowpass"; lp.frequency.value = 3200;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.setValueAtTime(vol, t + len - 0.015); g.gain.linearRampToValueAtTime(0, t + len);
  o.connect(lp); lp.connect(g); g.connect(a.destination); o.start(t); o.stop(t + len + 0.01);
}

/** A tick of a wind-up timer's dial: a tiny click of wood and plastic. */
const tick = (a: A, at: number, vol: number) => { hiss(a, at, 0.02, vol * 3, 3200, 2600, 4, 0.1); strike(a, 1900, at, vol * 0.35, [1], [1], [0.025]); };

export const SOUNDS = {
  /** Saved to favourites, a recipe kept in the family book: two soft wooden notes up. */
  save: (a: A) => { wood(a, 784, 0, 0.16); wood(a, 1175, 0.085, 0.13); },
  /** Added to the shopping list: a pencil writes a line. */
  list: (a: A) => { hiss(a, 0, 0.08, 0.32, 4200, 5200, 2.2); hiss(a, 0.1, 0.12, 0.28, 4600, 3800, 2.2); },
  /** The last item on the list is bought: a light chord of wood, the bag is full. */
  bought: (a: A) => { wood(a, 659, 0, 0.13); wood(a, 831, 0.07, 0.12); wood(a, 988, 0.14, 0.12); wood(a, 1319, 0.22, 0.1); },
  /** A timer starts: the dial is wound — a few quick ticks. */
  wind: (a: A) => { for (let k = 0; k < 6; k++) tick(a, k * 0.045, 0.16 - k * 0.012); },
  /** The next or previous step: a page of the recipe turns. */
  page: (a: A) => hiss(a, 0, 0.2, 0.2, 1400, 4200, 0.9, 0.45),
  /** The dish is cooked: the desk bell on the pass, «заказ готов» — two strikes. */
  done: (a: A) => { bell(a, 2093, 0, 0.14, 1.8); bell(a, 2093, 0.32, 0.12, 1.8); },
  /** A reply from the chef: a bubble rises in the pot. */
  message: (a: A) => { drop(a, 0, 0.09, 620); drop(a, 0.09, 0.06, 820); },
  /** The microphone opens and closes: a soft wooden note up, then down. */
  listen: (a: A) => { wood(a, 880, 0, 0.12); wood(a, 1319, 0.07, 0.1); },
  stop: (a: A) => { wood(a, 1175, 0, 0.1); wood(a, 784, 0.07, 0.1); },
  /** A barcode is read: the store scanner's beep. */
  scan: (a: A) => beepTone(a, 1850, 0, 0.09, 0.05),
  /** Something did not work: a low, muted knock twice — not a buzzer. */
  error: (a: A) => { wood(a, 196, 0, 0.15); wood(a, 175, 0.13, 0.14); },
  /** The deck: «Хочу» — a bubble pops up; «Не то» — the card swishes aside. */
  like: (a: A) => { drop(a, 0, 0.08, 760); wood(a, 1568, 0.05, 0.05); },
  skip: (a: A) => hiss(a, 0, 0.2, 0.18, 2600, 900, 0.8, 0.3),
  /** A timer has run out: a wind-up kitchen timer's bell, a hammer ringing it fast for a second, twice. */
  alarm: (a: A) => {
    for (const start of [0, 1.35]) for (let k = 0; k < 15; k++) bell(a, 2349, start + k * 0.066, 0.2, 0.35);
  },
} satisfies Record<string, (a: A) => void>;

export type Sound = keyof typeof SOUNDS;
