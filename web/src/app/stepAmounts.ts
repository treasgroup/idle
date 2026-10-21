// «Нагрейте две пятых растительного масла» — the recipes say it so because the amounts change with the servings.
// On screen the amount for the chosen servings goes right after the product: «две пятых растительного масла (≈ 15 г, 1 ст. л.)».
import { formatAmount, type RecipeIngredient } from "../engine";
import { spoonHint } from "./amounts";

const NUM: Record<string, number> = { одну: 1, одна: 1, две: 2, три: 3, четыре: 4 };
const DEN: [RegExp, number][] = [[/^пят/, 5], [/^шест/, 6], [/^седьм/, 7], [/^восьм/, 8], [/^девят/, 9], [/^десят/, 10]];
// «две пятых», «одну десятую», «пятую часть»; then up to four words, the product among them.
const FRACTION = /(?<![а-яё])(?:(одну|одна|две|три|четыре)\s+)?(пят|шест|седьм|восьм|девят|десят)([а-яё]*)((?:\s+част(?:ь|и|ей))?)((?:\s+[а-яё-]+){1,4})/gi;

const low = (s: string) => s.toLowerCase().replace(/ё/g, "е");
// «масла» / «масло», «сахара» / «сахар», «воды» / «вода»: the first letters without the ending.
const stem = (w: string) => { const x = low(w).replace(/^яиц/, "яйц"); return x.slice(0, Math.max(3, Math.min(4, x.length - 1))); };

function amountText(i: RecipeIngredient): string {
  const a = i.amount;
  if (i.unit === "г" || i.unit === "мл") {
    const n = a >= 30 ? Math.round(a / 5) * 5 : a >= 3 ? Math.round(a) : Math.round(a * 10) / 10;
    const spoons = spoonHint(i.id, a, i.unit);
    return n + " " + i.unit + (spoons ? ", " + spoons : "");
  }
  return formatAmount(Math.round(a * 2) / 2, i.unit);
}

/** `lines`: the products already counted for the servings on screen. */
export function withAmounts(text: string, lines: RecipeIngredient[]): string {
  return text.replace(FRACTION, (all, n: string | undefined, d: string, _ending: string, part: string, tail: string) => {
    // «пятую часть» without a number is one fifth; «пятых» without a number is not a fraction of a product.
    if (!n && !part) return all;
    const den = DEN.find(([re]) => re.test(low(d)))?.[1];
    if (!den) return all;
    const words = tail.match(/\s+[а-яё-]+/gi) ?? [];
    const nameWords = (l: RecipeIngredient) => low(l.name).split(/[\s,()«»]+/).filter((x) => x.length >= 3).map(stem);
    for (let k = 0; k < words.length; k++) {
      const w = words[k].trim();
      if (w.length < 3) continue;
      const line = lines.find((l) => l.amount > 0 && nameWords(l).includes(stem(w)));
      if (!line) continue;
      // «питьевой воды», «растительного масла»: the whole name, the amount after it. «картофельного отвара» is not
      // potatoes: an adjective that matched counts only when the next word is from the same product's name.
      const next = words[k + 1]?.trim();
      const adjective = /(ого|его|ой|ей|ых|их|ую|юю|ая|яя|ое|ее|ый|ий)$/i.test(w);
      if (adjective && !(next && nameWords(line).includes(stem(next)))) return all;
      while (words[k + 1] && nameWords(line).includes(stem(words[k + 1].trim()))) k++;
      const share = { ...line, amount: (line.amount * NUM[low(n ?? "одну")]) / den };
      const head = all.slice(0, all.length - tail.length) + words.slice(0, k + 1).join("");
      return head + " (≈ " + amountText(share) + ")" + words.slice(k + 1).join("");
    }
    return all;
  });
}
