// «На 8 марта», «на Новый год», «на пикник», «день рождения ребёнка»: Шеф answers with the dishes the catalog marks for
// that occasion (Recipe.occasions), a few of each course, and for a festive table — the «Праздничный стол» button.
// Before, «8 марта» was read as 8 portions of hot dogs and «на масленицу» was not understood at all.
import { courseOf, type ChatGo, type Recipe } from "../engine";

interface Occasion { re: RegExp; tag: string; say: string; courses?: string[]; feast?: boolean; also?: (r: Recipe) => boolean; first?: RegExp }

const SWEET = (r: Recipe) => courseOf(r) === "dessert" || (courseOf(r) === "baking" && r.tags.includes("sweet"));
const KIDS = /(?:день рожд\p{L}*|днюх\p{L}*|праздник\p{L}*)\s+(?:у\s+)?(?:ребен\p{L}*|детей|сын\p{L}*|доч\p{L}*|малыш\p{L}*)|(?:ребен\p{L}*|ребенку|сын\p{L}*|доч\p{L}*|детск\p{L}*)\s+(?:на\s+)?(?:день рожд|днюх|праздник)/u;

// Order matters: the children's party before any birthday.
const OCCASIONS: Occasion[] = [
  { re: /нов\p{L}* год|новогодн\p{L}*|(?<!\p{L})нг(?!\p{L})|31 декабря/u, tag: "new-year", say: "К Новому году — то, что ждут на столе:", courses: ["salad", "main", "snack", "dessert"], feast: true,
    first: /оливье|шуб|холодец|мимоз|наполеон|медовик|буженин|запеч[её]нн|мандарин/i },
  { re: /(?<!\d)8 марта|восьм\p{L}* марта|женск\p{L}* день/u, tag: "holiday", say: "К 8 Марта — праздничное:", courses: ["salad", "dessert", "main", "snack"], feast: true,
    first: /торт|чизкейк|тирамису|панна|наполеон|медовик|пирожн|креветк|лосос|семг|сёмг|форел|авокадо|рулетик/i },
  { re: /23 февраля|двадцат\p{L}* трет\p{L}* февраля|день защитника|защитник\p{L}* отечества/u, tag: "holiday", say: "К 23 Февраля — посытнее:", courses: ["main", "salad", "snack", "dessert"], feast: true,
    first: /шашлык|стейк|рульк|буженин|свинин|говядин|баранин|холодец|утк|оливье|шуб|наполеон|медовик/i },
  { re: /маслениц\p{L}*|масленичн\p{L}*/u, tag: "maslenitsa", say: "На Масленицу — блины:", also: (r) => /^блин/i.test(r.title) },
  { re: /пасх\p{L}*/u, tag: "easter", say: "К Пасхе:", also: (r) => /кулич|крашен/i.test(r.title) },
  { re: /пикник\p{L}*|на природу|в поход|на дачу/u, tag: "picnic", say: "На пикник — то, что легко взять с собой:", courses: ["main", "salad", "snack", "baking"] },
  { re: KIDS, tag: "kids-party", say: "На детский праздник:", courses: ["main", "snack", "dessert", "drink"], feast: true, first: /торт|наггетс|капкейк|пицц/i },
  { re: /день рожд\p{L}*|днюх\p{L}*|юбиле\p{L}*|именин\p{L}*/u, tag: "holiday", say: "На день рождения — праздничный стол:", courses: ["salad", "main", "snack", "dessert"], feast: true,
    first: /торт|наполеон|медовик|оливье|шуб|мимоз|запеч[её]нн|буженин|рулет/i },
];

// Course words keep the answer to that course: «салаты на Новый год».
const COURSES: [RegExp, (r: Recipe) => boolean][] = [
  [/салат\p{L}*/u, (r) => courseOf(r) === "salad"],
  [/горяч\p{L}*|основн\p{L}* блюд\p{L}*/u, (r) => courseOf(r) === "main"],
  [/закуск\p{L}*/u, (r) => courseOf(r) === "snack"],
  [/десерт\p{L}*|сладк\p{L}*|торт\p{L}*/u, SWEET],
  [/выпечк\p{L}*|пирог\p{L}*/u, (r) => courseOf(r) === "baking"],
];
// What may stand around the occasion without changing the request.
const FILLER = /(?<!\p{L})(?:что|бы|можно|нужно|надо|приготовить|готовить|сделать|испечь|подать|поставить|на|к|ко|в|для|и|а|мне|нам|блюд\p{L}*|рецепт\p{L}*|меню|стол\p{L}*|праздничн\p{L}*|идеи|посоветуй|подскажи|хочу|какие|какое|какой|взять|с собой|у|всех|гостей|наш\p{L}*|мой|моего|моей|любимой|любимого|мамы|мамин|папы|папин|жены|мужа|бабушки|дедушки|сына|дочери|дочки|ребенка|детей|малыша|день|праздник\p{L}*)(?!\p{L})/gu;

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[?!.,:;«»"]/g, " ").replace(/\s+/g, " ").trim();

/** «на 8 марта» is a day, not 8 portions: dates are taken out before the request is read. */
export function dropDates(text: string): string {
  return text.replace(/(?<!\d)(\d{1,2})\s+(январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр)\p{L}*/giu, " ").replace(/\s+/g, " ").trim();
}

export interface OccasionAnswer { text: string; results: Recipe[]; go?: ChatGo }

/**
 * The answer for a request that is an occasion and nothing more (a course word may stay: «салаты на Новый год»).
 * `rank` orders a list as the chef would (the person's exclusions, vegetarian, kitchen); null for any other request.
 */
export function occasionAnswer(text: string, all: Recipe[], rank: (list: Recipe[]) => Recipe[]): OccasionAnswer | null {
  const t = norm(text);
  if (!t || t.length > 90) return null;
  const o = OCCASIONS.find((x) => x.re.test(t));
  if (!o) return null;
  // «на 6 человек» changes the amounts on the recipe, not the dishes.
  let rest = t.replace(o.re, " ").replace(/(?<!\p{L})(?:на\s+)?\d+\s+(?:человек\p{L}*|гост\p{L}*|порц\p{L}*|персон\p{L}*)/gu, " ");
  const only = COURSES.filter(([re]) => re.test(rest));
  for (const [re] of only) rest = rest.replace(new RegExp(re.source, "gu"), " ");
  // Anything else said («без мяса», «на 6 человек», «из курицы») is for the usual search, which reads it all.
  if (rest.replace(FILLER, " ").replace(/\s+/g, " ").trim()) return null;
  let pool = all.filter((r) => r.occasions?.includes(o.tag) || o.also?.(r));
  if (only.length) pool = pool.filter((r) => only.some(([, f]) => f(r)));
  // The dishes marked for the day before the ones that only look like it; the classics of the day first; one hot dog,
  // not two («Хот-дог домашний» and «Хот-дог по-французски» read as the same dish).
  const key = (r: Recipe) => (r.occasions?.includes(o.tag) ? 0 : 2) + (o.first?.test(r.title) ? 0 : 1);
  const kind = (r: Recipe) => r.title.toLowerCase().replace(/ё/g, "е").split(/[\s«»(,-]+/)[0];
  const seen = new Set<string>();
  const ranked = rank(pool).map((r, i) => ({ r, i })).sort((a, b) => key(a.r) - key(b.r) || a.i - b.i).map((x) => x.r)
    .filter((r) => !seen.has(kind(r)) && !!seen.add(kind(r)));
  if (!ranked.length) return null;
  // A table, not five salads: one of each course in turn.
  let results = ranked;
  if (!only.length && o.courses) {
    const by = o.courses.map((c) => ranked.filter((r) => (c === "dessert" ? SWEET(r) : courseOf(r) === c)));
    results = [];
    for (let i = 0; results.length < 5 && by.some((l) => l.length > i); i++) for (const l of by) if (l[i] && results.length < 5) results.push(l[i]);
    if (!results.length) results = ranked;
  }
  return {
    text: o.say,
    results: results.slice(0, 5),
    ...(o.feast ? { go: { label: "Собрать праздничный стол", to: "feast", icon: "feast" } } : {}),
  };
}
