// «Спросить Шефа про этот рецепт»: the everyday questions that went to the general chat or got another answer —
// «можно без яиц/лука?», «что подать?», «сколько варить?» (no product named), «можно заранее?», «можно в мультиварке?»,
// «подгорело», and «чем заменить» for the products asked about most. Answered from the recipe where it can be.
import { answerKitchenQuestion, answerRecipeQuestion, courseOf, displayName, formatMinutes, ingredient, shortName, type Recipe, type RecipeIngredient } from "../engine";
import { ALL_TROUBLES, troublesFor } from "./rescue";
import { sideAnswer } from "./pairing";

export interface ExtraAnswer { text: string; search?: string }

const low = (s: string) => s.toLowerCase().replace(/ё/g, "е");
// «лука» → «лук», «яиц» → «яйц», «чеснока» → «чесно»: enough of the word to find the product.
const stemOf = (w: string) => { const x = low(w).replace(/^яиц/, "яйц"); return x.length <= 4 ? x.slice(0, Math.max(3, x.length - 1)) : x.slice(0, Math.max(4, x.length - 2)); };
const names = (i: RecipeIngredient) => low(i.name + " " + displayName(i.id, i.name) + " " + (ingredient(i.id)?.name ?? "") + " " + (ingredient(i.id)?.aliases ?? []).join(" "));

// What can simply be left out: onion, garlic, herbs, spices.
const SOFT = /(?:^|-)(?:onion|red-onion|green-onion|leek|garlic|dill|parsley|cilantro|basil|black-pepper|bay-leaf|paprika|cumin|coriander|turmeric|chili|oregano|thyme|rosemary|nutmeg|cinnamon|vanilla|sesame)/;

// «Чем заменить» for the products that had no answer, and for eggs, milk and starch, whose listed swaps were
// «яйцо перепёлки», «концентрированное молоко» and «маисовый крахмал».
const SWAPS: [RegExp, string][] = [
  [/^(?:лук|луковиц)/, "Лук можно просто не класть — вкус будет проще. Или взять порей, зелёный лук, щепотку сушёного лука."],
  [/^морков/, "Морковь можно не класть или заменить тыквой — она тоже сладковатая. Для цвета в зажарке — ложка томатной пасты."],
  [/^(?:картоф|картош)/, "Картофель заменит батат, цветная капуста или кабачок — они готовятся быстрее, проверяйте ножом."],
  [/^сыр/, "Подойдёт любой твёрдый сыр — гауда, голландский, российский. Для запекания — моцарелла, для салата — брынза или фета."],
  [/^(?:помидор|томат)/, "Свежие помидоры заменят томаты в собственном соку; в соусе и супе — 1 ст. л. томатной пасты на помидор, разведённая водой."],
  [/^(?:курин\S* филе|филе куриц|курин\S* грудк|курица)/, "Куриное филе заменит индейка (время то же) или бёдра без кости — их готовят на 5–10 минут дольше."],
  [/^говядин/, "Вместо говядины — свинина или телятина, время чуть меньше. Курица готовится вдвое быстрее."],
  [/^(?:болгарск\S* перец|перец болгарск|сладк\S* перец)/, "Болгарский перец заменит кабачок или стручковая фасоль; для цвета — немного моркови."],
  [/^паприк/, "Вместо паприки — щепотка молотого чили (её нужно меньше) или ложка томатной пасты для цвета."],
  [/^(?:зира|кумин)/, "Зиру можно не класть или заменить молотым кориандром — аромат будет мягче."],
  [/^(?:яйц|яйко|яиц)/, "В сырниках, котлетах и оладьях одно яйцо заменит 1 ст. л. манки с 2 ст. л. кефира или воды — держит форму чуть хуже. В выпечке — половина банана или 3 ст. л. яблочного пюре."],
  [/^молок/, "Молоко можно заменить водой пополам со сливками или кефиром; в тесте — просто водой, будет чуть суше."],
  [/^крахмал/, "Вместо крахмала — мука: её нужно вдвое больше, и соус надо проварить пару минут."],
];

function swapFor(what: string): string | null {
  const w = low(what).replace(/[?!.]/g, "").trim();
  return SWAPS.find(([re]) => re.test(w))?.[1] ?? null;
}

/** The recipe's line the words name, or null. */
function lineFor(r: Recipe, what: string): RecipeIngredient | null {
  const ws = low(what).match(/[а-я]+/g)?.filter((w) => w.length >= 3) ?? [];
  if (!ws.length) return null;
  // The product's own name first: «яиц» is the eggs, not «Майонез … с яйцом».
  const own = (i: RecipeIngredient) => low(shortName(i.id) + " " + displayName(i.id, i.name));
  return r.ingredients.find((i) => ws.every((w) => own(i).includes(stemOf(w))))
    ?? r.ingredients.find((i) => ws.every((w) => names(i).includes(stemOf(w)))) ?? null;
}

const TROUBLE: [RegExp, string][] = [
  [/подгор|пригор/, "burnt"], [/пересол/, "salty"], [/разваливают|развалил/, "minced-falls"], [/не поднима|не подош/, "dough-rise"],
  [/липнет|липкое/, "dough-sticky"], [/жестк/, "meat-tough"], [/внутри сыр|сырое внутри|не пропекл/, "meat-raw"], [/сух(?:ое|ая|ой|им)|пересуш/, "meat-dry"],
  [/рвутся|прилипа/, "pancake-tear"], [/расползают|растекают/, "syrniki-spread"], [/не густе|жидк/, "not-thick"], [/комочк|комки/, "lumps"],
];

export function extraAnswer(q: string, r: Recipe): ExtraAnswer | null {
  const ql = low(q).replace(/[?!.]+$/, "").trim();
  const course = courseOf(r);

  // «Чем заменить сыр?»
  const sw = ql.match(/(?:чем|на что)\s+(?:можно\s+)?заменить\s+(.+)$/);
  if (sw) { const s = swapFor(sw[1]); if (s) return { text: s }; }

  // «Можно без яиц?», «а без лука?»
  // Only the question itself: «варить без крышки?» is not about a product.
  const wo = ql.match(/^(?:а\s+|и\s+)?(?:(?:если\s+)?(?:дома\s+)?нет|(?:можно\s+(?:ли\s+)?)?(?:(?:приготовить|сделать)\s+)?без)\s+([а-я -]{3,30})$/);
  if (wo && !/духовк/.test(wo[1])) {
    const what = wo[1].trim();
    const line = lineFor(r, what);
    if (!line) return { text: "В этом рецепте " + what + " нет — готовьте как написано." };
    // Eggs in a salad or a soup are an addition, not what holds the dish together.
    const extra = line.id === "egg" && ["salad", "soup", "snack"].includes(course);
    if (line.optional || SOFT.test(line.id) || extra) return { text: "Да, можно обойтись без этого — вкус будет немного проще." };
    const s = swapFor(shortName(line.id)) ?? answerKitchenQuestion("Чем заменить " + low(shortName(line.id)) + "?", true)?.text;
    return { text: "Без этого блюдо получится немного другим. " + (s ?? "Попробуйте похожее блюдо без этого продукта."), ...(s ? {} : { search: r.title.split(/\s/)[0].toLowerCase() + " без " + what }) };
  }

  // «Что подать к нему?», «с чем есть?»
  if (/(?:что|чем)\s+(?:можно\s+)?(?:подать|подавать|есть)|с\s+чем\s+(?:подать|подавать|есть|едят)|гарнир/.test(ql)) {
    if (course === "soup") return { text: "К супу — сметана, зелень и хлеб: чёрный или чесночные пампушки." };
    if (course === "dessert" || course === "baking") return { text: "К чаю, кофе или стакану молока." };
    if (course === "breakfast") return { text: "Со сметаной, вареньем или мёдом — и к чаю или кофе." };
    if (course === "salad" || course === "snack") return { text: "Это блюдо само по себе — на закуску или к горячему." };
    const side = sideAnswer("что подать к " + low(r.title));
    if (side?.results.length) return { text: "Подойдут: " + side.results.map((m) => m.recipe.title).join(", ") + ".", search: "гарнир к " + low(r.title.split(/\s/)[0]) };
    return { text: "Подойдут рис, картофельное пюре, гречка или овощной салат." };
  }

  // «Сколько варить?» with no product: the longest step that cooks that way.
  const verb: [RegExp, string, RegExp][] = [[/вари/, "Варите", /вари|кипени/], [/жари/, "Жарьте", /жар/], [/туши/, "Тушите", /туш|томит/], [/запека|печь|выпека/, "Запекайте", /запек|пеките|выпек|духовк/]];
  const v = /сколько|как долго/.test(ql) ? verb.find(([re]) => re.test(ql)) : undefined;
  if (v && ql.split(/\s+/).length <= 3) {
    const steps = r.steps.map((s, k) => ({ k, s, min: s.timerSeconds ? Math.round(s.timerSeconds / 60) : 0 })).filter((x) => x.min && v[2].test(low(x.s.text)));
    const top = steps.sort((a, b) => b.min - a.min)[0];
    if (top) return { text: v[1] + " " + formatMinutes(top.min) + " (шаг " + (top.k + 1) + ")." };
  }

  // «Можно приготовить заранее?»
  if (/заранее|накануне|с вечера|за день|на завтра/.test(ql)) {
    const keeps = answerRecipeQuestion("сколько хранится", [r])?.text ?? "";
    const days = keeps.match(/(\d+)\s*(?:дн|сут)/)?.[1];
    const mayo = r.ingredients.some((i) => i.id === "mayonnaise");
    if (mayo) return { text: "Да: всё нарежьте заранее и уберите в холодильник, а заправьте майонезом перед подачей — так салат не потечёт." };
    return { text: days ? "Да, можно: в холодильнике оно хранится " + days + " " + (Number(days) === 1 ? "день" : Number(days) < 5 ? "дня" : "дней") + ". Разогрейте перед подачей." : "Да, можно накануне: готовая еда хранится в холодильнике 2–3 дня." };
  }

  // «Можно в мультиварке?»
  if (/мультивар/.test(ql)) {
    if (r.appliances.includes("multicooker")) return { text: "Да, этот рецепт как раз для мультиварки." };
    const word = r.title.split(/\s/)[0].toLowerCase();
    return course === "soup" || /туш|рагу|плов|гуляш|каш/i.test(r.title)
      ? { text: "Этот рецепт — для плиты, но в мультиварке получится: обжарку — в режиме «Жарка», дальше «Суп» или «Тушение» примерно на то же время.", search: word + " в мультиварке" }
      : { text: "Этот рецепт — для плиты. Могу подобрать похожее блюдо для мультиварки.", search: word + " в мультиварке" };
  }

  // «Подгорело», «пересолила», «разваливаются»: what to do, from «Спасти блюдо».
  const tr = TROUBLE.find(([re]) => re.test(ql));
  if (tr) {
    const t = troublesFor(r).find((x) => x.id === tr[1] || (tr[1] === "salty" && x.id === "salty-soup")) ?? ALL_TROUBLES.find((x) => x.id === tr[1]);
    if (t) return { text: t.title + ": " + t.steps.join(" ") };
  }
  return null;
}
