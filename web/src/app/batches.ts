// Frying in batches: «Каждую партию жарьте по 4 минуты с каждой стороны… ещё 4 партии: около 32 минут». One 32-minute
// timer cannot say when to turn the pancakes. The step timer goes side by side instead: 4 мин → «Переверните» →
// 4 мин → «Партия готова» → the next batch, «партия 2 из 4».

export interface Batches {
  /** Seconds for one side (or one whole batch when nothing is turned). */
  side: number;
  /** Turned once: two timers per batch. */
  flips: boolean;
  /** How many batches the step's whole time makes. */
  rounds: number;
}

const BATCH = /парти|очеред|остальн|оставш|кажд\p{L}* (?:сторон|раз)/iu;
const num = (a: string, b?: string) => Number((b ?? a).replace(",", "."));

/** The batch rhythm of a step, or null for an ordinary timer. */
export function batchesOf(text: string, seconds: number | undefined | null): Batches | null {
  if (!seconds || !BATCH.test(text)) return null;
  // «по 3–4 минуты с каждой стороны», «по 2 минуты с обеих сторон»: the later number, so it is not underdone.
  const sides = /по\s+(\d+(?:,\d+)?)(?:\s*[–-]\s*(\d+(?:,\d+)?))?\s*мин\p{L}*\s+(?:с\s+каждой\s+стороны|с\s+обеих\s+сторон|на\s+каждую\s+сторону)/iu.exec(text);
  // «по 6 минут на партию», «тремя очередями по 5 минут», «ещё 5 партий по 6 минут».
  const whole = sides ? null
    : /по\s+(\d+(?:,\d+)?)(?:\s*[–-]\s*(\d+(?:,\d+)?))?\s*мин\p{L}*\s+(?:на\s+(?:каждую\s+|одну\s+)?(?:партию|очередь|заход))/iu.exec(text)
      ?? /(?:парти\p{L}*|очеред\p{L}*|заход\p{L}*)\s+(?:примерно\s+|около\s+)?по\s+(\d+(?:,\d+)?)(?:\s*[–-]\s*(\d+(?:,\d+)?))?\s*мин/iu.exec(text);
  const m = sides ?? whole;
  if (!m) return null;
  const side = Math.round(num(m[1], m[2]) * 60);
  const perBatch = sides ? side * 2 : side;
  if (side < 60 || seconds < perBatch * 1.8) return null; // a single batch: the step's own timer is right
  // The step's time must be the batches and nothing else: «двумя очередями по 5 минут» in a 60-minute step that also
  // stews is not 12 batches. The count said in the text wins; without one, the time divides evenly.
  const said = COUNT.exec(text);
  const rounds = said ? (WORDS[said[1].toLowerCase()] ?? Number(said[1])) : Math.round(seconds / perBatch);
  if (!rounds || rounds < 2 || rounds > 8 || Math.abs(seconds - rounds * perBatch) > perBatch * 0.6) return null;
  return { side, flips: !!sides, rounds };
}

const WORDS: Record<string, number> = { двумя: 2, двух: 2, два: 2, две: 2, тремя: 3, трех: 3, трёх: 3, три: 3, четырьмя: 4, четырех: 4, четырёх: 4, четыре: 4, пятью: 5, пяти: 5, пять: 5 };
const COUNT = /(?<!\p{L})(\d|двумя|двух|два|две|тремя|тр[её]х|три|четырьмя|четыр[её]х|четыре|пятью|пяти|пять)\s+(?:парти|очеред|заход)/iu;

/** What the timer of phase `at` (from 0) is for, and what to say when it rings. */
export function batchPhase(b: Batches, at: number): { batch: number; second: boolean; last: boolean; label: string; ring: string } {
  const per = b.flips ? 2 : 1;
  const batch = Math.floor(at / per) + 1;
  const second = b.flips && at % 2 === 1;
  const last = at >= b.rounds * per - 1;
  const of = "партия " + batch + " из " + b.rounds;
  return {
    batch, second, last,
    label: b.flips ? of + (second ? ", вторая сторона" : ", первая сторона") : of,
    ring: b.flips && !second ? "переверните" : last ? "последняя партия готова" : "партия готова, кладите следующую",
  };
}
