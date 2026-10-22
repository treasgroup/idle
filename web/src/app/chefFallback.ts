// When Шеф's parser understood nothing: before «Не понял», two more tries.
// 1. Phrases it should know but the parser has no words for: «что-нибудь вкусненькое», «нечего есть», «на работу».
// 2. The words as a title search, with the little forms people type: «тортик» → торт, «уху» → уха, «пицу» → пицца,
//    «хочу том ям» (two-letter words the parser drops).
import { CATALOG_SECTIONS, courseOf, isUnusual, searchRecipes, type Conditions, type Recipe } from "../engine";

type Said = { text: string; conditions?: Partial<Conditions>; only?: (r: Recipe) => boolean; shuffle?: boolean };
const section = (key: string) => CATALOG_SECTIONS.find((x) => x.key === key)?.test;
const PHRASES: [RegExp, Said][] = [
  [/(вкусненьк|вкуснятин|побаловать|порадовать себя|что-то вкусное|чего-то вкусного)/, { text: "Чем себя порадовать:", conditions: { mood: "comfort" } }],
  [/(необычн|что-то нов|что-нибудь нов|новенькое|экзотик|не как обычно|удивить гостей)/, { text: "Из необычного:", only: (r) => isUnusual(r), shuffle: true }],
  [/(нечего есть|нечего поесть|не знаю,? что (приготовить|поесть|сделать)|что бы поесть|чего бы поесть|что поесть|ч[её] поесть|ч[её] приготовить)/, { text: "Вот что можно приготовить:", only: (r) => ["main", "soup"].includes(courseOf(r)) }],
  [/(на работу|с собой|в контейнер|ланчбокс|ланч-бокс|на обед в офис)/, { text: "Хорошо переносит дорогу и разогрев:", only: (r) => !!section("reheat")?.(r) && (r.storageDays ?? 0) >= 1 }],
  [/(с белком|белков|протеин|побольше белка)/, { text: "Блюда, где белка 25 г и больше на порцию:", conditions: { minProtein: 25 } as Partial<Conditions> }],
];
export function saidAnswer(text: string): Said | null {
  const t = text.toLowerCase().replace(/ё/g, "е");
  return PHRASES.find(([re]) => re.test(t))?.[1] ?? null;
}

const FILLER = /(^|\s)(хочу|хочется|хотим|можно|давай|сделай|сделать|сварить|свари|приготовь|приготовить|испечь|пожарить|рецепт|рецепты|как|мне|бы|а|есть|ли|пожалуйста)(?=\s|$)/g;
const FORMS: [RegExp, string][] = [
  [/^пиц[уые]?$|^пица$/, "пицца"], [/^тортик\S*$/, "торт"], [/^уху$/, "уха"], [/^супчик\S*$/, "суп"], [/^салатик\S*$/, "салат"],
  [/^котлетк\S*$/, "котлеты"], [/^пирожок$|^пирожочк\S*$/, "пирожки"], [/^блинчик\S*$/, "блины"], [/^кашк\S*$/, "каша"],
  [/^картох\S*$|^картошечк\S*$/, "картошка"], [/^оливъе$/, "оливье"], [/^шарлотк[уи]$/, "шарлотка"],
];
/** «хочу том ям», «тортик», «сварить уху»: the dishes whose titles have these words, or null. */
export function titleAnswer(text: string): { text: string; results: Recipe[] } | null {
  const words = text.toLowerCase().replace(/ё/g, "е").replace(/[?!.,]/g, " ").replace(FILLER, " ").trim().split(/\s+/).filter(Boolean)
    .map((w) => FORMS.find(([re]) => re.test(w))?.[1] ?? w);
  if (!words.length) return null;
  const q = words.join(" ");
  const list = searchRecipes(q);
  const first = words.find((w) => w.length >= 2) ?? "";
  const stem = first.slice(0, Math.max(2, first.length - 1));
  if (!list.length || !list[0].title.toLowerCase().replace(/ё/g, "е").includes(stem)) return null;
  return { text: "Нашёл по запросу «" + q + "»:", results: list.slice(0, 5) };
}

/** The phrase's dishes: those the condition or test allows, a different order each day for the «necessary» ones. */
export function saidPick(s: Said, base: Recipe[], now = new Date()): Recipe[] {
  const list = s.only ? base.filter(s.only) : base;
  if (!s.shuffle) return list;
  const day = Math.floor(now.getTime() / 864e5);
  return list.map((r, i) => ({ r, k: (i * 7919 + day * 104729) % 9973 })).sort((a, b) => a.k - b.k).map((x) => x.r);
}
