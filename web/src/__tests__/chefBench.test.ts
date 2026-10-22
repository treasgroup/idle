// A bench for Шеф: hundreds of requests written the way people write them, with automatic checks; writes a report
// to read (C:/Users/fensi/AppData/Local/Temp/cw/chef-bench.txt). Runs only with CHEF_BENCH=1 (npx vitest run chefBench).
import { writeFileSync } from "node:fs";
import { beforeAll, test } from "vitest";
import { DEFAULT_CONDITIONS, cleanMessage, courseOf, ingredientMatches, isLenten, matchesDish, parseMessage, recipes, type Match } from "../engine";
import { fixBySound, plainWords } from "../app/colloquial";
import { titleSounds } from "../app/assistant";
import { loadCatalog, turn } from "./chefTurn";

beforeAll(loadCatalog);

// ---------- Requests ----------
type Q = { q: string; has?: string[]; no?: string[]; max?: number; course?: string[]; dish?: string; kids?: boolean; lent?: boolean; veg?: boolean; talk?: boolean; sweet?: boolean };
const P: [string, string][] = [ // word as typed → ingredient id
  ["курица", "chicken"], ["фарш", "minced-meat"], ["картошка", "potato"], ["рис", "rice"], ["гречка", "buckwheat"], ["макароны", "pasta"],
  ["яйца", "egg"], ["творог", "cottage-cheese"], ["кабачки", "zucchini"], ["тыква", "pumpkin"], ["капуста", "cabbage"], ["свёкла", "beet"],
  ["морковь", "carrot"], ["грибы", "mushroom"], ["сыр", "cheese"], ["помидоры", "tomato"], ["огурцы", "cucumber"], ["рыба", "fish"],
  ["печень", "liver"], ["свинина", "pork"], ["говядина", "beef"], ["индейка", "turkey"], ["сосиски", "sausages"], ["лаваш", "lavash"],
  ["кефир", "kefir"], ["сметана", "sour-cream"], ["баклажаны", "eggplant"], ["фасоль", "beans"], ["чечевица", "lentils"], ["тунец", "tuna"],
  ["креветки", "shrimp"], ["яблоки", "apple"], ["бананы", "banana"], ["молоко", "milk"], ["брокколи", "broccoli"], ["пельмени", "dumplings"],
];
const Qs: Q[] = [];
for (const [w] of P) Qs.push({ q: "что приготовить из " + w, has: [w] });
for (let i = 0; i < P.length; i++) { const a = P[i][0], b = P[(i * 7 + 3) % P.length][0]; if (a !== b) Qs.push({ q: "есть " + a + " и " + b, has: [a, b] }); }
for (let i = 0; i < 18; i++) { const a = P[i][0], b = P[(i + 5) % P.length][0], c = P[(i + 11) % P.length][0]; Qs.push({ q: a + " " + b + " " + c, has: [a, b, c] }); }
const hand: Q[] = [
  // dishes by name
  ...["борщ", "плов", "сырники", "блины", "оливье", "окрошка", "солянка", "голубцы", "пельмени", "котлеты", "шарлотка", "лазанья", "карбонара", "рататуй",
    "хачапури", "харчо", "лагман", "манты", "чебуреки", "беляши", "драники", "оладьи", "запеканка", "омлет", "шакшука", "гуляш", "бефстроганов", "жаркое",
    "щи", "уха", "рассольник", "пицца", "тирамису", "наполеон", "медовик", "пирожки", "вареники", "хинкали", "шаурма", "шашлык", "цезарь", "винегрет",
    "селёдка под шубой", "мимоза", "греческий салат", "крабовый салат", "сельдь под шубой", "холодец", "бургер", "суши", "роллы", "паэлья", "ризотто",
    "фунчоза", "рамен", "том ям", "фо бо", "чизкейк", "брауни", "панкейки", "гренки", "каша", "пшённая каша", "овсянка", "кисель", "компот", "морс"]
    .map((d): Q => ({ q: "хочу " + d, dish: d })),
  ...["рецепт борща", "как сделать сырники", "приготовь плов", "давай котлеты", "а есть хинкали?", "можно пиццу", "сварить уху", "испечь шарлотку", "пожарить драники"].map((q): Q => ({ q, dish: q.split(" ").pop()!.replace(/[?]/g, "") })),
  // conditions
  { q: "что приготовить на ужин" }, { q: "что-нибудь быстрое на ужин", max: 35 }, { q: "ужин за 20 минут", max: 20 }, { q: "обед за полчаса", max: 30 },
  { q: "быстрый завтрак", max: 30 }, { q: "что приготовить на завтрак", course: ["breakfast"] }, { q: "суп на обед", course: ["soup"] }, { q: "лёгкий ужин" },
  { q: "сытный ужин" }, { q: "что-нибудь сладкое", sweet: true }, { q: "десерт к чаю", sweet: true }, { q: "что испечь к чаю", course: ["baking", "dessert"] },
  { q: "салат на праздник", course: ["salad"] }, { q: "что приготовить на день рождения" }, { q: "блюда без мяса", veg: true }, { q: "постное блюдо", lent: true },
  { q: "что приготовить в пост", lent: true }, { q: "что приготовить ребёнку", kids: true }, { q: "ребенок не ест мясо, что приготовить", kids: true, veg: true },
  { q: "ужин без духовки" }, { q: "в мультиварке" }, { q: "что приготовить в аэрогриле" }, { q: "в микроволновке за 10 минут", max: 15 },
  { q: "суп без мяса", course: ["soup"], veg: true }, { q: "салат без майонеза", course: ["salad"] }, { q: "ужин до 400 ккал" }, { q: "блюда с белком" },
  { q: "недорогой ужин из простых продуктов" }, { q: "что взять на работу пообедать" }, { q: "на неделю вперёд" }, { q: "что приготовить на двоих" },
  { q: "на компанию из 8 человек" }, { q: "романтический ужин" }, { q: "что приготовить если заболел" }, { q: "при диабете" }, { q: "щадящее для желудка" },
  { q: "без лука", no: ["onion"] }, { q: "курица без грибов", has: ["курица"], no: ["mushroom"] }, { q: "фарш без духовки", has: ["фарш"] },
  { q: "картошка и мясо", has: ["картошка"] }, { q: "что-нибудь с курицей и сыром", has: ["курица", "сыр"] }, { q: "остался рис", has: ["рис"] },
  { q: "осталась варёная курица" }, { q: "куда деть кабачки", has: ["кабачки"] }, { q: "много яблок что сделать", has: ["яблоки"] },
  { q: "нечего есть" }, { q: "лень готовить" }, { q: "удиви меня" }, { q: "что-нибудь необычное" }, { q: "что-нибудь вкусненькое" },
  { q: "хочу горячего" }, { q: "холодно на улице" }, { q: "жарко, хочу чего-то лёгкого" }, { q: "устал после работы" },
  { q: "пп ужин" }, { q: "диетическое" }, { q: "на гарнир к мясу" }, { q: "гарнир к рыбе" }, { q: "что выпить" }, { q: "соус к макаронам" },
  // typos and slang
  { q: "борш", dish: "борщ" }, { q: "плоф", dish: "плов" }, { q: "сырнеки", dish: "сырники" }, { q: "макороны с сыром", has: ["макароны"] },
  { q: "курицца", has: ["курица"] }, { q: "картоха", has: ["картошка"] }, { q: "картошечка с мясом", has: ["картошка"] }, { q: "яишница" },
  { q: "чё поесть" }, { q: "че приготовить" }, { q: "хачапури по аджарски", dish: "хачапури" }, { q: "пицу", dish: "пицца" }, { q: "шарлотку", dish: "шарлотка" },
  { q: "окрошку на квасе", dish: "окрошка" }, { q: "блинчики с творогом", dish: "блин" }, { q: "котлетки", dish: "котлеты" }, { q: "супчик", course: ["soup"] },
  { q: "салатик", course: ["salad"] }, { q: "кашку", course: ["breakfast"] }, { q: "пирог", course: ["baking"] }, { q: "тортик", sweet: true },
  // kitchen questions
  { q: "сколько варить гречку", talk: true }, { q: "сколько грамм в стакане муки", talk: true }, { q: "чем заменить сметану", talk: true },
  { q: "сколько запекать курицу 1,5 кг", talk: true }, { q: "как сварить яйцо всмятку", talk: true }, { q: "где мой список покупок", talk: true },
];
Qs.push(...hand);

// ---------- Checks ----------
const hasAny = (m: Match, ids: string[]) => m.recipe.ingredients.some((i) => ids.some((x) => ingredientMatches(i.id, x)));
const titleHas = (m: Match, w: string) => m.recipe.title.toLowerCase().replace(/ё/g, "е").includes(w.toLowerCase().replace(/ё/g, "е").slice(0, Math.max(3, w.length - 2)));

test.skipIf(!process.env.CHEF_BENCH)("Шеф: bench", () => {
  const lines: string[] = [], bad: Record<string, string[]> = {};
  const fail = (k: string, s: string) => (bad[k] ??= []).push(s);
  for (const x of Qs) {
    const t = turn(x.q);
    const top = t.results.slice(0, 3);
    const titles = top.map((m) => m.recipe.title + " [" + courseOf(m.recipe) + "," + m.recipe.totalMinutes + "]").join(" | ");
    lines.push(`${x.q} → ${t.kind}/${t.via} «${t.text.slice(0, 70)}» :: ${titles}`);
    const tag = x.q + " → " + titles + " «" + t.text.slice(0, 60) + "»";
    if (x.talk) { if (t.results.length && t.kind !== "talk" && t.via !== "nav") fail("talk-gave-recipes", tag); continue; }
    if (t.kind === "unclear") { fail("unclear", tag); continue; }
    if (!t.results.length) { fail("no-results", tag); continue; }
    if (x.dish && !top.some((m) => titleHas(m, x.dish!) || matchesDish(m.recipe, "dish:" + x.dish))) fail(t.kind === "near" ? "dish-missing(near)" : "dish-not-first", tag);
    if (x.has) {
      // The product ids as Шеф understood them (the bench does not guess the catalog ids).
      const p = parseMessage(cleanMessage(fixBySound(plainWords(x.q), titleSounds())), { ...DEFAULT_CONDITIONS, servings: 2 });
      const ids = [...((p.availableAdd as string[]) ?? []), ...((p.desiredAdd as string[]) ?? [])].filter((d) => !d.includes(":"));
      if (ids.length < Math.min(x.has.length, 2)) fail("product-not-understood", tag + " ids=" + ids.join(","));
      if (ids.length && !hasAny(top[0], ids)) fail("product-not-in-first", tag);
      // Only when the catalog has a dish with all of them: then it should be among the first three.
      const exists = ids.length >= 2 && recipes().some((r) => ids.every((id) => r.ingredients.some((i) => ingredientMatches(i.id, id))));
      if (exists && !top.some((m) => ids.every((id) => hasAny(m, [id])))) fail("no-dish-with-all", tag);
    }
    if (x.no && top.some((m) => hasAny(m, x.no!))) fail("excluded-present", tag);
    if (x.max && top.some((m) => m.recipe.totalMinutes > x.max! + 5)) fail("too-long", tag);
    if (x.course && !x.course.includes(courseOf(top[0].recipe))) fail("wrong-course", tag);
    if (x.sweet && !top[0].recipe.tags.includes("sweet")) fail("not-sweet", tag);
    if (x.kids && !top.every((m) => m.recipe.kids !== false)) fail("not-for-kids", tag);
    if (x.lent && !top.every((m) => isLenten(m.recipe))) fail("not-lenten", tag);
    if (x.veg && !top.every((m) => m.recipe.tags.includes("vegetarian"))) fail("has-meat", tag);
    if (!x.dish && !x.course && t.via === "chef" && ["side", "sauce", "drink"].includes(courseOf(top[0].recipe)) && !/гарнир|соус|выпить|напит/.test(x.q)) fail("side-first", tag);
    if (new Set(top.map((m) => m.recipe.title.split(" ")[0])).size === 1 && top.length === 3 && !x.dish) fail("all-same", tag);
  }
  const report = ["ВСЕГО " + Qs.length + ", с замечаниями: " + new Set(Object.values(bad).flat().map((s) => s.split(" → ")[0])).size, "",
    ...Object.entries(bad).sort((a, b) => b[1].length - a[1].length).flatMap(([k, v]) => ["## " + k + " (" + v.length + ")", ...v, ""]), "", "## ВСЕ ОТВЕТЫ", ...lines];
  writeFileSync("C:/Users/fensi/AppData/Local/Temp/cw/chef-bench.txt", report.join("\n"));
  console.log(report.slice(0, 2).join(" ") + " | " + Object.entries(bad).map(([k, v]) => k + ":" + v.length).join(", "));
});
