// A picture for a dish that has no photo yet: an emoji chosen by what the dish is (title first, then the main
// product, then the course) on a plate, over a soft colour of its kind. Real covers replace it as they appear.
import { courseOf, type Recipe } from "../engine";

const BY_TITLE: [RegExp, string][] = [
  [/блин|оладь|сырник|панкейк|драник/i, "🥞"],
  [/пицц/i, "🍕"],
  [/бургер|гамбургер/i, "🍔"],
  [/шаурм|буррито|лаваш|ролл с/i, "🌯"],
  [/тако|кесадиль|начос/i, "🌮"],
  [/пельмен|вареник|манты|хинкали|дамплинг|гёдза|позы|чебурек/i, "🥟"],
  [/суши|ролл/i, "🍣"],
  [/рамен|удон|фо бо|лапш/i, "🍜"],
  [/суп|борщ|(?<![а-яё])щи(?![а-яё])|солянк|харчо|уха|рассольник|окрошк|бульон|похл[её]бк|гаспачо|крем-суп/i, "🍲"],
  [/салат|винегрет|оливье/i, "🥗"],
  [/котлет|фрикадел|тефтел|биточк|зраз/i, "🧆"],
  [/паст|спагетти|макарон|феттучин|пенне|лазань|карбонар/i, "🍝"],
  [/голубц/i, "🥬"],
  [/плов|ризотто|паэль|(?<![а-яё])рис(?![а-яё])|рисом|рисов|бирьяни/i, "🍚"],
  [/карри|(?<![а-яё])дал(?![а-яё])|тикка/i, "🍛"],
  [/шашлык|кебаб|люля|шпажк/i, "🍢"],
  [/кревет/i, "🍤"],
  [/омлет|яичниц|шакшук|фриттат|яйц|скрэмбл/i, "🍳"],
  [/каша|овсян|гранол|мюсли/i, "🥣"],
  [/торт|пирожн|чизкейк|тирамису|наполеон|медовик/i, "🍰"],
  [/кекс|маффин|капкейк/i, "🧁"],
  [/печень[ея]|пряник|крекер/i, "🍪"],
  [/пирог|пирож|киш|шарлотк|галет|ватрушк|расстега|кулебяк|штрудел/i, "🥧"],
  [/хлеб|булоч|багет|чиабатт|лепёшк|лепешк|фокачч/i, "🍞"],
  [/бутерброд|тост|сэндвич|брускетт|кроке?-?мсье/i, "🥪"],
  [/мороженое|сорбет|парфе/i, "🍨"],
  [/желе|пудинг|панна-?котт|мусс/i, "🍮"],
  [/смузи|коктейл|компот|морс|лимонад|(?<![а-яё])чай|какао|кисель|напит|(?<![а-яё])сок(?![а-яё])/i, "🥤"],
  [/^(соус|подлив|заправк|песто|майонез|кетчуп|аджик)/i, "🫙"],
  [/рыб|минта|судак|лосос|сёмг|семг|форел|треск|скумбри|сельд|хек|горбуш|тунец|кальмар|мид[иі]/i, "🐟"],
  [/куриц|курин|цыпл|индейк|утк|грудк|бёдр|бедр|крыл/i, "🍗"],
  [/говяд|свинин|баранин|телятин|стейк|мяс|рёбр|ребр|(?<![а-яё])печен[ьи](?![а-яё])|гуляш|бефстроганов|отбивн/i, "🥩"],
  [/картоф|картош|пюре/i, "🥔"],
  [/гриб|шампиньон/i, "🍄"],
  [/тыкв/i, "🎃"],
  [/баклажан/i, "🍆"],
  [/кабач|цукин|рагу|овощ|перц/i, "🥘"],
  [/капуст|брокколи|цветн/i, "🥦"],
  [/морков/i, "🥕"],
  [/яблок|груш/i, "🍎"],
  [/творог|сыр/i, "🧀"],
];

const BY_INGREDIENT: [RegExp, string][] = [
  [/chicken|turkey|duck/, "🍗"], [/beef|pork|lamb|veal|minced|liver/, "🥩"], [/pollock|salmon|cod|fish|tuna|trout|mackerel|herring|hake/, "🐟"],
  [/shrimp|squid|mussel/, "🍤"], [/potato/, "🥔"], [/pasta|spaghetti|noodle/, "🍝"], [/rice/, "🍚"], [/egg/, "🍳"], [/mushroom/, "🍄"],
  [/cottage-cheese|cheese/, "🧀"], [/flour/, "🥧"], [/cabbage|cauliflower|broccoli/, "🥦"], [/eggplant/, "🍆"], [/pumpkin/, "🎃"],
  [/apple|pear/, "🍎"], [/cherry|berry|strawberr/, "🍒"], [/buckwheat|millet|oat|semolina/, "🥣"], [/lentil|bean|chickpea|pea/, "🫘"],
];

const BY_COURSE: Record<string, string> = {
  soup: "🍲", main: "🍽️", side: "🍚", salad: "🥗", breakfast: "🍳", baking: "🥧", dessert: "🍰", snack: "🥪", sauce: "🫙", drink: "🥤",
};

// Soft colours by kind of dish (light theme; shown at low opacity in the dark one).
const TINT: Record<string, [string, string]> = {
  soup: ["#F8E4C8", "#EFC99B"], main: ["#F6DDD2", "#EAB9A5"], side: ["#EFE6D6", "#DCCBAE"], salad: ["#E3EFD5", "#BFD9A7"],
  breakfast: ["#FAEDC2", "#F1D682"], baking: ["#F5E6CC", "#E6C796"], dessert: ["#F8E0E5", "#EDBAC5"], snack: ["#F1E6D7", "#DFC9AA"],
  sauce: ["#F6D9CF", "#E7AE9B"], drink: ["#DCEEEE", "#A9D3D3"],
};

const cache = new Map<string, string>();
export function dishEmoji(r: Recipe): string {
  const hit = cache.get(r.id);
  if (hit) return hit;
  const main = (r as Recipe & { mainIngredient?: string }).mainIngredient ?? "";
  const e = BY_TITLE.find(([re]) => re.test(r.title))?.[1]
    ?? BY_INGREDIENT.find(([re]) => re.test(main))?.[1]
    ?? BY_COURSE[courseOf(r)] ?? "🍽️";
  cache.set(r.id, e);
  return e;
}

export function dishTint(r: Recipe): [string, string] {
  return TINT[courseOf(r)] ?? TINT.main;
}

/** A small stable variation per dish (light angle, tilt), so a row of soups does not look copy-pasted. */
export function dishVariant(r: Recipe): { angle: number; tilt: number; x: number } {
  let h = 0;
  for (const c of r.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const u = (k: number) => (((h >>> k) & 0xff) / 255);
  return { angle: Math.round(u(0) * 360), tilt: Math.round((u(8) - 0.5) * 24), x: Math.round(20 + u(16) * 60) };
}
