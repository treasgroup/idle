// When Шеф did not understand: «Не до конца понял. Может, вы имели в виду…» with up to three requests close to what
// was typed — dishes from the catalog with similar names, and phrasings Шеф understands well.
import { searchRecipes, type ChatOption } from "../engine";

const KNOWN = [
  "что приготовить на ужин", "что-нибудь быстрое на ужин", "есть курица и картошка", "суп на обед", "что приготовить из фарша",
  "лёгкий ужин", "что приготовить ребёнку", "блюда без мяса", "что испечь к чаю", "завтрак на скорую руку", "что-нибудь сладкое",
  "салат на праздник", "постное блюдо", "из того, что есть в холодильнике", "что приготовить из курицы", "рыба на ужин",
  "гарнир к мясу", "сколько варить гречку", "чем заменить сметану", "сколько запекать курицу 1,5 кг", "2 стакана муки это сколько грамм",
  "что приготовить на день рождения", "ужин до 400 ккал", "блюда с белком", "ужин без духовки", "что приготовить в мультиварке",
  "что приготовить в аэрогриле", "каша на завтрак", "что приготовить из кабачков", "что приготовить из тыквы", "что приготовить из картошки",
  "что приготовить из яиц", "что приготовить из творога", "пирог с яблоками", "блины на молоке", "что сделать с остатками",
  "что приготовить при диабете", "щадящее блюдо для желудка", "недорогой ужин из простых продуктов", "что приготовить на неделю",
  "чем накормить семью на ужин", "быстрый ужин после работы", "сытный обед для мужа", "что взять на работу пообедать",
];
const STOP = new Set(["что", "чем", "как", "кто", "где", "когда", "какой", "какую", "какое", "мне", "для", "есть", "или", "это", "все", "уже", "так", "там", "тут", "еще", "ещё", "нибудь", "можно", "хочу", "надо", "нужно", "приготовить", "сделать", "бы", "был", "было"]);
// Four first letters are enough to see the same word in another form (тыквы — тыквенный, ужин — ужина).
const stems = (t: string) => t.toLowerCase().replace(/ё/g, "е").split(/[^a-zа-я0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.slice(0, 4));

export function didYouMean(text: string): ChatOption[] {
  const typed = stems(text);
  if (!typed.length) return [];
  const mine = { has: (s: string) => typed.some((x) => x.startsWith(s) || s.startsWith(x)) };
  const out: ChatOption[] = [];
  // Dishes with a similar name («шарлотка» typed as «шарлоткуу», «плофф»…).
  for (const r of searchRecipes(text).slice(0, 6)) {
    if (out.length >= 2) break;
    if (stems(r.title).some((s) => mine.has(s))) out.push({ label: r.title, open: r.id });
  }
  const scored = KNOWN.map((k) => ({ k, n: stems(k).filter((s) => mine.has(s)).length })).filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.k.length - b.k.length);
  for (const { k } of scored) {
    if (out.length >= 3) break;
    out.push({ label: k.charAt(0).toUpperCase() + k.slice(1), text: k });
  }
  return out;
}
