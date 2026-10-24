// A word too many and the search found nothing: «плов узбекский» showed «Ничего не нашлось» over five plovs, «суп
// гороховый с копченостями» lost «Гороховый суп с копчёной свининой». When every word together finds less than three
// dishes, the dishes with most of the words follow. And a word being typed («сырн») puts the larger family first.
import type { Recipe } from "../engine";

const low = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const SKIP = new Set(["с", "со", "и", "в", "во", "на", "по", "из", "для", "без", "под", "как", "по-"]);
// «копченостями» and «копчёной» share «копче»: five letters are enough to meet across endings; a short word whole
// («плов», not «пло» of «пломбир»).
const stemOf = (w: string) => (w.length <= 4 ? w : w.length === 5 ? w.slice(0, 4) : w.slice(0, 5));

/** `found`: what the plain search gave; `pool`: the recipes in their usual order. */
export function widen(query: string, found: Recipe[], pool: Recipe[]): { list: Recipe[]; near: boolean } {
  const words = low(query).split(/[^a-zа-я0-9-]+/).filter((w) => w.length >= 3 && !SKIP.has(w));
  if (words.length < 2 || found.length >= 3) return { list: found, near: false };
  // «по-киевски» is «киевски» («по-» met «по-китайски»).
  const stems = words.map((w) => stemOf(w.replace(/^по-/, "")));
  const titles = pool.map((r) => low(r.title));
  // A rare word says more: «наполеон» (one title) outweighs «классический» (six) and «торт» (forty).
  const weight = stems.map((s) => { const n = titles.filter((t) => t.includes(s)).length; return n ? 1 / n : 0; });
  const scored = pool.map((r, i) => ({ r, i, k: stems.reduce((sum, s, j) => sum + (titles[i].includes(s) ? weight[j] : 0), 0) })).filter((x) => x.k > 0);
  if (!scored.length) return { list: found, near: false };
  const top = Math.max(...scored.map((x) => x.k));
  const more = scored.filter((x) => x.k >= top / 2 && !found.includes(x.r));
  if (!more.length) return { list: found, near: false };
  // Together with what was found, the most words first («…с копчёной свининой» before «…в мультиварке»).
  const all = [...found.map((r) => scored.find((x) => x.r === r) ?? { r, i: -1, k: 0 }), ...more];
  return { list: all.sort((a, b) => b.k - a.k || a.i - b.i).map((x) => x.r), near: true };
}

/** «сырн»: «Сырники» (six) before «Сырный суп» (three) — the larger family of titles first, each as the search had it. */
export function familiesFirst(query: string, found: Recipe[]): Recipe[] {
  const q = low(query.trim());
  // Only a word still being typed: «сыр» typed whole is cheese, not the cheesecakes.
  if (q.length < 4 || /\s/.test(q)) return found;
  const head = (r: Recipe) => low(r.title).split(/[\s,«»-]+/)[0];
  const starts = found.filter((r) => head(r).startsWith(q));
  const heads = new Set(starts.map(head));
  if (heads.size < 2) return found;
  const size = new Map<string, number>();
  for (const r of starts) size.set(head(r), (size.get(head(r)) ?? 0) + 1);
  const order = [...starts].map((r, i) => ({ r, i })).sort((a, b) => (size.get(head(b.r))! - size.get(head(a.r))!) || a.i - b.i).map((x) => x.r);
  return [...order, ...found.filter((r) => !starts.includes(r))];
}
