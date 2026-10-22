// «Вопрос Шефу» inside a recipe, answered from the recipe itself before any general kitchen note: «сколько варить
// фрикадельки» → the recipe's own step and minutes, not frying times for cutlets; «заменить говядину на свинину» → whether
// that works in this dish. A short follow-up («а про варёные?») is read as the previous question asked again.
// Note: JavaScript's \b does not see Cyrillic letters, so word edges here are (?<![а-я]) / (?![а-я]).
import { ingredient, type Recipe } from "../engine";

export interface RecipeAnswer { text: string; search?: string }

const low = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const words = (s: string) => low(s).match(/[а-я]+/g) ?? [];
const stem = (w: string) => w.slice(0, Math.max(4, Math.min(5, w.length - 2)));
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const minWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "минуту" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "минуты" : "минут");

// ---------- meat and fish families ----------
type Family = "beef" | "pork" | "chicken" | "turkey" | "lamb" | "fish" | "seafood";
const FAMILY: [Family, RegExp][] = [
  ["beef", /говя[дж]|телят|beef/], ["pork", /свин|pork/], ["chicken", /кур(?:иц|ин|ят)|цыпл|chicken/], ["turkey", /индей|индюш|turkey/],
  ["lamb", /баран|lamb/], ["fish", /рыб|минта|треск|хек|лосос|семг|горбуш|судак|форел|скумбри|тун[еца]|щук|карп|сельд/],
  ["seafood", /кревет|кальмар|мидии|морепродукт/],
];
const MEAT = new Set<Family>(["beef", "pork", "chicken", "turkey", "lamb"]);
const familyOf = (text: string): Family | null => FAMILY.find(([, re]) => re.test(low(text)))?.[0] ?? null;
const lineText = (id: string, name: string) => low(id.replace(/-/g, " ") + " " + name + " " + (ingredient(id)?.name ?? ""));
/** The families of a recipe's products: «Фарш свино-говяжий» is both pork and beef. */
function recipeFamilies(r: Recipe): Set<Family> {
  const out = new Set<Family>();
  for (const i of r.ingredients) for (const [f, re] of FAMILY) if (re.test(lineText(i.id, i.name))) out.add(f);
  return out;
}
const INSTR: Record<Family, string> = { beef: "говядиной", pork: "свининой", chicken: "курицей", turkey: "индейкой", lamb: "бараниной", fish: "рыбой", seafood: "морепродуктами" };
/** «с курицей», «со свининой». */
const withFam = (f: Family) => (/^(св|сл|сп|ст|сн|см|ср|сх|зв|мн|вс)/.test(INSTR[f]) ? "со " : "с ") + INSTR[f];
const NOTE: Record<Family, string> = {
  pork: "получится мягче и чуть жирнее",
  beef: "получится плотнее и чуть суше — в фарш можно добавить ложку холодной воды",
  chicken: "получится легче и нежнее",
  turkey: "получится легче и нежнее",
  lamb: "вкус станет ярче, с характерным ароматом баранины",
  fish: "", seafood: "",
};

// ---------- the recipe's own cooking times ----------
// [in the question, the imperative, in a step]
const VERBS: [RegExp, string, RegExp][] = [
  [/(?<![а-я])(вари|варе|варя|отвари|сварит)/, "Варите", /(?<![а-я])(?:вари|варя|отвари|свари)|кипени/],
  [/(?<![а-я])(жари|жарь|жаря|обжари|поджари)/, "Жарьте", /жар/],
  [/(?<![а-я])(туши|тушен|потуши)/, "Тушите", /туш|томит/],
  [/(?<![а-я])(запека|запеч|печь|пекут|выпека|испеч)/, "Запекайте", /запек|пеките|выпек|духовк|аэрогрил/],
];
/** Which way a step cooks: its verb group, or -1 when it only prepares (cuts, mixes, rests). */
const groupOf = (l: string) => VERBS.findIndex(([, , re]) => re.test(l));
const TIME_Q = /сколько\s+(?:минут|времени|по времени)|как долго|сколько\s+(?:вари|жари|туши|запека|печ|готови|выпека)|через сколько|(?<![а-я])время\s+(?:варки|жарки|готовки|запекания)/;
const NOT_TIME = /хран|морози|замороз|холодильн|соли|сахар|грамм|порци|калори|ккал/;
const STOP = new Set(["сколько", "минут", "времени", "можно", "нужно", "надо", "этот", "этого", "этом", "рецепт", "рецепте", "рецепта", "спрашиваю", "тебя", "меня", "вареные", "варить", "жарить", "тушить", "запекать", "готовить", "какое", "долго", "через", "время", "варки", "жарки", "готовки", "печь", "вместо", "если", "после", "потом", "сначала"]);

const minutesOf = (text: string, timer?: number) => timer ? Math.round(timer / 60) : Number(text.match(/(\d+)\s*(?:–\d+\s*)?минут/)?.[1] ?? 0);
const heatOf = (text: string) => text.match(/на (?:самом )?(?:слабом|среднем|сильном|умеренном|небольшом) огне/)?.[0] ?? "";
const READY = /розов|прозрачн|мягк|золотист|готов(?:ы|ой|ым|ыми|а|о)?(?![а-я])|всплыв|расслаива|румян/;
/** A sentence of these steps that says how to tell it is done, about this thing. */
const readySentence = (texts: string[], noun: string) => texts.flatMap((t) => t.split(/(?<=[.!?])\s+/))
  .find((s) => READY.test(low(s)) && low(s).includes(stem(noun)) && !/минут|огне/.test(low(s)));

/** «Сколько варить фрикадельки?» → «Варите фрикадельки 15 минут на слабом огне (шаг 5), затем ещё 5 минут (шаг 6).» */
function timeAnswer(q: string, r: Recipe): RecipeAnswer | null {
  const ql = low(q);
  const verb = VERBS.find(([re]) => re.test(ql));
  const mine = recipeFamilies(r);
  // The thing asked about, as the person wrote it: words of the question found in the steps (not the meat they swap in).
  const asked = words(q).filter((w) => w.length >= 4 && !STOP.has(w) && (!familyOf(w) || mine.has(familyOf(w)!)));
  // Minutes only of steps that cook (a timer, or a cooking verb): «на лепку около 15 минут» is not a cooking time.
  const steps = r.steps.map((s, k) => {
    const l = low(s.text), g = groupOf(l);
    return { n: k + 1, text: s.text, l, g, min: s.timerSeconds || g >= 0 ? minutesOf(l, s.timerSeconds) : 0 };
  });
  const noun = asked.find((w) => steps.some((s) => s.min && s.l.includes(stem(w))));
  if (!noun) return null;
  const hits = steps.filter((s) => s.min && s.l.includes(stem(noun)));
  // The verb narrows it: «варить» picks the boiling step over the frying one.
  const byVerb = verb ? hits.filter((s) => verb[2].test(s.l)) : [];
  const first = (byVerb.length ? byVerb : hits)[0];
  // The next step goes on cooking it the same way («Варите ещё 5 минут»), not a new job.
  const next = hits.find((s) => s.n === first.n + 1 && s.g === first.g && s.g >= 0);
  // The recipe's own verb: «сколько варить картошку» where it is baked gets «Запекайте».
  const imperative = byVerb.length ? verb![1] : first.g >= 0 ? VERBS[first.g][1] : "Готовьте";
  const heat = heatOf(first.l);
  // «90–120 минут» as the recipe says it, when the timer is the start of that range.
  const range = first.l.match(new RegExp("(?<![0-9])" + first.min + "–(\\d+)\\s*минут"));
  const span = range ? first.min + "–" + range[1] + " минут" : first.min + " " + minWord(first.min);
  let text = imperative + " " + noun + " " + span + (heat ? " " + heat : "") + " (шаг " + first.n + ")";
  if (next) text += ", затем ещё " + next.min + " " + minWord(next.min) + " (шаг " + next.n + ")";
  text += ".";
  // «…со свининой» while the recipe is on beef: how the time changes.
  const other = familyOf(ql);
  if (other && MEAT.has(other) && !mine.has(other) && [...mine].some((f) => MEAT.has(f)))
    text += " " + cap(withFam(other)) + " — " + (other === "chicken" || other === "turkey" ? "столько же или на пару минут меньше." : "столько же.");
  const ready = readySentence([first.text, next?.text ?? ""], noun);
  if (ready) text += " Как понять, что готово: " + ready.charAt(0).toLowerCase() + ready.slice(1);
  return { text: text.replace(/\.\.$/, ".") };
}

// ---------- «заменить A на B» ----------
const SWAP_Q = [
  /(?:замени\S*|поменя\S*)\s+(.+?)\s+на\s+(.+?)[?.!]*$/,
  /вместо\s+(.+?)\s+(?:взять|положить|использовать|добавить|можно)\s+(.+?)[?.!]*$/,
  /(?:можно|подойд\S*)\s+(?:ли\s+)?(?:взять\s+|с\s+)?(.+?)\s+вместо\s+(.+?)[?.!]*$/,
];
const same = (x: string, y: string) => x === y || (x.length >= 4 && y.length >= 4 && stem(x) === stem(y));

function swapAnswer(q: string, r: Recipe): RecipeAnswer | null {
  const ql = low(q);
  let from = "", to = "";
  for (const [k, re] of SWAP_Q.entries()) {
    const m = ql.match(re);
    if (m) { [from, to] = k === 2 ? [m[2], m[1]] : [m[1], m[2]]; break; }
  }
  if (!from || !to) return null;
  const a = familyOf(from), b = familyOf(to), mine = recipeFamilies(r);
  if (a && b && mine.has(a)) {
    if (a === b) return { text: "Да, можно: время то же, если кусочки такой же толщины." };
    if (MEAT.has(a) && MEAT.has(b)) {
      const time = mainTime(r, a, b);
      return { text: "Да, можно — " + withFam(b) + " " + NOTE[b] + "." + (time ? " " + time : "") };
    }
    if (MEAT.has(a) !== MEAT.has(b))
      return { text: "Лучше не стоит: " + withFam(b) + " это будет уже другое блюдо. Давайте подберу похожее " + withFam(b) + ".", search: "блюдо " + withFam(b) };
  }
  // Other products: only what the recipe itself lists as a swap.
  const line = r.ingredients.find((i) => words(i.name + " " + (ingredient(i.id)?.name ?? "")).some((w) => words(from).some((f) => same(f, w))));
  if (!line?.swap?.length) return null;
  const hit = line.swap.find((id) => {
    const p = ingredient(id);
    return !!p && words(p.name + " " + (p.aliases ?? []).join(" ")).some((w) => w.length >= 4 && words(to).some((t) => same(t, w)));
  });
  return hit ? { text: "Да, подойдёт — эта замена есть в рецепте. Количество то же." } : null;
}

/** How the time changes when meat «a» becomes «b»: the longest timed step that cooks «a». */
function mainTime(r: Recipe, a: Family, b: Family): string {
  const ids = new Set(r.ingredients.filter((i) => FAMILY.find(([f]) => f === a)![1].test(lineText(i.id, i.name))).map((i) => i.id));
  let n = 0, m = 0;
  r.steps.forEach((s, k) => {
    // A step that cooks it: names its products, or says «мясо» (long recipes often leave the stewing step without products).
    if (!s.timerSeconds || !((s.uses ?? []).some((u) => ids.has(u)) || /мяс|фрикадел|котлет|тефтел/.test(low(s.text)))) return;
    const min = Math.round(s.timerSeconds / 60);
    if (min > m) { m = min; n = k + 1; }
  });
  if (!m) return "";
  const at = m + " " + minWord(m) + " (шаг " + n + ")";
  if ((b === "chicken" || b === "turkey") && a !== "chicken" && a !== "turkey") return "Готовить можно чуть меньше: по рецепту " + at + ".";
  if (b === "beef" && a !== "beef" && m >= 30) return "Говядине нужно больше времени: тушите на 20–30 минут дольше, чем " + at + ".";
  return "Время то же — " + at + ".";
}

/** An answer from this recipe, or null when the recipe has nothing to say (then the usual answers take over). */
export function answerFromRecipe(q: string, r: Recipe, previous?: string): RecipeAnswer | null {
  const ql = low(q);
  const swap = swapAnswer(q, r);
  if (swap) return swap;
  if (NOT_TIME.test(ql)) return null;
  if (TIME_Q.test(ql) || (VERBS.some(([re]) => re.test(ql)) && /сколько|долго|минут/.test(ql))) return timeAnswer(q, r);
  // «Так я про варёные фрикадельки» after a time question: the same question, about this thing.
  if (previous && TIME_Q.test(low(previous)) && q.length <= 80) return timeAnswer(q, r) ?? timeAnswer(previous, r);
  return null;
}
