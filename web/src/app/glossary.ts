// Kitchen words in recipe steps that a beginner may not know («томить», «до мягких пиков», «водяная баня»). In a step
// such a word is quietly underlined; a tap shows one or two plain sentences and, where there is one, the lesson from
// Школа готовки. At most two words per step, each once — the step must not turn into a dictionary.
// Note: JavaScript's \b does not see Cyrillic letters as word letters, so word edges here are (?<!\p{L}).

export interface Term { id: string; title: string; text: string; lesson?: string; re: RegExp }

const W = "(?<!\\p{L})";
const t = (id: string, title: string, re: string, text: string, lesson?: string): Term => ({ id, title, text, lesson, re: new RegExp(W + "(?:" + re + ")", "iu") });

export const TERMS: Term[] = [
  t("passer", "Пассеровать", "пассеру\\p{L}*|пассеров\\p{L}*", "Обжаривать на небольшом количестве масла на среднем огне до мягкости и золотистого цвета — без корочки. Так готовят лук и морковь для супов и соусов.", "saute"),
  t("zazharka", "Зажарка", "зажарк\\p{L}*", "Лук и морковь, обжаренные на масле до мягкости. С неё начинаются щи, борщ и рагу.", "saute"),
  t("transparent", "До прозрачности", "до прозрачност\\p{L}*", "Лук стал мягким и полупрозрачным, но ещё не потемнел — обычно 4–5 минут на среднем огне.", "saute"),
  t("blanch", "Бланшировать", "бланшир\\p{L}*", "Опустить в кипящую воду на 1–3 минуты, а потом сразу в холодную. Овощи остаются яркими и хрустящими.", "blanch"),
  t("tomit", "Томить", "томит\\p{L}*|томлен\\p{L}*", "Готовить долго на самом слабом огне под крышкой: должно едва-едва булькать.", "stew"),
  t("reduce", "Уварить", "уварит\\p{L}*|уварив\\p{L}*|уварен\\p{L}*", "Варить без крышки, чтобы лишняя жидкость выкипела и соус стал гуще.", "sauce"),
  t("soft-peaks", "До мягких пиков", "до мягких пиков", "Взбитые сливки или белки уже держат форму, но кончик на венчике мягко загибается."),
  t("stiff-peaks", "До устойчивых пиков", "до (?:устойчив|стойк)\\p{L}* пиков", "Масса плотная: кончик на венчике стоит прямо, а миску можно наклонить — ничего не сползёт."),
  t("water-bath", "Водяная баня", "водян\\p{L}* бан\\p{L}*", "Миску ставят на кастрюлю с едва кипящей водой так, чтобы дно не касалось воды. Шоколад и кремы греются мягко и не пригорают."),
  t("bread", "Панировать, обвалять", "панир\\p{L}*|обвал[яе]\\p{L}*", "Покрыть кусочки мукой, яйцом или сухарями перед жаркой — получится хрустящая корочка."),
  t("pound", "Отбить мясо", "отбе[йт]\\p{L}*|отбить|отбит\\p{L}*", "Расплющить кусок молотком через плёнку или пакет до одинаковой толщины — прожарится ровно и быстрее.", "meat"),
  t("marinade", "Мариновать", "марин(?:у|ов|ад)\\p{L}*", "Выдержать продукт в смеси с солью, кислым (лимон, уксус, кефир) и специями — мясо станет мягче и вкуснее.", "meat"),
  t("press", "Под гнётом", "под гн[её]т\\p{L}*", "Сверху кладут тарелку и что-то тяжёлое, например банку с водой, — чтобы прижать и выдавить лишний сок."),
  t("rest", "Дать отдохнуть", "отдохн\\p{L}*", "Оставить на 5–15 минут: мясо — под фольгой, чтобы сок разошёлся по куску; тесто — под полотенцем, чтобы стало мягче.", "roast"),
  t("skimmer", "Шумовка", "шумовк\\p{L}*", "Большая плоская ложка с дырочками: ею снимают пену и достают из воды пельмени и фрикадельки.", "soup"),
  t("saute-pan", "Сотейник", "сотейник\\p{L}*", "Глубокая сковорода с толстым дном и высокими бортами. Можно заменить глубокой сковородой или кастрюлей с толстым дном.", "pan"),
  t("julienne", "Соломкой", "соломк\\p{L}*", "Нарезать тонкими полосками — примерно со спичку или чуть толще.", "knife"),
  t("deep-fry", "Фритюр", "фритюр\\p{L}*", "Много горячего масла, в котором продукт плавает целиком. Берите глубокую кастрюлю и наливайте масло не выше трети.", "pan"),
  t("knead", "Замесить тесто", "замес\\p{L}*", "Перемешивать тесто руками, пока оно не станет гладким и не перестанет липнуть: сначала в миске, потом на столе с мукой.", "batter"),
];

export type Piece = string | { term: Term; text: string };

/** The step's text with up to `max` kitchen words found (each word once, in order of appearance). */
export function splitTerms(text: string, max = 2): Piece[] {
  const hits: { term: Term; at: number; text: string }[] = [];
  for (const term of TERMS) {
    const m = term.re.exec(text);
    if (m && !hits.some((h) => m.index < h.at + h.text.length && h.at < m.index + m[0].length)) hits.push({ term, at: m.index, text: m[0] });
  }
  const chosen = hits.sort((a, b) => a.at - b.at).slice(0, max);
  const out: Piece[] = [];
  let pos = 0;
  for (const h of chosen) {
    if (h.at > pos) out.push(text.slice(pos, h.at));
    out.push({ term: h.term, text: h.text });
    pos = h.at + h.text.length;
  }
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}
