// «Получится …» on a recipe page, said in words that survive scaling to the number of eaters. The catalog writes the
// yield for its own servings («1 форма 22 см», «24 фрикадельки»); the engine's yieldText only multiplies the number,
// which gave «около 0,7 форма 22 см» and «12 фрикадельки».
import { plural, type Recipe } from "../engine";

// Words the catalog counts in, each as «1 / 2 / 5» forms (and «батоны»-like plurals the catalog also writes). The
// unit's first word is looked up in any of its forms.
const FORMS: [string, string, string, ...string[]][] = [
  ["форма", "формы", "форм"], ["торт", "торта", "тортов"], ["пирог", "пирога", "пирогов"], ["рулет", "рулета", "рулетов"],
  ["лепёшка", "лепёшки", "лепёшек"], ["пицца", "пиццы", "пицц"], ["кусок", "куска", "кусков"], ["кусочек", "кусочка", "кусочков"],
  ["ломтик", "ломтика", "ломтиков", "ломтики"], ["бутерброд", "бутерброда", "бутербродов"], ["тарелка", "тарелки", "тарелок"],
  ["биточек", "биточка", "биточков"], ["креманка", "креманки", "креманок"], ["стакан", "стакана", "стаканов"],
  ["стаканчик", "стаканчика", "стаканчиков"], ["чашка", "чашки", "чашек"], ["фрикаделька", "фрикадельки", "фрикаделек"],
  ["сэндвич", "сэндвича", "сэндвичей", "сэндвичи"], ["шницель", "шницеля", "шницелей", "шницели"], ["батон", "батона", "батонов", "батоны"],
  ["буханка", "буханки", "буханок"], ["половинка", "половинки", "половинок"], ["ролл", "ролла", "роллов"],
  ["кесадилья", "кесадильи", "кесадилий"], ["блин", "блина", "блинов"], ["шпажка", "шпажки", "шпажек"],
  ["палочка", "палочки", "палочек"], ["шарик", "шарика", "шариков"], ["рулетик", "рулетика", "рулетиков"],
  ["штука", "штуки", "штук"], ["кулич", "кулича", "куличей"], ["галушка", "галушки", "галушек"],
  ["горшочек", "горшочка", "горшочков"], ["трубочка", "трубочки", "трубочек"], ["рулончик", "рулончика", "рулончиков"],
  ["котлета", "котлеты", "котлет"], ["вонтон", "вонтона", "вонтонов"], ["штоллен", "штоллена", "штолленов"],
  ["квадрат", "квадрата", "квадратов"], ["гирос", "гироса", "гиросов"], ["конверт", "конверта", "конвертов"],
  ["розочка", "розочки", "розочек"], ["веер", "веера", "вееров"], ["домик", "домика", "домиков"],
  ["лодочка", "лодочки", "лодочек"], ["кюфта", "кюфты", "кюфт"], ["рыба", "рыбы", "рыб"], ["пирожок", "пирожка", "пирожков"],
];

/** «форма 22 см» for 3 → «3 формы 22 см»; a word it does not know stays as written. */
function counted(n: number, unit: string): string {
  const [first, ...rest] = unit.trim().split(/\s+/);
  const row = FORMS.find((f) => f.includes(first.toLowerCase()));
  const word = row ? plural(n, row[0], row[1], row[2]) : first;
  return [String(n).replace(".", ","), word, ...rest].join(" ");
}

// Pans, cakes, a loaf — one whole thing the recipe makes, not something counted out.
const COUNTED = /^(л|кг|г|мл|шт\.?)$/;

/** «Получится 12 фрикаделек.», «Получится форма 22 см.», or for a whole pan at another number of eaters: «Целиком
 * рецепт — форма 22 см на 6 человек, на 4 человека — примерно две трети.» Empty when the recipe has no yield. */
export function yieldLine(r: Pick<Recipe, "yields" | "servings">, servings: number): string {
  const y = r.yields;
  if (!y || !(y.amount > 0) || !(r.servings > 0)) return "";
  const k = servings / r.servings;
  const unit = y.unit.trim();
  if (y.amount === 1 && !COUNTED.test(unit)) {
    if (Math.abs(k - 1) <= 0.1) return "Получится " + unit + ".";
    const people = (n: number) => n + " " + plural(n, "человека", "человека", "человек");
    return "Целиком рецепт — " + unit + " на " + people(r.servings) + ", на " + people(servings) + " — " + share(k) + ".";
  }
  const n = y.amount * k;
  // Litres and kilograms to a tenth; things are counted whole.
  const shown = /^(л|кг)$/.test(unit) ? Math.round(n * 10) / 10 : Math.max(1, Math.round(n));
  return ("Получится около " + counted(shown, unit)).replace(/\.?$/, ".");
}

/** How much of the whole recipe: «примерно две трети», «вдвое больше». */
function share(k: number): string {
  if (k < 1) {
    const parts: [number, string][] = [[1 / 4, "четверть"], [1 / 3, "треть"], [1 / 2, "половина"], [2 / 3, "две трети"], [3 / 4, "три четверти"]];
    const [, word] = parts.reduce((a, b) => (Math.abs(b[0] - k) < Math.abs(a[0] - k) ? b : a));
    return "примерно " + word;
  }
  const x = Math.round(k * 2) / 2;
  if (x === 1.5) return "в полтора раза больше";
  if (x === 2) return "вдвое больше";
  if (x === 3) return "втрое больше";
  return "примерно в " + String(x).replace(".", ",") + " раза больше";
}
