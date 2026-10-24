// «Курица тушёная», «варёная картошка», «курица гриль»: how the dish is cooked, not a product. The parser read
// «тушёная» as тушёнка, «варёная» as варёная колбаса and «гриль» found крем-брюле «под грилем». The word is taken out
// before the request is read, and the dishes cooked that way go first in the answer.
import { ingredientMatches, type Conditions, type Match, type Recipe } from "../engine";

export interface Method { text: string; say: string; test: (r: Recipe) => boolean; strong: (r: Recipe) => boolean }

const END = "(?:ая|ое|ый|ую|ые|ой|ых|ым|ого|ую|ом)";
// `strong`: the title says the method itself («Курица тушёная»), before the dishes only cooked so («в сметане»).
const METHODS: { re: RegExp; say: string; title: RegExp; strong: RegExp }[] = [
  // Not «тушёнка»: the ending is an adjective's.
  { re: new RegExp("(?<!\\p{L})(?:туш[её]н" + END + ")(?!\\p{L})", "giu"), say: "тушёное",
    title: /туш[её]н(?!к)|рагу|жаркое|гуляш|в сметан|в томат|в соусе|в подлив/i, strong: /туш[её]н(?!к)|рагу|жаркое|гуляш/i },
  // «варёная колбаса», «варёная сгущёнка» are products.
  { re: new RegExp("(?<!\\p{L})(?:(?:от)?вар[её]н" + END + "|отварн\\p{L}*)(?!\\p{L})(?!\\s+(?:колбас|сгущ))", "giu"), say: "отварное",
    title: /отварн|варён|варен(?!ик|ь)|в мундире/i, strong: /отварн|варён|в мундире/i },
  { re: new RegExp("(?<!\\p{L})(?:запеч[её]нн" + END + "|печ[её]н(?:ая|ый|ое|ые|ую|ой))(?!\\p{L})", "giu"), say: "запечённое",
    title: /запеч|печён|печен(?:ые|ая|ый|ое)(?!\p{L})|в духовке|в фольге|в рукаве|в горшоч/iu, strong: /запеч|печён|печен(?:ые|ая|ый|ое)(?!\p{L})/iu },
  { re: new RegExp("(?<!\\p{L})(?:жар[её]н" + END + "|обжаренн" + END + ")(?!\\p{L})", "giu"), say: "жареное",
    title: /жарен|на сковород|в кляре|отбивн/i, strong: /жарен/i },
  { re: /(?<!\p{L})(?:гриль|на гриле|на мангале)(?!\p{L})/giu, say: "как на гриле",
    title: /гриль|на гриле|мангал|шашлык|стейк|в духовке/i, strong: /гриль|на гриле|мангал|шашлык/i },
];

/** The cooking method said in the request, and the request without it; null when none is said. */
export function cookingMethod(text: string): Method | null {
  // «как сварить яйцо всмятку», «сколько тушить капусту»: a kitchen question, answered as it is.
  if (/^\s*(?:как|сколько|чем|можно ли|почему|зачем)(?!\p{L})/iu.test(text)) return null;
  // «тушёная или запечённая»: either.
  const said = METHODS.filter((m) => { m.re.lastIndex = 0; return m.re.test(text); });
  if (!said.length) return null;
  let rest = text;
  for (const m of said) { m.re.lastIndex = 0; rest = rest.replace(m.re, " "); }
  rest = rest.replace(/(?<!\p{L})или(?!\p{L})/giu, " ").replace(/\s+/g, " ").trim();
  return {
    text: rest, say: said.map((m) => m.say).join(" или "),
    test: (r) => said.some((m) => m.title.test(r.title)) && !/туш[её]нк/i.test(r.title),
    strong: (r) => said.some((m) => m.strong.test(r.title)),
  };
}

/**
 * The answer's dishes cooked that way first: from what was found, then from all the dishes that fit the request.
 * With products asked for («курица тушёная»), only dishes that have them.
 */
export function byMethod(results: Match[], c: Conditions, m: Method, found: (c: Conditions, limit?: number) => Match[]): Match[] {
  const wanted = c.desired.filter((d) => !d.startsWith("dish:"));
  const has = (x: Match) => !wanted.length || x.recipe.ingredients.some((i) => wanted.some((d) => i.id === d || ingredientMatches(i.id, d))) || x.available.length > 0;
  const pool = [...results, ...found(c, 400)].filter((x) => m.test(x.recipe) && has(x));
  // The method named in the title first, then the product said in the title («курица тушёная»: «Курица тушёная с
  // овощами» before «Куриная печень в сметане»).
  const stems = m.text.toLowerCase().replace(/ё/g, "е").split(/[^а-я]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 4));
  const named = (r: Recipe) => stems.some((s) => r.title.toLowerCase().replace(/ё/g, "е").includes(s));
  const score = (x: Match) => (m.strong(x.recipe) ? 2 : 0) + (named(x.recipe) ? 1 : 0);
  const seen = new Set<string>();
  const first = pool.filter((x) => !seen.has(x.recipe.id) && !!seen.add(x.recipe.id))
    .map((x, i) => ({ x, i, k: score(x) })).sort((a, b) => b.k - a.k || a.i - b.i).map((y) => y.x);
  return first.length ? [...first, ...results.filter((x) => !seen.has(x.recipe.id))].slice(0, 5) : results;
}
