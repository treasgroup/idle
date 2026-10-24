// «Нагрейте две пятых растительного масла», «смажьте двадцать первой частью масла» — the recipes say it so because
// the amounts change with the servings. On screen and aloud the fraction gives way to the amount for the chosen
// servings: «Нагрейте 20 г растительного масла (1,5 ст. л.)». A fraction that is not of a product («не выше двух
// третей высоты») or that can't be pinned to one product stays as written.
// Note: JavaScript's \b does not see Cyrillic letters, so word edges here are (?<!\p{L}).
import { formatAmount, type RecipeIngredient } from "../engine";
import { spoonHint } from "./amounts";

const low = (s: string) => s.toLowerCase().replace(/ё/g, "е");

// Numerators in every case: «две трети», «двух третей», «двумя третями», «пятнадцатью шестнадцатыми».
const NUM: Record<string, number> = { одна: 1, одну: 1, одной: 1, две: 2, двух: 2, двум: 2, двумя: 2, три: 3, трех: 3, трем: 3, тремя: 3, четыре: 4, четырех: 4, четырем: 4, четырьмя: 4, восьми: 8 };
["пять", "шесть", "семь", "восемь", "девять", "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать", "двадцать", "тридцать"]
  .forEach((w, i) => { const n = i < 16 ? i + 5 : 30, s = w.slice(0, -1); NUM[w] = n; NUM[s + "и"] = n; NUM[s + "ью"] = n; });
// «двадцать первой частью» is one twenty-first: tens + an ordinal from the first nine.
const TENS: Record<string, number> = { двадцать: 20, тридцать: 30, сорок: 40 };
const UNIT: [string, number][] = [["перв", 1], ["втор", 2], ["трет", 3], ["четверт", 4], ["пят", 5], ["шест", 6], ["седьм", 7], ["восьм", 8], ["девят", 9]];
// Longest stems first, so «пятнадцат» is not read as «пят».
const DEN: [string, number][] = ([["трет", 3], ["четверт", 4], ["пят", 5], ["шест", 6], ["седьм", 7], ["восьм", 8], ["девят", 9], ["десят", 10], ["одиннадцат", 11], ["двенадцат", 12], ["тринадцат", 13], ["четырнадцат", 14], ["пятнадцат", 15], ["шестнадцат", 16], ["семнадцат", 17], ["восемнадцат", 18], ["девятнадцат", 19], ["двадцат", 20], ["тридцат", 30], ["сороков", 40], ["пятидесят", 50]] as [string, number][]).sort((a, b) => b[0].length - a[0].length);
// «пятую», «десятых», «шестнадцатыми» — an ordinal; «треть», «трети», «четвертью» — the nouns.
const ORDINAL = /^(?:ая|ую|ой|ых|ыми|ым|ые|ого|ья|ью|ьей|ьих|ьими|ьим)$/;
const NOUN = /^(?:ь|и|ью|ей|ям|ями|ях)$/;
/** Words that only point at the product: «одну шестнадцатую всей воды» → «200 мл воды». */
const FILLER = /^(?:всей|всего|всех|всю|весь|указанн\p{L}*|этой|этого|нужн\p{L}*|общ\p{L}*)$/u;
const ADJECTIVE = /(?:ого|его|ой|ей|ых|их|ую|юю|ая|яя|ое|ее|ый|ий)$/;
// «масла» / «масло», «сахара» / «сахар», «воды» / «вода»: the first letters without the ending.
const stem = (w: string) => { const x = low(w).replace(/^яиц/, "яйц"); return x.slice(0, Math.max(3, Math.min(4, x.length - 1))); };
const nameWords = (l: RecipeIngredient) => low(l.name).split(/[\s,()«»]+/).filter((x) => x.length >= 3).map(stem);

// «е» in the lists also matches «ё» in the text («трёх», «четвёртую»).
const alt = (ws: string[]) => ws.sort((a, b) => b.length - a.length).map((w) => w.replace(/е/g, "[её]")).join("|");
// «остальными» / «оставшуюся», up to two number words, the fraction word, «часть», then up to three words for the product.
const FRACTION = new RegExp("(?<!\\p{L})((?:(?:остальн|оставш)\\p{L}*\\s+)?)((?:(?:" + alt([...Object.keys(NUM), ...Object.keys(TENS)]) + ")\\s+){0,2})((?:" + alt([...DEN.map(([s]) => s), "перв", "втор"]) + ")\\p{L}*)((?:\\s+част\\p{L}*)?)((?:\\s+[\\p{L}-]+){0,3})", "giu");

const comma = (n: number) => String(n).replace(".", ",");

/** «50 мл», «3 л», «20 г» and «1,5 ст. л.» apart: the spoons go after the product. */
function amountParts(i: RecipeIngredient): [string, string] {
  const a = i.amount;
  if (i.unit === "г" || i.unit === "мл") {
    const spoons = spoonHint(i.id, a, i.unit) ?? "";
    if (a >= 1000) return [comma(Math.round(a / 100) / 10) + (i.unit === "г" ? " кг" : " л"), spoons];
    const n = a >= 30 ? Math.round(a / 5) * 5 : a >= 3 ? Math.round(a) : Math.round(a * 2) / 2;
    return [comma(n) + " " + i.unit, spoons];
  }
  return [formatAmount(Math.round(a * 2) / 2, i.unit), ""];
}

/** The share of the product the words name: «две трети» → 2/3, «двадцать первой частью» → 1/21; null when it is not a fraction. */
function share(lead: string, word: string, part: boolean): number | null {
  const ws = lead.trim() ? low(lead).trim().split(/\s+/) : [];
  const w = low(word);
  let num: number | undefined, den: number | undefined;
  const tens = ws.length ? TENS[ws[ws.length - 1]] : undefined;
  if (tens) {
    const u = UNIT.find(([s]) => w.startsWith(s) && ORDINAL.test(w.slice(s.length)));
    if (!u) return null;
    den = tens + u[1];
    ws.pop();
  } else {
    const d = DEN.find(([s]) => w.startsWith(s));
    if (!d) return null;
    const end = w.slice(d[0].length);
    const noun = (d[1] === 3 || d[1] === 4) && NOUN.test(end);
    if (!noun && !ORDINAL.test(end)) return null;
    den = d[1];
    // «треть масла», «четверть соли» without a number is one part.
    if (!ws.length && noun && /^(?:ь|ью|и)$/.test(end)) num = 1;
  }
  if (ws.length > 1) return null;
  if (ws.length) { num = NUM[ws[0]]; if (!num) return null; }
  if (num === undefined) num = part ? 1 : undefined;
  if (!num || num >= den) return null;
  return num / den;
}

/** The product line the words after the fraction name, and how many of the words it takes. */
function productAfter(tail: string, lines: RecipeIngredient[]): { line: RecipeIngredient; used: number; words: string[] } | null {
  const words = tail.match(/\s+[\p{L}-]+/gu) ?? [];
  const adjectives: string[] = [];
  for (let k = 0; k < words.length; k++) {
    const w = words[k].trim();
    const lw = low(w);
    const found = lines.filter((l) => l.amount > 0 && nameWords(l).includes(stem(w)));
    if (found.length) {
      // «растительного масла» when there is butter too: the adjective decides; «тёплой воды» with plain «Вода» is fine.
      const byAdj = adjectives.length ? found.filter((l) => adjectives.every((a) => nameWords(l).includes(stem(a)))) : found;
      let pick = byAdj.length ? byAdj : found;
      if (pick.length > 1) pick = pick.filter((l) => nameWords(l)[0] === stem(w));
      if (pick.length !== 1) return null;
      // «растительного масла»: the whole name. «картофельного отвара» is not potatoes: an adjective that matched counts
      // only when the next word is from the same product's name.
      const names = nameWords(pick[0]);
      let end = k;
      while (ADJECTIVE.test(low(words[end].trim())) && words[end + 1] && names.includes(stem(words[end + 1].trim()))) end++;
      if (end === k && ADJECTIVE.test(lw) && words[k + 1]) return null;
      return { line: pick[0], used: end + 1, words: words.slice(0, end + 1).map((x) => x.trim()).filter((x) => !FILLER.test(low(x))) };
    }
    if (FILLER.test(lw)) continue;
    if (ADJECTIVE.test(lw)) { adjectives.push(w); continue; }
    return null;
  }
  return null;
}

/** «оставшуюся четверть масла» → «оставшиеся 50 г масла», «смажьте оставшейся частью» → «оставшимися 12 г». */
function agree(rest: string): string {
  return rest
    .replace(/^([Оо]стальн)(?:ую|ая|ое)(?=\s)/u, "$1ые").replace(/^([Оо]стальн)ой(?=\s)/u, "$1ыми")
    .replace(/^([Оо]ставш)(?:уюся|аяся|ееся)(?=\s)/u, "$1иеся").replace(/^([Оо]ставш)ейся(?=\s)/u, "$1имися");
}

// «Смешайте 11/13 муки», «используйте 100/113 всей воды, остальные 13/113 сохраните»: the same shares in figures.
const DIGITS = /(?<![\d,×/\p{L}])((?:(?:остальн|оставш)\p{L}*\s+)?)(\d{1,3})\/(\d{1,3})(?![\d/×])((?:\s+[\p{L}-]+){0,3})/giu;

function digitShares(text: string, lines: RecipeIngredient[]): string {
  let last: { line: RecipeIngredient; words: string[] } | null = null;
  return text.replace(DIGITS, (m, rest: string, a: string, b: string, tail: string) => {
    const num = Number(a), den = Number(b);
    if (!(num > 0 && den > num)) return m;
    const found = productAfter(tail, lines);
    const target = found ?? (rest && last ? { line: last.line, used: 0, words: last.words } : null);
    if (!target) return m;
    const portion = { ...target.line, amount: target.line.amount * (num / den) };
    if (portion.amount < 1 && (portion.unit === "г" || portion.unit === "мл")) return m;
    last = { line: target.line, words: target.words };
    const [amount, spoons] = amountParts(portion);
    const words = tail.match(/\s+[\p{L}-]+/gu) ?? [];
    return agree(rest) + amount + " " + target.words.join(" ") + (spoons ? " (" + spoons + ")" : "") + words.slice(target.used).join("");
  });
}

/** `lines`: the products already counted for the servings on screen. */
export function withAmounts(raw: string, lines: RecipeIngredient[]): string {
  const text = digitShares(raw, lines);
  const re = new RegExp(FRACTION.source, FRACTION.flags);
  let last: { line: RecipeIngredient; words: string[] } | null = null;
  let out = "", from = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const [, rest, lead, word, part, tail] = m;
    const head = rest.length + lead.length + word.length + part.length;
    // Not replaced: the words after the fraction word are searched again («одной шестой соли и четвертью перца»).
    re.lastIndex = m.index + head;
    const k = share(lead, word, !!part.trim());
    if (k === null) continue;
    const found = productAfter(tail, lines);
    // «Отделите одну шестнадцатую всей воды…, остальными пятнадцатью шестнадцатыми залейте мясо»: the rest of the same product.
    const target: { line: RecipeIngredient; used: number; words: string[] } | null = found ?? (rest && last ? { line: last.line, used: 0, words: last.words } : null);
    if (!target) continue;
    const portion = { ...target.line, amount: target.line.amount * k };
    if (portion.amount < 1 && (portion.unit === "г" || portion.unit === "мл")) continue;
    last = { line: target.line, words: target.words };
    const [amount, spoons] = amountParts(portion);
    const used = (tail.match(/\s+[\p{L}-]+/gu) ?? []).slice(0, target.used).join("").length;
    out += text.slice(from, m.index) + agree(rest) + amount + " " + target.words.join(" ") + (spoons ? " (" + spoons + ")" : "");
    from = re.lastIndex = m.index + head + used;
  }
  return out + text.slice(from);
}
