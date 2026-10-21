// Catalog health check: what is wrong or missing in server/data/catalog, through the same engine the site uses.
// Run:  npx vite-node scripts/catalog-audit.ts [live-catalog.json] [out-folder]
//   live-catalog.json — optional, the answer of api/index.php?r=catalog from the site (for photos and hidden recipes).
// Writes audit.json (everything) and audit.md (the summary) to out-folder (default: the current folder).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCatalog, courseOf, ingredient, isLenten, nutritionOf, recipes, useCatalog, type Recipe } from "../src/engine";
import { HOLIDAYS, SEASONS, THEMES } from "../src/app/seasonal";

const dir = join(__dirname, "../../server/data/catalog");
const [livePath, outDir = "."] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((name) => ({ name, data: JSON.parse(readFileSync(join(dir, name), "utf8")) }));
const built = buildCatalog(files);
useCatalog(built);
const all = recipes();
const live = livePath ? JSON.parse(readFileSync(livePath, "utf8")) as { photos: Record<string, number>; hidden: string[] } : null;
const hasPhoto = (id: string) => !!live?.photos?.[id];

// The raw entries, for fields the engine fills in by itself.
const raw = new Map<string, Record<string, unknown> & { _file: string }>();
for (const f of files) for (const r of (f.data.recipes ?? []) as Record<string, unknown>[]) raw.set(String(r.id), { ...r, _file: f.name });

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[«»"'().,–—]/g, " ").replace(/\s+/g, " ").trim();
const pct = (n: number, of = all.length) => Math.round((n / of) * 100) + "%";
const list = (rs: Recipe[], max = 12) => rs.slice(0, max).map((r) => r.title + " (" + r.id + ")");
type Finding = { key: string; title: string; count: number; examples: string[]; why: string };
const findings: Finding[] = [];
const add = (key: string, title: string, rs: Recipe[], why: string, examples?: string[]) => { if (rs.length || examples?.length) findings.push({ key, title, count: rs.length || examples!.length, examples: examples ?? list(rs), why }); };

// ---------- Duplicates ----------
const byTitle = new Map<string, Recipe[]>();
for (const r of all) { const k = norm(r.title); byTitle.set(k, [...(byTitle.get(k) ?? []), r]); }
const sameTitle = [...byTitle.values()].filter((g) => g.length > 1);
add("dup-title", "Одинаковые названия", sameTitle.flat(), "Два рецепта с одним названием: человек не понимает, чем они отличаются.", sameTitle.map((g) => g.map((r) => r.id).join(" = ") + " «" + g[0].title + "»"));
// Nearly the same dish: the same ingredient set (without salt, water, oil, pepper) and a shared first word.
const BASIC = new Set(["salt", "water", "vegetable-oil", "black-pepper", "sugar", "butter", "olive-oil", "sunflower-oil"]);
const sig = (r: Recipe) => [...new Set(r.ingredients.filter((i) => !i.optional && !BASIC.has(i.id)).map((i) => i.id))].sort();
const near: string[] = [];
for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
  const x = all[a], y = all[b];
  if (norm(x.title) === norm(y.title) || norm(x.title).split(" ")[0] !== norm(y.title).split(" ")[0]) continue;
  const sx = sig(x), sy = new Set(sig(y));
  if (sx.length < 3) continue;
  const common = sx.filter((i) => sy.has(i)).length;
  if (common / Math.max(sx.length, sy.size) >= 0.85) near.push("«" + x.title + "» ≈ «" + y.title + "»");
}
add("dup-near", "Почти одинаковые рецепты", [], "Тот же набор продуктов и похожее название — возможно, один рецепт записан дважды.", near.slice(0, 40));

// ---------- Time ----------
add("time-long", "Слишком долгое время (больше 6 ч)", all.filter((r) => r.totalMinutes > 360), "Скорее всего, в totalMinutes попали маринование или ожидание. Блюдо выпадает из всех подборок по времени.");
add("time-short", "Подозрительно короткое время (меньше 5 мин)", all.filter((r) => r.totalMinutes < 5), "Почти ничего не готовится за 4 минуты — проверить.");
add("time-active", "Активное время больше общего", all.filter((r) => r.activeMinutes > r.totalMinutes), "activeMinutes не может быть больше totalMinutes.");
add("time-timers", "Таймеры шагов дольше всего рецепта", all.filter((r) => r.steps.reduce((s, st) => s + (st.timerSeconds ?? 0), 0) / 60 > r.totalMinutes * 1.25 + 5), "Сумма таймеров в шагах заметно больше времени рецепта — одно из чисел неверное.");
const minuteWords = /(\d+)\s*(?:–|-)?\s*\d*\s*мин/;
add("time-no-timer", "Шаги с «N минут» без таймера", all.filter((r) => r.steps.some((s) => !s.timerSeconds && minuteWords.test(s.text) && !/ч\.\s?л|ст\.\s?л/.test(s.text))), "В тексте шага есть время, а кнопки таймера нет. Таймеры особенно нужны пожилым.");

// ---------- Nutrition ----------
const kcal = (r: Recipe) => nutritionOf(r).perServing.kcal;
add("kcal-high", "Очень калорийно (больше 1200 ккал на порцию)", all.filter((r) => kcal(r) > 1200), "Либо ошибка в граммах, либо слишком большая порция.");
add("kcal-low", "Очень мало калорий (меньше 40 на порцию, не напитки)", all.filter((r) => kcal(r) < 40 && !["drink", "sauce"].includes(courseOf(r))), "Чаще всего это ошибка в количестве продуктов.");
add("kcal-incomplete", "Калории посчитаны не полностью", all.filter((r) => !nutritionOf(r).complete), "У каких-то продуктов нет состава или веса штуки — калории занижены.");

// ---------- Tags that say the wrong thing ----------
add("kids-broad", "«Детям» стоит слишком широко", all.filter((r) => r.kids === true && (r.tags.includes("spicy") || r.difficulty === "hard" || r.totalMinutes > 120 || /острый|чили|аджик|хрен|горчиц|алкогол|вино|коньяк|пиво|водк/i.test(r.title + " " + r.ingredients.map((i) => i.name).join(" ")))),
  "Острое, алкоголь, сложные или долгие блюда помечены как детские. Сейчас kids=true у " + all.filter((r) => r.kids === true).length + " из " + all.length + " рецептов (" + pct(all.filter((r) => r.kids === true).length) + ").");
add("light-heavy", "«Лёгкое», но больше 600 ккал", all.filter((r) => r.tags.includes("light") && kcal(r) > 600), "Тег light противоречит калориям.");
add("quick-slow", "«Быстро», но дольше 40 минут", all.filter((r) => r.tags.includes("quick") && r.totalMinutes > 40), "Тег quick противоречит времени.");
add("lenten-tagged", "Похоже на постное, но в нём мясо/молоко/яйца", all.filter((r) => /постн/i.test(r.title) && !isLenten(r)), "В названии «постный», а продукты непостные.");

// ---------- Steps and ingredients ----------
add("steps-few", "Слишком мало шагов (1–2)", all.filter((r) => r.steps.length <= 2 && !["drink", "sauce"].includes(courseOf(r))), "Новичку не хватит объяснений.");
add("steps-many", "Очень много шагов (больше 14)", all.filter((r) => r.steps.length > 14), "Тяжело для пожилых: лучше объединить мелкие шаги.");
add("steps-long", "Очень длинные шаги (больше 380 знаков)", all.filter((r) => r.steps.some((s) => s.text.length > 380)), "Стена текста на экране готовки — то, на что жалуются люди. Лучше делить на два шага.");
add("ing-many", "Очень много продуктов (больше 18)", all.filter((r) => r.ingredients.length > 18), "Длинный список пугает. Проверить, нет ли повторов.");
add("ing-zero", "Продукт с количеством 0", all.filter((r) => r.ingredients.some((i) => !i.optional && !(i.amount > 0))), "Ноль граммов — ошибка; «по вкусу» лучше писать как необязательный продукт.");
add("ing-dup", "Один продукт два раза в списке", all.filter((r) => { const ids = r.ingredients.map((i) => i.id + "|" + i.name); return new Set(ids).size !== ids.length; }), "Повтор продукта в списке покупок и на экране.");
const noKcal = (id: string) => { const d = ingredient(id); return !d || !d.per100g || (d.per100g.kcal === 0 && !["water", "salt"].includes(id)); };
const noKcalIds = [...new Set(all.flatMap((r) => r.ingredients.map((i) => i.id)).filter(noKcal))];
add("ing-unknown", "Продукты без состава (калорий)", all.filter((r) => r.ingredients.some((i) => noKcal(i.id))), "Нет калорийности у продукта в справочнике: " + noKcalIds.join(", ") + ".");
// Waiting counted as cooking: long total time, short hands-on time.
add("time-waiting", "Долгое время из-за ожидания (больше 90 мин, руками до 40)", all.filter((r) => r.totalMinutes > 90 && r.activeMinutes <= 40), "Блюдо почти не требует работы, но из-за ожидания (тесто, маринад, остывание) не попадает в «быстрые» и выглядит пугающе долгим.");
add("servings-bad", "Порции: min/max не сходятся с базовой", all.filter((r) => r.minServings > r.servings || r.maxServings < r.servings), "Пересчёт порций будет работать странно.");

// ---------- Fields the service uses that are empty ----------
const fieldGap = (key: string, title: string, why: string, test: (r: Recipe, x: Record<string, unknown> | undefined) => boolean) => add(key, title, all.filter((r) => test(r, raw.get(r.id))), why);
fieldGap("no-summary", "Нет описания или оно в 1–2 слова", "Описание видно на странице рецепта и в поиске Яндекса.", (r) => (r.summary ?? "").trim().length < 25);
fieldGap("no-tips", "Нет советов", "Советы — «Секрет шефа» под шагами и раздел «Советы и хранение».", (r) => !r.tips?.length);
fieldGap("no-storage", "Не указано, сколько хранится", "Нужно для «Сколько хранится?» у Шефа, страниц для поисковиков и плана недели (остатки).", (r) => r.storageDays == null && !["drink"].includes(courseOf(r)));
fieldGap("no-cuisine", "Не указана кухня", "Кухня учится в персональных подборках («кавказская кухня»).", (r, x) => !x?.cuisine);
fieldGap("no-course", "Не указан вид блюда (course)", "Движок угадывает сам, но иногда ошибается: суп в «вторых» и наоборот.", (r, x) => !x?.course);
fieldGap("no-main", "Не указан главный продукт", "Главный продукт нужен для разнообразия («вчера была курица») и вкуса человека.", (r, x) => !x?.mainIngredient);
fieldGap("no-meals", "Не указано, когда едят (завтрак/обед/ужин)", "Без этого на Главной утром может стоять плов, а вечером каша.", (r, x) => !Array.isArray(x?.meals) || !(x!.meals as unknown[]).length);
fieldGap("no-cookware", "Не указана посуда", "Нужно для будущей идеи «сколько посуды мыть» и «посуда под порции».", (r, x) => !Array.isArray(x?.cookware) || !(x!.cookware as unknown[]).length);
fieldGap("no-yield", "Выпечка без «сколько получится»", "«Получится 12 сырников» — понятнее, чем «на 4 порции».", (r, x) => ["baking"].includes(courseOf(r)) && !x?.yields);
fieldGap("no-swap", "Ни одной замены продуктов", "Замены нужны для «Чего-то нет дома» и ответа Шефа «чем заменить».", (r) => !r.ingredients.some((i) => i.swap?.length));
if (live) add("no-photo", "Нет фото", all.filter((r) => !hasPhoto(r.id)), "Карточки без фото выглядят хуже и реже открываются.");

// ---------- Titles ----------
add("title-latin", "Латиница в названии", all.filter((r) => /[a-z]{3,}/i.test(r.title)), "Пожилым непонятно; поиск по-русски не найдёт.");
add("title-long", "Слишком длинное название (больше 55 знаков)", all.filter((r) => r.title.length > 55), "Не помещается в карточку, обрезается.");

// ---------- What there is: kinds, cuisines, main products ----------
const count = <T extends string>(xs: T[]) => Object.entries(xs.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);
const shape = {
  total: all.length, errors: built.errors.length, warnings: built.warnings.length,
  withPhoto: live ? all.filter((r) => hasPhoto(r.id)).length : null,
  course: count(all.map(courseOf)),
  cuisine: count(all.map((r) => r.cuisine ?? "—")),
  main: count(all.map((r) => r.mainIngredient ?? "—")).slice(0, 25),
  difficulty: count(all.map((r) => r.difficulty)),
  time: { "до 20 мин": all.filter((r) => r.totalMinutes <= 20).length, "21–40": all.filter((r) => r.totalMinutes > 20 && r.totalMinutes <= 40).length, "41–90": all.filter((r) => r.totalMinutes > 40 && r.totalMinutes <= 90).length, "больше 90": all.filter((r) => r.totalMinutes > 90).length },
  tags: count(all.flatMap((r) => r.tags)), occasions: count(all.flatMap((r) => r.occasions ?? [])),
  kids: all.filter((r) => r.kids === true).length, lenten: all.filter(isLenten).length,
  vegetarian: all.filter((r) => r.tags.includes("vegetarian") || !r.ingredients.some((i) => (ingredient(i.id)?.groups ?? []).some((g) => ["meat", "poultry", "fish", "seafood"].includes(g)))).length,
  appliances: count(all.flatMap((r) => r.appliances)),
  collections: [...HOLIDAYS, ...SEASONS, ...THEMES].map((c) => [c.title, all.filter(c.test).length] as const),
};

// ---------- Popular dishes that are not in the catalog ----------
// What people search most at home in Russia (and what Шеф is asked for); each line: a name and its stems.
const POPULAR: [string, RegExp][] = ([
  ["Шарлотка", /шарлотк/], ["Сырники", /сырник/], ["Блины", /блин/], ["Оладьи", /олад/], ["Борщ", /борщ/], ["Щи", /(^|\s)щи(\s|$)/], ["Солянка", /солянк/], ["Рассольник", /рассольник/],
  ["Уха", /уха/], ["Харчо", /харчо/], ["Окрошка", /окрошк/], ["Гороховый суп", /горох/], ["Куриный суп с лапшой", /суп.*лапш|лапш.*суп/], ["Грибной суп", /грибн.*суп|суп.*гриб/], ["Сырный суп", /сырн.*суп|суп.*сыр/],
  ["Тыквенный суп", /тыкв.*суп|суп.*тыкв/], ["Свекольник", /свекольник/], ["Плов", /плов/], ["Пельмени", /пельмен/], ["Вареники", /вареник/], ["Манты", /мант/], ["Голубцы", /голубц/], ["Котлеты", /котлет/],
  ["Тефтели", /тефтел/], ["Фрикадельки", /фрикадел/], ["Гуляш", /гуляш/], ["Бефстроганов", /бефстроган/], ["Жаркое", /жарк/], ["Мясо по-французски", /по-французски/], ["Отбивные", /отбивн/],
  ["Шашлык", /шашлык/], ["Курица в духовке", /куриц.*духовк|запеч.*куриц/], ["Куриные крылышки", /крыл/], ["Окорочка", /окороч|бедр/], ["Куриные котлеты", /котлет.*(куриц|курин|индейк)|(куриц|курин).*котлет/], ["Курица карри", /карри/],
  ["Чахохбили", /чахохбили/], ["Цыплёнок табака", /табака/], ["Печень", /печен[ьи]/], ["Сердечки", /сердеч/], ["Макароны по-флотски", /по.флотски/], ["Паста карбонара", /карбонар/], ["Паста болоньезе", /болоньез/],
  ["Лазанья", /лазань/], ["Пицца", /пицц/], ["Ризотто", /ризотто/], ["Гречка с мясом", /гречк.*(мяс|тушен|курин|куриц|говяд|свинин|по-купечески)|по.купечески/], ["Рис с овощами", /рис.*овощ/], ["Картофельное пюре", /пюре/], ["Жареная картошка", /жарен.*картош|картош.*жарен/],
  ["Картофельная запеканка", /картофельн.*запеканк|запеканк.*картоф/], ["Драники", /драник/], ["Тушёная капуста", /тушен.*капуст|капуст.*тушен/], ["Овощное рагу", /рагу/], ["Лечо", /лечо/], ["Кабачковая икра", /икра/],
  ["Фаршированные перцы", /фарширован.*перц|перц.*фарширован/], ["Рыба в духовке", /(рыб|лосос|скумбри|минта|треск|горбуш|форел|хек|судак|сибас|дорадо|карп|щук).*(духовк|запеч)|(запеч|духовк).*(рыб|лосос|скумбри|минта|треск|горбуш|форел|хек)/], ["Рыбные котлеты", /рыбн.*котлет|котлет.*(рыб|минта|щук|треск|хек)/], ["Минтай", /минта/], ["Скумбрия", /скумбри/],
  ["Селёдка под шубой", /шуб/], ["Оливье", /оливье/], ["Цезарь", /цезар/], ["Винегрет", /винегрет/], ["Греческий салат", /греческ/], ["Мимоза", /мимоз/], ["Крабовый салат", /крабов/], ["Салат из капусты", /салат.*капуст|капуст.*салат/],
  ["Морковь по-корейски", /морков.*по.корейски|корейск.*морков/], ["Холодец", /холодец/], ["Заливное", /заливн/], ["Хачапури", /хачапур/], ["Чебуреки", /чебурек/], ["Беляши", /беляш/], ["Пирожки", /пирож/], ["Пирог с капустой", /пирог.*капуст/],
  ["Пирог с яблоками", /пирог.*яблок|яблочн.*пирог/], ["Кулич", /кулич/], ["Пасха творожная", /пасх/], ["Торт Наполеон", /наполеон/], ["Медовик", /медовик/], ["Тирамису", /тирамису/], ["Чизкейк", /чизкейк/], ["Брауни", /брауни/],
  ["Маффины", /маффин|кекс/], ["Печенье", /печень[еяю]/], ["Творожная запеканка", /творожн.*запеканк|запеканк.*творож/], ["Ленивые вареники", /ленив/], ["Омлет", /омлет/], ["Яичница", /яичниц|глазунь/], ["Шакшука", /шакшук|пряном томатном/],
  ["Овсянка", /овсян/], ["Манная каша", /манн/], ["Рисовая каша", /рисов.*каш/], ["Пшённая каша", /пшён|пшен/], ["Гречневая каша", /гречнев|гречк/], ["Гренки", /гренк/], ["Бутерброды", /бутерброд/], ["Шаурма", /шаурм/],
  ["Бургер", /бургер/], ["Наггетсы", /наггетс/], ["Хот-доги", /хот-?дог/], ["Суши/роллы", /ролл|суши/], ["Рамен", /рамен/], ["Фунчоза", /фунчоз/], ["Лагман", /лагман/], ["Шурпа", /шурп/],
  ["Кутабы", /кутаб/], ["Долма", /долм/], ["Хинкали", /хинкал/], ["Лобио", /лобио/], ["Сациви", /сациви/], ["Компот", /компот/], ["Морс", /морс/], ["Кисель", /кисел/],
  ["Квас", /квас/], ["Глинтвейн б/а", /глинтвейн/], ["Смузи", /смузи/], ["Какао", /какао/], ["Варенье", /варенье|джем/], ["Соленья", /солён|малосол|маринован/], ["Аджика", /аджик/], ["Майонез домашний", /майонез/],
] as [string, RegExp][]);
const titles = all.map((r) => norm(r.title + " " + (r.aliases ?? []).join(" ")));
const missing = POPULAR.filter(([, re]) => !titles.some((t) => re.test(t))).map(([n]) => n);

// ---------- Write ----------
const order = ["dup-title", "dup-near", "time-long", "time-waiting", "time-timers", "time-active", "time-short", "kcal-high", "kcal-low", "kcal-incomplete", "kids-broad", "light-heavy", "quick-slow", "lenten-tagged", "ing-zero", "ing-dup", "ing-unknown", "servings-bad", "steps-long", "steps-many", "steps-few", "ing-many", "time-no-timer", "title-latin", "title-long", "no-photo", "no-meals", "no-main", "no-course", "no-cuisine", "no-storage", "no-swap", "no-tips", "no-summary", "no-yield", "no-cookware"];
findings.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
writeFileSync(join(outDir, "audit.json"), JSON.stringify({ shape, findings, missing, errors: built.errors, warnings: built.warnings.slice(0, 200) }, null, 1));
const md = [
  "# Каталог: " + all.length + " рецептов" + (live ? ", с фото " + shape.withPhoto + " (" + pct(shape.withPhoto!) + ")" : ""),
  "Ошибок движка: " + built.errors.length + ", предупреждений: " + built.warnings.length,
  "", "## Что есть", "Виды: " + shape.course.map(([k, n]) => k + " " + n).join(", "), "Кухни: " + shape.cuisine.map(([k, n]) => k + " " + n).join(", "),
  "Главные продукты: " + shape.main.map(([k, n]) => k + " " + n).join(", "), "Сложность: " + shape.difficulty.map(([k, n]) => k + " " + n).join(", "),
  "Время: " + Object.entries(shape.time).map(([k, n]) => k + " — " + n).join(", "), "Теги: " + shape.tags.map(([k, n]) => k + " " + n).join(", "),
  "Поводы: " + shape.occasions.map(([k, n]) => k + " " + n).join(", "), "Детям: " + shape.kids + ", постных: " + shape.lenten + ", без мяса и рыбы: " + shape.vegetarian,
  "Техника: " + shape.appliances.map(([k, n]) => k + " " + n).join(", "), "Подборки: " + shape.collections.map(([k, n]) => k + " " + n).join(", "),
  "", "## Нет популярных блюд (" + missing.length + ")", missing.join(", "),
  "", "## Проблемы", ...findings.flatMap((f) => ["### " + f.title + " — " + f.count, f.why, ...f.examples.map((e) => "- " + e), ""]),
  "## Ошибки движка", ...built.errors.slice(0, 30).map((e) => "- " + e.file + " · " + e.item + ": " + e.message),
].join("\n");
writeFileSync(join(outDir, "audit.md"), md);
console.log(md.slice(0, 1200));
