// The words of a search that are a filter, not a name: «без мяса», «десерт», «на завтрак», «быстро», «пп», «детям»,
// «в мультиварке». They turn into the same filters as the chips on the search screen, and the rest of the query is
// searched as text: «суп без мяса» is soups without meat, not dishes with «мясо» in the title (which «мяса» finds).
import { DEFAULT_CONDITIONS, ingredientMatches, matchesDish, parseMessage, type Recipe } from "../engine";

export interface QueryWords {
  /** What is left to look for in titles and products («суп»; "" when the query was only filters). */
  text: string;
  /** A dish section of the search screen (sweet, breakfast, baking…). */
  dish: string | null;
  /** Chip filters (veg, lent, light, kids, guests, multicooker…). */
  on: string[];
  /** «пп»: dishes with this tag (the catalog's «light»). */
  tag: string | null;
  /** «быстро»: up to so many minutes. */
  time: number | null;
  /** The filters in words, for the line «Нашлось: 12 рецептов · без мяса, до 30 мин». */
  said: string[];
  /** «без молока», «без яиц и лука»: products (or «dish:…») the dishes must not have. */
  without: string[];
}

// «Без лактозы», «без молочного»: everything made from milk; «без орехов»: every nut, not only walnuts.
const GROUPS: [RegExp, string[]][] = [
  [/лактоз|молочн|молочк/, ["dairy"]],
  [/орех/, ["nuts", "walnut"]],
];

/** «без молока» — the same products Шеф takes out for these words; [] when the words are not products. */
function productsOut(words: string): string[] {
  const group = GROUPS.find(([re]) => re.test(words));
  if (group) return group[1];
  const p = parseMessage("без " + words, { ...DEFAULT_CONDITIONS, servings: 2 }) as { excludedAdd?: string[] };
  return p.excludedAdd ?? [];
}

/** Whether the dish has what was asked to leave out (an optional extra does not count). */
export function hasAny(r: Recipe, out: string[]): boolean {
  return out.some((x) => (x.startsWith("dish:") ? matchesDish(r, x)
    : r.ingredients.some((i) => !i.optional && (i.id === x || ingredientMatches(i.id, x)))));
}

type Rule = { re: RegExp; dish?: string; on?: string; tag?: string; time?: number; say: string };
// Each pattern takes its words out of the query. Order matters only for overlapping words.
const RULES: Rule[] = [
  { re: /(^|\s)(без мяса|вегетарианск\S*|веган\S*)(?=\s|$)/g, on: "veg", say: "без мяса" },
  { re: /(^|\s)(постн\S*|в пост)(?=\s|$)/g, on: "lent", say: "постное" },
  { re: /(^|\s)(десерт\S*|сладкое|сладенькое|сладости|что-нибудь сладкое|к чаю)(?=\s|$)/g, dish: "sweet", say: "сладкое" },
  { re: /(^|\s)((на )?завтрак\S*)(?=\s|$)/g, dish: "breakfast", say: "завтраки" },
  { re: /(^|\s)(выпечк\S*|испечь)(?=\s|$)/g, dish: "baking", say: "выпечка" },
  { re: /(^|\s)(быстр\S*|на скорую руку|по-быстрому|побыстрее)(?=\s|$)/g, time: 30, say: "до 30 мин" },
  { re: /(^|\s)(пп|диетическ\S*|низкокалорийн\S*|полезн\S*|для похудения)(?=\s|$)/g, on: "light", tag: "light", say: "лёгкое" },
  { re: /(^|\s)(для детей|детям|детск\S*|для ребенка|ребенку|для малышей)(?=\s|$)/g, on: "kids", say: "детям" },
  { re: /(^|\s)(для гостей|на праздник|праздничн\S*)(?=\s|$)/g, on: "guests", say: "для гостей" },
  { re: /(^|\s)((в )?мультиварк\S*)(?=\s|$)/g, on: "multicooker", say: "мультиварка" },
  { re: /(^|\s)((в )?аэрогрил\S*)(?=\s|$)/g, on: "airfryer", say: "аэрогриль" },
  { re: /(^|\s)((в )?микроволновк\S*|(в )?микроволновой печи)(?=\s|$)/g, on: "microwave", say: "микроволновка" },
  { re: /(^|\s)(без духовки)(?=\s|$)/g, on: "no-oven", say: "без духовки" },
  // Meal words only narrow what is said: «рыба на ужин» is fish.
  { re: /(^|\s)((на )?(ужин|обед)\S*)(?=\s|$)/g, say: "" },
];

export function readQuery(query: string): QueryWords {
  let text = " " + query.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim() + " ";
  const out: QueryWords = { text: "", dish: null, on: [], tag: null, time: null, said: [], without: [] };
  let changed = false;
  for (const r of RULES) {
    if (!r.re.test(text)) continue;
    r.re.lastIndex = 0;
    text = text.replace(r.re, " ");
    changed = true;
    if (r.dish && !out.dish) out.dish = r.dish;
    if (r.on && !out.on.includes(r.on)) out.on.push(r.on);
    if (r.time) out.time = r.time;
    if (r.tag) out.tag = r.tag;
    if (r.say && !out.said.includes(r.say)) out.said.push(r.say);
  }
  // Any other «без …» («без молока», «без яиц и лука», «без лактозы»): the dishes without it, not the ones with
  // «молоко» in the title, which the plain search found first («Блины на молоке»).
  text = text.replace(/(^|\s)без ([а-я-]+(?: (?:и|или) [а-я-]+)*)(?=\s|$)/g, (all, pre: string, words: string) => {
    const ids = productsOut(words);
    if (!ids.length) return all;
    changed = true;
    for (const id of ids) if (!out.without.includes(id)) out.without.push(id);
    const say = "без " + words;
    if (!out.said.includes(say)) out.said.push(say);
    return pre + " ";
  });
  // «что-нибудь», «блюда», «рецепты» left alone mean nothing to look for.
  out.text = text.replace(/(^|\s)(что-нибудь|что нибудь|что|блюд\S*|рецепт\S*|приготовить|хочу|из|с|и|в|на|для)(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
  if (!changed) out.text = query.trim();
  return out;
}
