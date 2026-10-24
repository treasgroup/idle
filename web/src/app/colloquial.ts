// People write as they speak: «картоха», «макарошки», «курочка», «борщь». Before searching, such words become the
// ones recipes use. Only whole words are replaced.
const WORDS: [RegExp, string][] = [
  [/картох\S*|картошечк\S*|картохи/, "картошка"],
  [/макарошк\S*|макарох\S*/, "макароны"],
  [/котлетк\S*/, "котлеты"],
  [/тефтельк\S*/, "тефтели"],
  [/пельмешк\S*/, "пельмени"],
  [/варенички|вареничк\S*/, "вареники"],
  [/курочк\S*|курятин\S*/, "курица"],
  [/яички|яичко|яйки|яйцы/, "яйца"],
  [/борщь|борщик\S*/, "борщ"],
  [/супчик\S*|супец/, "суп"],
  [/кашк[аиу]/, "каша"],
  [/блинчик\S*|блинцы/, "блины"],
  [/оладушк\S*|оладушек/, "оладьи"],
  [/огурчик\S*/, "огурцы"],
  [/помидорк\S*|помидорчик\S*/, "помидоры"],
  [/лучок|лучк\S*/, "лук"],
  [/мясц\S*|мясцо/, "мясо"],
  [/рыбк\S*/, "рыба"],
  [/творожок|творожк\S*/, "творог"],
  [/морковк\S*/, "морковь"],
  [/капустк\S*/, "капуста"],
  [/грибочк\S*/, "грибы"],
  [/пюрешк\S*/, "пюре"],
  [/гречу|гречк[уи]/, "гречка"],
  [/салатик\S*/, "салат"],
  [/пирожочк\S*|пирожк\S*/, "пирожки"],
  [/сосисочк\S*/, "сосиски"],
  [/чесночок|чесночк\S*/, "чеснок"],
];

/**
 * «из картошки кроме пюре», «только не суп», «мясо, но не свинина» said the way the search reads it: «без …» right
 * where it was meant. Before, «кроме» took everything said with it («без картофеля») and «только не суп» found soups.
 * «Не» before how a dish is («не острое», «не долго») and «не хочу» stay as they are.
 */
export function saidWithout(raw: string): string {
  // «не острое» found «Китайский кисло-острый суп» first; «без острого» is read right — at the end, since «без» reaches
  // the words after it («не острое из курицы» is not «без курицы»).
  const mild = /(?<!\p{L})(?:не\s+|не)остр\p{L}*/giu;
  const text = mild.test(raw) ? raw.replace(mild, " ") + " без острого" : raw;
  const said = text
    .replace(/(?<!\p{L})(?:(?:но|только|лишь|а|и)\s+)?(?:кроме|за исключением)(?!\p{L})/giu, "без")
    .replace(/(?<!\p{L})(?:но|только|лишь бы|лишь|главное|просто|а),?\s+не(?=\s+\p{L})(?!\s+(?:хочу|хочется|надо|нужно|люблю|ем|едим|ест|долг|сложн|остр|жирн|сладк|жарен|очень|слишком|больше|меньше|дорог|тяжел|много|мало)\p{L}*)/giu, "без")
    .replace(/\s+/g, " ").trim();
  // «без лука из курицы» was read as without both: what follows «без» goes to the end («из курицы без лука»).
  const without = /(?<!\p{L})без\s+[\p{L}-]+(?:\s+(?:и|или)\s+[\p{L}-]+)*,?/giu;
  const parts = said.match(without) ?? [];
  const rest = said.replace(without, " ").replace(/\s+/g, " ").trim();
  return parts.length && rest ? (rest + " " + parts.map((p) => p.replace(/,$/, "")).join(" ")).replace(/\s+/g, " ") : said;
}

export function plainWords(text: string): string {
  return text.replace(/[а-яё]+/gi, (w) => {
    const low = w.toLowerCase();
    const hit = WORDS.find(([re]) => new RegExp("^(?:" + re.source + ")$").test(low));
    return hit ? hit[1] : w;
  });
}

// ---------- Written as heard ----------
// «хочопури», «пильмени», «чибуреки»: in Russian an unstressed «о» sounds like «а» and «е» like «и», so people write
// what they hear. A word that is not in any recipe title but sounds exactly like one becomes that word.

/** How a word sounds: unstressed vowels merged, soft and hard signs and doubled letters dropped, the last consonant voiceless. */
export function soundOf(word: string): string {
  const s = word.toLowerCase().replace(/ё/g, "е")
    .replace(/[оa]/g, "а").replace(/[еэиы]/g, "и").replace(/я/g, "а").replace(/ю/g, "у").replace(/[ьъ]/g, "")
    .replace(/(.)\1+/g, "$1");
  const last: Record<string, string> = { б: "п", в: "ф", г: "к", д: "т", ж: "ш", з: "с" };
  return s.slice(0, -1) + (last[s.slice(-1)] ?? s.slice(-1));
}

/**
 * Words by how they sound, from recipe titles. `words` also holds every word of the recipes' texts: a real word is never
 * «corrected» (обжарка stays обжарка). A sound shared by two different title words is left out.
 */
export function soundBook(titles: Iterable<string>, texts: Iterable<string> = []): { words: Set<string>; bySound: Map<string, string> } {
  const split = (t: string) => t.toLowerCase().replace(/ё/g, "е").match(/[а-я]{5,}/g) ?? [];
  const named = new Set<string>();
  for (const t of titles) for (const w of split(t)) named.add(w);
  const words = new Set(named);
  for (const t of texts) for (const w of split(t)) words.add(w);
  const bySound = new Map<string, string>();
  const clash = new Set<string>();
  for (const w of named) { const k = soundOf(w); if (bySound.has(k) && bySound.get(k) !== w) clash.add(k); else bySound.set(k, w); }
  for (const k of clash) bySound.delete(k);
  return { words, bySound };
}

/**
 * «хочу хочопури» → «хочу хачапури». Only words of five letters and more that the recipes do not have, of the same length
 * as the title word and different from it before the ending (another ending is not a mistake: «тесто», «теста»).
 */
export function fixBySound(text: string, book: { words: Set<string>; bySound: Map<string, string> }): string {
  return text.replace(/[а-яё]{5,}/gi, (w) => {
    const low = w.toLowerCase().replace(/ё/g, "е");
    if (book.words.has(low)) return w;
    const hit = book.bySound.get(soundOf(low));
    return hit && hit.length === low.length && hit.slice(0, -2) !== low.slice(0, -2) ? hit : w;
  });
}
