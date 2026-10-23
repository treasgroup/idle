// Every recipe is tidied when a catalog is built (core.Vb), so the site, the app and every future batch get it
// without touching the files on the hosting (the owner edits those in the admin panel):
// - a timer on a step that says «варите 20 минут» but has none;
// - a kitchen thermometer and «°C в центре» turned into what anyone can see (clear juice, no pink, flakes with a fork);
// - fridge temperatures («при 0–4 °C», «≤4 °C») as «в холодильнике»; oil and milk temperatures get a plain cue;
// - oil for deep frying marked as mostly left in the pan (`absorbed`), so calories count only what the food takes in;
// - «Детям» taken off spicy dishes, alcohol and coffee.
import type { Recipe, RecipeIngredient } from "./types";

type Line = RecipeIngredient & { absorbed?: number };

// ---------- Timers ----------
const VERB = "(?:варите|варить|отварите|доварите|тушите|потушите|томите|жарьте|обжарьте|обжаривайте|поджарьте|запекайте|запеките|выпекайте|выпеките|пеките|готовьте|кипятите|прогрейте|прогревайте|держите|оставьте|дайте(?: \\S+){0,2} (?:постоять|настояться|отдохнуть|остыть|подняться|подойти|набухнуть|стечь)|настаивайте|маринуйте|пассеруйте|припускайте|выдержите|охладите|остудите|убавьте огонь и|накройте крышкой и|взбивайте|замесите|месите)";
const AMOUNT = "(\\d+(?:[,.]\\d+)?)(?:\\s*[–-]\\s*\\d+(?:[,.]\\d+)?)?\\s*(минут[ауы]?|мин\\.?|час(?:а|ов)?|ч\\.?)(?![а-яё])";
const TIMED = new RegExp(VERB + "[^.!?;]{0,60}?" + AMOUNT, "gi");
const HALF_HOUR = new RegExp(VERB + "[^.!?;]{0,40}?(полчаса|час)(?![а-яё])", "i");
// Not a timer: keeping in the fridge, «за 10 минут до», «не дольше 2 часов».
const NOT_TIMER = /хран|холодильник[^.]{0,40}в течение|в течение \d+\s*час[^.]{0,40}холодильник|за \d+\s*мин[^.]{0,15}до|не (?:дольше|более) \d+\s*час/i;

/** The step's main wait: «лук 3 минуты, затем грибы 7–8 минут» → 7 (the longest one; the range's lower end). */
function timerOf(text: string): number | null {
  if (NOT_TIMER.test(text)) return null;
  let min: number | null = null;
  for (const m of text.matchAll(TIMED)) {
    const n = parseFloat(m[1].replace(",", "."));
    const v = /^ч|^час/i.test(m[2]) ? n * 60 : n;
    if (min == null || v > min) min = v;
  }
  if (min == null) {
    const h = HALF_HOUR.exec(text);
    if (h) min = h[1].toLowerCase() === "полчаса" ? 30 : 60;
  }
  // A timer for minutes to hours of cooking; overnight waits are said in words.
  if (min == null || min < 1 || min > 12 * 60) return null;
  return Math.round(min * 60);
}

// ---------- Plain words instead of thermometers and degrees ----------
type Kind = "poultry" | "minced" | "fish" | "meat" | "other";
const KIND_WORDS: [Kind, RegExp][] = [
  ["minced", /фарш|котлет|тефтел|фрикадел|люля|бургер|кебаб|биточк/i],
  ["fish", /рыб|лосос|форел|треск|минта|хек|судак|скумбри|горбуш|сибас|дорадо|щук|карп|кальмар|кревет/i],
  ["poultry", /куриц|курин|птиц|индейк|утк|гус|бедр|крыл|окороч|филе/i],
  ["meat", /свинин|говядин|телятин|баранин|буженин|окорок|рульк|корейк|грудинк|мяс|стейк/i],
];
const kindOf = (text: string, r: Recipe): Kind => {
  for (const [k, re] of KIND_WORDS) if (re.test(text)) return k;
  for (const [k, re] of KIND_WORDS) if (re.test(r.title)) return k;
  return "other";
};
// A whole sentence about checking with a thermometer → the check anyone can do.
const CHECK: Record<Kind, string> = {
  poultry: "Проверьте готовность: надрежьте самый толстый кусочек — сок прозрачный, мясо внутри без розового.",
  minced: "Проверьте готовность: разрежьте одну — внутри без розового, сок прозрачный.",
  fish: "Проверьте готовность: мякоть стала непрозрачной и легко расслаивается вилкой.",
  meat: "Проверьте готовность: проткните ножом самое толстое место — сок прозрачный, без крови.",
  other: "Проверьте, что в середине всё горячее.",
};
// A «до 75 °C в центре» inside an instruction → a few words in its place.
const UNTIL: Record<Kind, string> = {
  poultry: "до прозрачного сока, без розового внутри",
  minced: "пока внутри не исчезнет розовый цвет",
  fish: "пока мякоть не станет непрозрачной",
  meat: "до прозрачного сока",
  other: "пока середина не прогреется",
};
const CORE_TEMP = /(?:,?\s*)?(?:до|не менее|не ниже|минимум)?\s*\d{2,3}\s*°\s?C\s*(?:в (?:самом )?центре|внутри|в середине)(?:\s*(?:самого толстого (?:кусочка|куска|места)|кусочков|кусков))?|(?:,?\s*)?(?:(?:с\s+)?температур(?:а|ой)\s+)?в (?:самом )?(?:центре|середине)(?:\s+самого толстого (?:кусочка|куска|места))?\s+(?:должн[аоы] (?:быть|показать)\s+)?(?:не менее|не ниже|минимум|около)?\s*\d{2,3}\s*°\s?C/gi;

// The thermometer part of a sentence: «: кухонный термометр … 74 °C», «; при наличии термометра … 72 °C».
const THERMO = /\s*([:;,—–-])?\s*(?:при наличии (?:кухонного )?термометра|с термометром|при термометре|проверьте (?:\S+ ){0,6}?(?:кухонным )?термометром|кухонный термометр|термометр)[^.;]*/i;
const SEEN = /розов|сыр(?:ой|ого|ая)|прозрачн|матов|бел(?:ая|ое|ый)|горяч|непрозрачн|расслаива/i;
const SHORT: Record<Kind, string> = {
  poultry: "надрежьте самый толстый кусочек — сок прозрачный, без розового",
  minced: "разрежьте одну — внутри без розового",
  fish: "мякоть непрозрачная и расслаивается вилкой",
  meat: "проткните ножом — сок прозрачный",
  other: "в середине всё горячее",
};

// «Проверьте температуру в середине: она должна достигнуть 63 °C» (no thermometer named, the same idea).
const TEMP_CHECK = /(?:проверьте температуру|температур\S* .{0,60}(?:должн|достиг)|должн\S* (?:прогреться|достигнуть|достичь)[^.]{0,30}\d{2,3}\s*°)[^.]*\d{2,3}\s*°\s?C/i;

/** `before`: the step's text so far — a check already said there is not said twice. */
function plainSentence(s: string, r: Recipe, before: string): string {
  const kind = kindOf(s, r);
  const thermo = /термометр/i.test(s);
  if (!thermo && TEMP_CHECK.test(s) && !/духовк|разогре|масл/i.test(s)) return SEEN.test(before) ? "" : CHECK[kind];
  if (thermo) {
    const m = THERMO.exec(s);
    // What is left without the thermometer, without a dangling «, затем» and the full stop (put back below).
    const rest = m ? (s.slice(0, m.index) + s.slice(m.index + m[0].length)).replace(/[\s.:;,—–-]+$/, "").replace(/[\s,]+(?:затем|потом|и|а)$/i, "") : "";
    // The sentence is only about the thermometer: the plain check instead (or nothing, when it was just said).
    if (!m || rest.trim().length < 20) return SEEN.test(before) ? "" : CHECK[kind];
    // «Проверьте готовность курицы: кухонный термометр …» → «…: надрежьте кусочек — сок прозрачный».
    if (m[1] === ":") return rest + ": " + SHORT[kind] + ".";
    // An optional thermometer after a check that is already there: dropped; otherwise the plain check is added.
    return rest + (SEEN.test(rest) || SEEN.test(before) ? "." : ". " + CHECK[kind]);
  }
  return s.replace(/проверяя\s+(?=(?:не менее|не ниже|до)?\s*\d{2,3}\s*°)/gi, "")
    .replace(CORE_TEMP, (m) => (m.trim().startsWith(",") ? ", " : " ") + UNTIL[kind])
    .replace(/Если температура ниже,/g, "Если нет,");
}

// «Остатки уберите в холодильник… храните до 3 дней» — the page already says «Хранится в холодильнике 3 дня».
const STORAGE = /остатк|холодильник|храни|разогрев|контейнер|морозил|заморо/i;
function withoutStorage(tip: string): string {
  return tip.split(/(?<=[.!?])\s+/).filter((s) => !STORAGE.test(s)).join(" ").trim();
}

const FRIDGE = [
  [/при\s+(?:температуре\s+)?0\s*[–-]\s*[2-6]\s*°\s?C/gi, "в холодильнике"],
  [/при\s+(?:температуре\s+)?(?:не выше|до|ниже|≤)\s*[2-8]\s*°\s?C/gi, "в холодильнике"],
  [/(?:с температурой|при температуре)?\s*≤\s*[2-8]\s*°\s?C/gi, " в холодильнике"],
  [/не выше\s+[2-8]\s*°\s?C/gi, "в холодильнике"],
  [/≤\s*(\d)/g, "не больше $1"],
  [/≥\s*(\d)/g, "не меньше $1"],
] as const;

// «огне2 минуты», «при200 °C20 минут», «до3×4»: a lost space between a word and a number (321 in the catalog), put back.
const spaced = (t: string): string => t.replace(/([а-яё])(?=[\d≤≥])/gi, "$1 ").replace(/(°\s?C)(?=\d)/g, "$1 ");

// Every rule below needs degrees, «≤»/«≥» or a thermometer: a text without them skips the heavy part (most of the
// catalog — it made building the catalog three times slower on a phone).
const HOT = /[°≤≥]|термометр/i;

function plain(raw: string, r: Recipe): string {
  const text = spaced(raw);
  let t: string;
  if (!HOT.test(text)) t = text.replace(/(?<=[.!?])\s+/g, " ");
  else {
    let said = "";
    t = text.split(/(?<=[.!?])\s+/).map((s) => { const out = plainSentence(s, r, said); said += " " + s; return out; }).filter(Boolean).join(" ");
    for (const [re, to] of FRIDGE) t = t.replace(re, to);
    // Hot oil and warm milk: the number stays, with what it looks like.
    t = t.replace(/(масл\S*[^.]{0,30}?до\s+1[5-9]\d\s*°\s?C)(?!\s*\()/gi, "$1 (кусочек хлеба в нём сразу шипит и румянится)");
    t = t.replace(/((?:молок|вод|сливк|кефир)\S*[^.]{0,30}?до\s+(?:3[5-9]|4[0-2])(?:\s*[–-]\s*\d{2})?\s*°\s?C)(?!\s*\()/gi, "$1 (чуть тёплое, как парное молоко)");
  }
  return t.replace(/(холодильник\S*)\s+в холодильнике/gi, "$1").replace(/холодильнике\s+в холодильнике/gi, "холодильнике")
    .replace(/Если температура ниже,/g, "Если нет,").replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim();
}

// ---------- Frying oil ----------
// A big amount of oil «для жарки / для фритюра» mostly stays in the pan: deep frying — about an eighth is taken in,
// a deep layer in a frying pan — about a third. A spoon or two for a frying pan is eaten whole.
const FRYING = /фритюр|для (?:всей )?жарки|всей жарки|весь (?:запас|объём)|ванн/i;
const OILS = /масл/i;
const absorbed = (i: RecipeIngredient): number | null => {
  if (!OILS.test(i.name) || !["г", "мл"].includes(i.unit) || /сливочн/i.test(i.name)) return null;
  // 300 g of oil and more is a frying bath whatever the line is called.
  if (i.amount >= 300) return 0.12;
  if (!FRYING.test(i.name)) return null;
  return i.amount >= 200 ? 0.12 : i.amount >= 100 ? 0.3 : null;
};

// ---------- Thawing and soaking: the quick way ----------
// «Накануне разморозьте креветки 12 часов в холодильнике», «замочите нут на 8 часов»: a night in the fridge made a
// 25-minute dish «25 мин + ждать 8 ч» (37 + 10 recipes). The step keeps the slow way and says the quick one, the time
// counts the quick one. The server does the same for visitors (quick_prep in lib.php): a step that already says it is
// left as it is.
const THAW = /размор[оа]|оттай|оттаив|из мороз\S* в холодильник|заморож\S*[^.]{0,80}(?:холодильник|нижн\S* полк)/i;
const SOAK = /замоч|замачив|холодильник|на ночь|комнатной/i;
const LEGUME = /(?:^|[\s(])нут|горох/i;
const HOURS = /(\d+(?:[,.]\d+)?)(?:\s*[–-]\s*(\d+(?:[,.]\d+)?))?\s*(?:час(?:а|ов)?|ч\.?)(?![а-яё])/gi;
type Quick = { say: string; min: number };
const QUICK: Record<string, Quick> = {
  smoothie: { say: "Можно не размораживать: смузи выйдет гуще и холоднее.", min: 0 },
  phyllo: { say: "Забыли разморозить? Около 2 часов при комнатной температуре, не открывая упаковку.", min: 120 },
  dough: { say: "Забыли разморозить? Около часа при комнатной температуре, не открывая упаковку.", min: 60 },
  berries: { say: "Забыли разморозить? Около часа при комнатной температуре в сите над миской.", min: 60 },
  seafood: { say: "Забыли разморозить? Положите в закрытом пакете в миску с холодной водой на 20–30 минут, воду поменяйте раз-другой.", min: 30 },
  fish: { say: "Забыли разморозить? Положите рыбу в закрытом пакете в миску с холодной водой на 40–60 минут, воду поменяйте раз-другой.", min: 60 },
  soak: { say: "Быстрее: залейте водой, доведите до кипения, выключите и оставьте под крышкой на час, затем слейте воду.", min: 60 },
};

function thawOf(text: string): Quick | null {
  if (/фило/i.test(text)) return QUICK.phyllo;
  if (/тест/i.test(text)) return QUICK.dough;
  if (/вишн|клубник|ягод|малин|черник|смородин/i.test(text)) return QUICK.berries;
  if (/кревет|кальмар|миди|морепродукт|икр/i.test(text)) return QUICK.seafood;
  if (/рыб|скумбри|мойв|кильк|минта|треск|хек|филе|лосос|горбуш/i.test(text)) return QUICK.fish;
  return null;
}

function quickOf(text: string, r: Recipe, uses: string[]): Quick | null {
  // What thaws: the sentence with the hours first («разморозьте вишню… затем охладите тесто» is about the cherries),
  // then the step, then the title («Размораживайте при 0–4 °C 8 часов» names nothing).
  if (THAW.test(text)) {
    const said = text.split(/(?<=[.!?])\s+/).find((p) => hoursIn(p) >= 4 * 60) ?? "";
    return /смузи/i.test(r.title) ? QUICK.smoothie : thawOf(said) ?? thawOf(text) ?? thawOf(r.title);
  }
  // Falafel needs chickpeas soaked raw: boiled ones fall apart in the oil.
  const names = r.ingredients.filter((i) => uses.includes(i.id)).map((i) => i.name).join(" ");
  return SOAK.test(text) && LEGUME.test(text + " " + names) && !/фалафел/i.test(r.title) ? QUICK.soak : null;
}

/** The longest wait said in hours (a range's upper end), in minutes. */
const hoursIn = (text: string): number =>
  Math.max(0, ...[...text.matchAll(HOURS)].map((m) => parseFloat((m[2] ?? m[1]).replace(",", ".")) * 60));

/** The step with the quick way said after the slow one, and the minutes it saves; null when there is none. */
function quickStep(text: string, r: Recipe, uses: string[]): { text: string; quick: Quick; saved: number } | null {
  // Most steps wait minutes, not hours: they are let go first.
  const wait = hoursIn(text);
  if (wait < 4 * 60 || Object.values(QUICK).some((q) => text.includes(q.say))) return null;
  const quick = quickOf(text, r, uses);
  if (!quick) return null;
  const parts = text.split(/(?<=[.!?])\s+/);
  const at = parts.findIndex((p) => hoursIn(p) >= 4 * 60);
  parts.splice(at + 1, 0, quick.say);
  return { text: parts.join(" "), quick, saved: wait - quick.min };
}

// ---------- Children ----------
// Whole words where a stem hides inside others («вина» in «свинина», «ром» in «сыром»).
const NOT_FOR_KIDS = /остр(?:ый|ая|ое|ые|ого|ом|ой)|чили|халапень|аджик|хрен|васаби|табаско|кайенск|коньяк|(?<![а-яё])вин(?:о|а|ом)(?![а-яё])|ликёр|ликер|(?<![а-яё])ром(?![а-яё])|пив[оа](?![а-яё])|водк|кофе|эспрессо|матча/i;

export function tidyRecipe(r: Recipe): Recipe {
  let saved = 0;
  const steps = r.steps.map((s) => {
    const q = quickStep(spaced(s.text), r, s.uses ?? []);
    if (q) saved += q.saved;
    const text = plain(q ? q.text : s.text, r);
    // The night-long wait gets no timer; the quick way does.
    const timerSeconds = q ? (s.timerSeconds && s.timerSeconds < 4 * 3600 ? s.timerSeconds : q.quick.min * 60) : s.timerSeconds ?? timerOf(spaced(s.text)) ?? undefined;
    const { timerSeconds: _, ...rest } = s;
    return { ...rest, text, ...(timerSeconds ? { timerSeconds } : {}) };
  });
  const totalMinutes = saved > 0 ? Math.max(r.activeMinutes, r.totalMinutes - saved) : r.totalMinutes;
  const ingredients = r.ingredients.map((i): Line => { const a = absorbed(i); return a ? { ...i, absorbed: a } : i; });
  // «без вина», «без пива»: the dish is made exactly so that it has none.
  const words = (r.title + " " + r.ingredients.filter((i) => !i.optional).map((i) => i.name).join(" ")).replace(/без \S+/gi, "");
  const kids = r.kids && (r.tags.includes("spicy") || NOT_FOR_KIDS.test(words)) ? false : r.kids;
  const tips = r.tips.map((t) => plain(r.storageDays != null ? withoutStorage(t) : t, r)).filter((t) => t.length >= 3);
  return { ...r, totalMinutes, steps, tips, summary: plain(r.summary, r), ingredients, kids };
}
