// What is typed as a list — «молоко, хлеб, десяток яиц», a line of a family recipe — as products: «Покупки» and
// «Семейная книга» («Продукты в покупки»).
import { searchIngredients, shortName } from "../engine";
import { knownProduct } from "./knownProducts";

/** The catalog product the words clearly name, or undefined (then it stays as written). */
export function matchProduct(name: string, ids: string[]): string | undefined {
  const word = name.toLowerCase();
  const stem = word.slice(0, Math.max(3, word.length - 2));
  // The usual words first (app/knownProducts): «масло» is butter, not sesame oil; «сок» stays «Сок», as written.
  const known = knownProduct(word.replace(/ё/g, "е"));
  return known ? (known.length === 1 && ids.includes(known[0]) ? known[0] : undefined) : searchIngredients(word, ids, 5).find((id) => shortName(id).toLowerCase().startsWith(stem) || word.startsWith(shortName(id).toLowerCase().slice(0, Math.max(3, shortName(id).length - 2))));
}

export const LIQUID = /молок|кефир|сливк|сок|вод|масло растит|ряженк|йогурт питьев|бульон|квас|морс/i;

/** «Молоко, хлеб, десяток яиц и сметана» → four rows; each name is matched to a known product when it is clearly one. */
export function splitList(text: string, ids: string[]): { ingredientId: string; name: string; amount: number; unit: string }[] {
  const UNIT: Record<string, string> = { кг: "кг", кило: "кг", килограмм: "кг", г: "г", грамм: "г", л: "л", литр: "л", литра: "л", литров: "л", мл: "мл", шт: "шт.", штук: "шт.", штуки: "шт.", пачка: "пачка", пачки: "пачка", банка: "банка", банки: "банка", бутылка: "бутылка", бутылки: "бутылка" };
  return text.split(/\s*(?:,|;|\n|\s+и\s+|\s+а ещё\s+|\s+еще\s+|\s+ещё\s+)\s*/i).map((p) => p.trim().replace(/[.!?]+$/, "")).filter((p) => p.length > 1).slice(0, 20).map((part) => {
    let amount = 1, unit = "", name = part;
    const ten = name.match(/^десяток\s+(.+)$/i);
    const lead = name.match(/^(\d+(?:[.,]\d+)?)\s*([а-яё.]+)?\s+(.+)$/i);
    const tail = name.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*([а-яё.]+)?$/i);
    if (ten) { amount = 10; unit = "шт."; name = ten[1]; }
    else if (lead) { amount = Number(lead[1].replace(",", ".")) || 1; const u = UNIT[(lead[2] ?? "").replace(/\.$/, "").toLowerCase()]; unit = u ?? ""; name = u ? lead[3] : ((lead[2] ? lead[2] + " " : "") + lead[3]); }
    else if (tail) { amount = Number(tail[2].replace(",", ".")) || 1; unit = UNIT[(tail[3] ?? "").replace(/\.$/, "").toLowerCase()] ?? ""; name = tail[1]; }
    // Said in the genitive after a number («десяток яиц», «2 пачки масла»): the usual words back to the product.
    const ALIAS: Record<string, string> = { "яиц": "яйца", "яйца": "яйца", "картошки": "картофель", "картошку": "картофель", "картошка": "картофель", "молока": "молоко", "хлеба": "хлеб", "масла": "масло", "сметаны": "сметана", "муки": "мука", "сахара": "сахар", "сыра": "сыр", "лука": "лук", "кефира": "кефир" };
    name = ALIAS[name.toLowerCase()] ?? name;
    const hit = matchProduct(name, ids);
    const label = hit ? shortName(hit) : name.charAt(0).toUpperCase() + name.slice(1);
    return { ingredientId: hit ?? "custom-" + Math.random().toString(36).slice(2, 9), name: label.slice(0, 120), amount, unit: unit || (LIQUID.test(label) ? "л" : "шт.") };
  });
}
