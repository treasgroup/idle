// What the phone reads aloud: the step's text made speakable — abbreviations in full words agreeing with the number
// («2 ст. л.» → «2 столовые ложки», «5 мин» → «5 минут», «180 °C» → «180 градусов»), ranges as people say them
// («3–4 минуты» → «3 или 4 минуты»), no brackets, quotes or symbols read as words.

const form = (n: number, one: string, few: string, many: string): string => {
  if (!Number.isInteger(n)) return few; // «1,5 литра»
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};
const num = (s: string) => Number(s.replace(",", "."));

// Unit after a number: [pattern, one, few, many]. The longer ones first («ст. л.» before «л»).
const UNITS: [RegExp, string, string, string][] = [
  [/^ст\.?\s?л\.?$/, "столовая ложка", "столовые ложки", "столовых ложек"],
  [/^ч\.?\s?л\.?$/, "чайная ложка", "чайные ложки", "чайных ложек"],
  [/^кг\.?$/, "килограмм", "килограмма", "килограммов"],
  [/^мл\.?$/, "миллилитр", "миллилитра", "миллилитров"],
  [/^гр?\.?$/, "грамм", "грамма", "граммов"],
  [/^л\.?$/, "литр", "литра", "литров"],
  [/^мин\.?$/, "минута", "минуты", "минут"],
  [/^сек\.?$/, "секунда", "секунды", "секунд"],
  [/^ч\.?$/, "час", "часа", "часов"],
  [/^шт\.?$/, "штука", "штуки", "штук"],
  [/^°\s?C?$/, "градус", "градуса", "градусов"],
];
const UNIT = /(\d+(?:[.,]\d+)?)\s?(ст\.?\s?л\.?|ч\.?\s?л\.?|кг\.?|мл\.?|гр?\.?|л\.?|мин\.?|сек\.?|ч\.?|шт\.?|°\s?C?)(?!\p{L})/gu;

export function speechText(raw: string): string {
  let t = raw
    .replace(/½/g, " половина ").replace(/¼/g, " четверть ").replace(/¾/g, " три четверти ")
    .replace(/[«»"“”„()[\]•*]/g, "")
    .replace(/\s*—\s*/g, ", ");
  // Ranges: «3–4» → «3 или 4», «180–200 градусов» → «180 или 200 градусов».
  t = t.replace(/(\d+(?:[.,]\d+)?)\s?[–-]\s?(\d+(?:[.,]\d+)?)/g, "$1 или $2");
  // Number + unit, agreeing with the (last) number.
  t = t.replace(UNIT, (m: string, n: string, unit: string, at: number, all: string) => {
    const u = UNITS.find(([re]) => re.test(unit.trim()));
    if (!u) return m;
    // «Варите 5 мин.» at the end of a sentence: that dot was the sentence's too — kept for the pause.
    const rest = all.slice(at + m.length);
    const end = unit.endsWith(".") && (/^\s*$/.test(rest) || /^\s+\p{Lu}/u.test(rest)) ? "." : "";
    return n + " " + form(num(n), u[1], u[2], u[3]) + end;
  });
  // Abbreviations without a number in front.
  t = t.replace(/(?<!\p{L})ст\.\s?л\.?(?!\p{L})/gu, "столовой ложки").replace(/(?<!\p{L})ч\.\s?л\.?(?!\p{L})/gu, "чайной ложки")
    .replace(/(?<!\p{L})т\.\s?е\.?(?!\p{L})/gu, "то есть").replace(/(?<!\p{L})т\.\s?к\.?(?!\p{L})/gu, "так как");
  return t.replace(/\s{2,}/g, " ").replace(/\s+([,.!?:;])/g, "$1").trim();
}
