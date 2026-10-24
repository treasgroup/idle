// A step written for the recipe's own number of portions («для 4 порций — 12 штук», «на базовые четыре порции нужно 16
// минут жарки») read by someone cooking for 2. The plain «для N порций — M» is recounted; any other mention of portions
// gets a quiet note under the step — recounting free wording («по шесть на порцию, 24 изделия») could go wrong.
import { plural } from "../engine";

const PLAIN = /([Дд]ля|[Нн]а)\s+(\d+)\s+порци[йию]\s*[—–-]\s*(\d+)/g;
const MENTION = /базов|(?:для|на)\s+(?:\d+|двух|трёх|трех|четырёх|четырех|шести|восьми)\s+порц/i;

// «форму 14/20/24 см на 4/8/12 порций», «на 4/8/12 порций нужна 1/2/3 формы»: every size at once, the reader to find
// their own. Only the one for the portions being cooked stays; more portions than the list has — left as written.
const PORTIONS = /(?<!\p{L})(?:на|для)\s+(\d+(?:\/\d+)+)\s+порци\p{L}*/giu;
const VALUES = /(?<![\d,×/])\d+(?:,\d+)?(?:×\d+(?:,\d+)?)*(?:\/\d+(?:,\d+)?(?:×\d+(?:,\d+)?)*)+(?![\d/])/g;

function oneSize(sentence: string, servings: number): string {
  const lists = [...sentence.matchAll(PORTIONS)];
  if (!lists.length) return sentence;
  const opts = lists[0][1].split("/").map(Number);
  let at = opts.indexOf(servings);
  if (at < 0) at = opts.findIndex((n) => n >= servings);
  if (at < 0) return sentence;
  let out = sentence.replace(PORTIONS, (m, l: string) => (l.split("/").length === opts.length ? "\u0000" : m));
  out = out.replace(VALUES, (v) => { const xs = v.split("/"); return xs.length === opts.length ? xs[at] : v; });
  // «нужна 1 формы» → «нужна 1 форма».
  out = out.replace(/(\d+)\s+(форм)\p{L}*/gu, (_, n: string) => n + " " + plural(Number(n), "форма", "формы", "форм"))
    .replace(/(?<!\p{L})нужна\s+(\d+)\s+форм/gu, (m, n: string) => (Number(n) === 1 ? m : "нужны " + n + " форм"));
  out = out.replace(/\s*\u0000\s*/g, " ").replace(/\s+([,.;:])/g, "$1").replace(/:\s*,/g, ":").replace(/^\s+/, "").replace(/\s{2,}/g, " ");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** The sizes for these portions only, sentence by sentence. */
export function sizesFor(text: string, servings: number): string {
  if (!PORTIONS.test(text)) return text;
  PORTIONS.lastIndex = 0;
  return text.split(/(?<=[.;!?])\s+/).map((s) => oneSize(s, servings)).join(" ");
}

export function forServings(raw: string, base: number, servings: number): { text: string; note?: string } {
  const text = sizesFor(raw, servings || base);
  if (!base || servings === base) return { text };
  const out = text.replace(PLAIN, (m, w: string, n: string, k: string) =>
    Number(n) === base ? w + " " + servings + " " + plural(servings, "порции", "порций", "порций") + " — " + Math.max(1, Math.round((Number(k) * servings) / base)) : m);
  return MENTION.test(out.replace(PLAIN, ""))
    ? { text: out, note: "Числа в этом шаге — на " + base + " " + plural(base, "порцию", "порции", "порций") + ", у вас " + servings + "." }
    : { text: out };
}
