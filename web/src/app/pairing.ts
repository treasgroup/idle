// What goes with a dish, and what to drink. The recipe page's «Добавить гарнир» had only six built-in sides (пюре,
// гречка, макароны, рис, салат, капуста) while the catalog has 46 real side recipes; now two of them that suit the dish
// come after the classics. Шеф answers «гарнир к котлетам», «с чем подать рыбу», «что выпить» from the catalog.
import { courseOf, ingredientMatches, recipes, searchRecipes, suggestSides, type Match, type Recipe } from "../engine";

// Catalog sides by kind of dish, best first (titles from the catalog; the ones missing in it are skipped).
const PAIRS: [RegExp, string[]][] = [
  [/(рыб|минтай|горбуш|лосос|треск|судак|хек|скумбри|сельд|форел|тунец|креветк|кальмар)/, ["Стручковая фасоль с чесноком", "Тушёные овощи на гарнир", "Отварной картофель с укропом", "Пюре из цветной капусты", "Рис с кукурузой и зелёным горошком", "Булгур отварной"]],
  [/(печен)/, ["Отварной картофель с укропом", "Тушёная морковь со сметаной", "Тушёные овощи на гарнир"]],
  [/(свин|буженин|отбивн|шницел|колбас|сосис|рульк|сардел)/, ["Капуста тушёная с морковью", "Отварной картофель с укропом", "Капуста квашеная тушёная с грибами"]],
  [/(гуляш|бефстроган|подлив|соус|тефтел|фрикадел|азу)/, ["Отварной картофель с укропом", "Булгур отварной", "Перловка рассыпчатая", "Пшено рассыпчатое"]],
  [/(котлет|биточ|зраз|тефтел)/, ["Отварной картофель с укропом", "Тушёные овощи на гарнир", "Тушёная морковь со сметаной", "Булгур отварной"]],
  [/(куриц|курин|индейк|утк|гус|кролик)/, ["Отварной картофель с укропом", "Тушёные овощи на гарнир", "Батат дольками в духовке", "Булгур отварной", "Кускус с маслом и зеленью"]],
  [/./, ["Отварной картофель с укропом", "Тушёные овощи на гарнир", "Батат дольками в духовке", "Стручковая фасоль с чесноком", "Булгур отварной"]],
];
// The classic built-in sides as catalog recipes, for Шеф (a chat card opens a catalog recipe).
const CLASSIC: Record<string, string> = { "side-buckwheat": "Гречка рассыпчатая", "side-rice": "Рис рассыпчатый", "side-pasta": "Макароны отварные", "side-cabbage": "Капуста тушёная с морковью" };

const byTitle = (title: string) => recipes().find((r) => r.title === title);
const allowed = (r: Recipe, exclude: string[]) =>
  !r.allergens.some((a) => exclude.includes(a)) && !r.ingredients.some((i) => !i.optional && exclude.some((x) => ingredientMatches(i.id, x)));

/** Up to n catalog side recipes that suit the dish, in order of fit. */
export function catalogSides(main: Recipe, exclude: string[] = [], n = 2): Recipe[] {
  const words = ((main.mainIngredient ?? "") + " " + main.title).toLowerCase();
  const titles = PAIRS.find(([re]) => re.test(words))![1];
  return titles.map(byTitle).filter((r): r is Recipe => !!r && r.id !== main.id && allowed(r, exclude)).slice(0, n);
}

const match = (recipe: Recipe, reason: string): Match => ({ recipe, available: [], missing: [], unknown: [], toBuy: [], reason });

const SIDE_ASK = /(гарнир|что подать|с чем (?:подать|есть|съесть|подавать)|чем дополнить)/;
/** «гарнир к котлетам», «с чем подать рыбу», «что подать к курице»: the dish found by its name, its sides. */
export function sideAnswer(text: string): { text: string; results: Match[] } | null {
  const t = text.toLowerCase().replace(/ё/g, "е");
  if (!SIDE_ASK.test(t)) return null;
  const rest = t.replace(SIDE_ASK, " ").replace(/(^|\s)(какой|какие|лучше|подойдет|подойдут|к|ко|для|а|на|ужин|нужен|сделать|приготовить|мне)(?=\s|$)/g, " ").replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();
  const mains = recipes().filter((r) => ["main", "soup"].includes(courseOf(r)));
  const main = rest ? searchRecipes(rest, mains)[0] : undefined;
  if (rest && !main) return null; // «гарнир из кабачков» is a side dish to search for, not a pairing
  const base = main ?? mains.find((r) => r.title === "Котлеты домашние") ?? mains[0];
  const classic = suggestSides(base).map((s) => CLASSIC[s.id]).filter(Boolean).map((title) => byTitle(title)).filter((r): r is Recipe => !!r);
  const list = [...new Map([...classic.slice(0, 1), ...catalogSides(base, [], 3)].map((r) => [r.id, r])).values()].slice(0, 3);
  if (!list.length) return null;
  return {
    // «гарнир к рыбе» names a kind of dish, not one recipe: «… и похожим блюдам».
    text: main ? "К «" + main.title + "»" + (rest.split(" ").length === 1 ? " и похожим блюдам" : "") + " подойдут:" : "Гарниры, которые подходят почти ко всему:",
    results: list.map((r) => match(r, r.summary)),
  };
}

const DRINK_ASK = /((что|чего)\s+(бы\s+)?(выпить|попить)|^попить|напит(ок|ки|ков|ка)|что-нибудь\s+попить)/;
const WARM = /(чай|какао|шоколад|сбитень|глинтвейн|кофе|латте|раф|кисель молочный)/i;
/** «что выпить», «какой напиток сделать»: drinks from the catalog, warm ones in the cold months. */
export function drinkAnswer(text: string, now = new Date()): { text: string; results: Match[] } | null {
  const t = text.toLowerCase().replace(/ё/g, "е");
  if (!DRINK_ASK.test(t)) return null;
  const drinks = recipes().filter((r) => courseOf(r) === "drink");
  if (!drinks.length) return null;
  const cold = [9, 10, 11, 0, 1, 2, 3].includes(now.getMonth()); // October to April
  const day = Math.floor(now.getTime() / 864e5);
  const order = drinks.map((r, i) => ({ r, k: (WARM.test(r.title) === cold ? 0 : 1) * 1000 + ((i * 7919 + day * 104729) % 997) }))
    .sort((a, b) => a.k - b.k).map((x) => x.r);
  return { text: cold ? "Что-нибудь согревающее:" : "Что можно сделать попить:", results: order.slice(0, 3).map((r) => match(r, r.summary)) };
}
