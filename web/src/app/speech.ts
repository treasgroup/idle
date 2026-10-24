// What the phone reads aloud: the step's text made speakable — abbreviations in full words agreeing with the number
// («2 ст. л.» → «2 столовые ложки», «5 мин» → «5 минут», «180 °C» → «180 градусов»), ranges as people say them
// («5–7 минут» → «от 5 до 7 минут»; after «при», «через»… → «3 или 4»), symbols in words («30×40 см» → «30 на 40
// сантиметров», «Ø16» → «диаметром 16», «−18» → «минус 18», «20 %» → «20 процентов»), no brackets or quotes.

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
  [/^%$/, "процент", "процента", "процентов"],
  [/^см\.?$/, "сантиметр", "сантиметра", "сантиметров"],
  [/^мм\.?$/, "миллиметр", "миллиметра", "миллиметров"],
];
const UNIT = /(\d+(?:[.,]\d+)?)\s?(ст\.?\s?л\.?|ч\.?\s?л\.?|кг\.?|мл\.?|см\.?|мм\.?|гр?\.?|л\.?|мин\.?|сек\.?|ч\.?|шт\.?|°\s?C?|%)(?!\p{L})/gu;
// After «от … до»: «до 7 минут», «до 3 столовых ложек» — the genitive; «до 21 минуты».
const GEN1: Record<string, string> = { "столовая ложка": "столовой ложки", "чайная ложка": "чайной ложки" };

export function speechText(raw: string): string {
  let t = raw
    .replace(/½\s*шт\.?/g, " половина штуки ").replace(/½/g, " половина ").replace(/¼/g, " четверть ").replace(/¾/g, " три четверти ")
    .replace(/[«»"“”„()[\]•*]/g, "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/(\d)\s?[×x]\s?(?=\d)/g, "$1 на ").replace(/Ø\s?(?=\d)/g, "диаметром ").replace(/(^|[\s(])[−-](?=\d)/g, "$1минус ")
    .replace(/(?<![\d:])(\d{1,2})\s?:\s?(\d{1,2})(?![\d:])(?!\s*(?:\d|ч))/g, (m: string, a: string, b: string) => (Number(b) >= 10 && b.length === 2 ? m : a + " к " + b));
  // «Добавьте ½ ч. л.» → «Добавьте половину чайной ложки».
  t = t.replace(/(\p{L}+(?:те|ть))\s+половина(?=\s)/gu, "$1 половину");
  // Ranges: «5–7 минут» → «от 5 до 7 минут»; after a preposition («при 180–200 °C», «через 3–4 минуты») — «или».
  t = t.replace(/(^|\s)((?:при|через|на|за|по|в|до|около)\s+)?(\d+(?:[.,]\d+)?)\s?[–-]\s?(\d+(?:[.,]\d+)?)/gi,
    (_m: string, sp: string, pre: string | undefined, a: string, b: string) => sp + (pre ? pre + a + " или " + b : "от " + a + " до " + b))
    // The word written in full after it: «от 3 до 4 минуты» → «минут».
    .replace(/(от \S+ до (\d+(?:[.,]\d+)?)) (минут[аы]?|час(?:а|ов)?|секунд[аы]?)(?!\p{L})/gu, (_m: string, head: string, n: string, w: string) => {
      const k = num(n), one = Number.isInteger(k) && k % 10 === 1 && k % 100 !== 11;
      const base = w.startsWith("мин") ? ["минуты", "минут"] : w.startsWith("час") ? ["часа", "часов"] : ["секунды", "секунд"];
      return head + " " + (one ? base[0] : base[1]);
    });
  // Number + unit, agreeing with the (last) number.
  t = t.replace(UNIT, (m: string, n: string, unit: string, at: number, all: string) => {
    const u = UNITS.find(([re]) => re.test(unit.trim()));
    if (!u) return m;
    // «Варите 5 мин.» at the end of a sentence: that dot was the sentence's too — kept for the pause.
    const rest = all.slice(at + m.length);
    const end = unit.endsWith(".") && (/^\s*$/.test(rest) || /^\s+\p{Lu}/u.test(rest)) ? "." : "";
    // «от 5 до 7 минут»: the genitive after «до».
    if (/от\s+\S+\s+до\s+$/.test(all.slice(0, at))) {
      const k = num(n), one = Number.isInteger(k) && k % 10 === 1 && k % 100 !== 11;
      return n + " " + (one ? GEN1[u[1]] ?? u[2] : u[3]) + end;
    }
    return n + " " + form(num(n), u[1], u[2], u[3]) + end;
  });
  // Abbreviations without a number in front.
  t = t.replace(/(?<!\p{L})ст\.\s?л\.?(?!\p{L})/gu, "столовой ложки").replace(/(?<!\p{L})ч\.\s?л\.?(?!\p{L})/gu, "чайной ложки")
    .replace(/(?<!\p{L})т\.\s?е\.?(?!\p{L})/gu, "то есть").replace(/(?<!\p{L})т\.\s?к\.?(?!\p{L})/gu, "так как");
  return t.replace(/\s{2,}/g, " ").replace(/\s+([,.!?:;])/g, "$1").trim();
}
