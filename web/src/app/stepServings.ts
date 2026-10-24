// A step written for the recipe's own number of portions («для 4 порций — 12 штук», «на базовые четыре порции нужно 16
// минут жарки») read by someone cooking for 2. The plain «для N порций — M» is recounted; any other mention of portions
// gets a quiet note under the step — recounting free wording («по шесть на порцию, 24 изделия») could go wrong.
import { plural } from "../engine";

const PLAIN = /([Дд]ля|[Нн]а)\s+(\d+)\s+порци[йию]\s*[—–-]\s*(\d+)/g;
const MENTION = /базов|(?:для|на)\s+(?:\d+|двух|трёх|трех|четырёх|четырех|шести|восьми)\s+порц/i;

export function forServings(text: string, base: number, servings: number): { text: string; note?: string } {
  if (!base || servings === base) return { text };
  const out = text.replace(PLAIN, (m, w: string, n: string, k: string) =>
    Number(n) === base ? w + " " + servings + " " + plural(servings, "порции", "порций", "порций") + " — " + Math.max(1, Math.round((Number(k) * servings) / base)) : m);
  return MENTION.test(out.replace(PLAIN, ""))
    ? { text: out, note: "Числа в этом шаге — на " + base + " " + plural(base, "порцию", "порции", "порций") + ", у вас " + servings + "." }
    : { text: out };
}
