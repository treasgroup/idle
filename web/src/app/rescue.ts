// «Спасти блюдо»: what to do when something goes wrong at the stove — 2–3 short actions, no lecture. The list fits the
// dish (its course, main product, ingredients and cooking method): a pilaf gets rice and the bottom of the pot, a cake
// gets dough that will not rise. Written by hand, works offline; the recipe's own steps never change.
// The same answers will make the «Спасение» part of Школа готовки.
import type { Recipe } from "../engine";

export interface Trouble {
  id: string;
  title: string;
  steps: string[];
  /** A wait inside the answer: offered as a timer button. */
  minutes?: number;
}

interface Kind {
  soup: boolean; meat: boolean; minced: boolean; fish: boolean; rice: boolean; grain: boolean; pasta: boolean; mash: boolean;
  baking: boolean; yeast: boolean; cream: boolean; sauce: boolean; dessert: boolean; pancakes: boolean;
  syrniki: boolean; salad: boolean; fry: boolean; omelet: boolean; casserole: boolean; dumplings: boolean; roastVeg: boolean; drink: boolean;
}

function kindOf(r: Recipe): Kind {
  const ids = r.ingredients.map((i) => i.id).join(" ");
  const title = r.title.toLowerCase();
  const steps = r.steps.map((s) => s.text).join(" ").toLowerCase();
  const main = r.mainIngredient ?? "";
  const course = r.course;
  return {
    soup: course === "soup",
    meat: /beef|pork|lamb|veal|chicken|turkey|duck|minced|liver|meat/.test(main) && course !== "soup",
    minced: /котлет|тефтел|фрикадел|биточ|зраз|люля/.test(title) && course !== "soup",
    fish: /fish|salmon|cod|pollock|tuna|trout|mackerel|hake|pike|perch|shrimp/.test(main) && course !== "soup",
    rice: /(?:^|-)rice/.test(main) || /плов|ризотто|паэль/.test(title),
    grain: /buckwheat|millet|pearl-barley|bulgur|couscous|oat-flakes|semolina|lentil/.test(main) || /каша|гречк|пшен|перлов|булгур/.test(title),
    pasta: /pasta|spaghetti|noodle|lasagn/.test(main) || /паста|макарон|спагетти|лапш/.test(title),
    mash: /пюре/.test(title) && /potato/.test(ids),
    baking: course === "baking",
    yeast: /yeast/.test(ids),
    cream: /heavy-cream|whipping/.test(ids) && /взб/.test(steps),
    sauce: course === "sauce" || /соус|подлив/.test(title) || /загуст|крахмал/.test(steps),
    dessert: course === "dessert",
    pancakes: /блин|оладь|панкейк/.test(title),
    syrniki: /сырник/.test(title),
    salad: course === "salad",
    fry: /жар|обжар|фритюр/.test(steps),
    omelet: /омлет|фриттат/.test(title),
    casserole: /запеканк|лазань|гратен/.test(title),
    dumplings: /вареник|пельмен|манты|хинкали|равиоли/.test(title),
    roastVeg: (course === "side" || /овощ|капуст|кабач|баклажан|тыкв|брокколи/.test(title)) && /запек|духовк/.test(steps),
    drink: course === "drink",
  };
}

const T = (id: string, title: string, steps: string[], minutes?: number): Trouble => ({ id, title, steps, ...(minutes ? { minutes } : {}) });

const SALTY_SOUP = T("salty-soup", "Пересолено", [
  "Долейте горячей воды или несолёного бульона и доведите до кипения.",
  "Добавьте ложку сметаны или немного лимонного сока — кислое и сливочное смягчают соль.",
  "Можно сварить в супе горсть риса или вермишели без соли — порций станет больше, соли в каждой меньше.",
]);
const SALTY = T("salty", "Пересолено", [
  "Увеличьте несолёную часть: добавьте овощей, крупы или гарнира без соли.",
  "Подайте со сметаной, йогуртом или долькой лимона — они смягчают солёность.",
  "Соус и гарнир к этому блюду не солите.",
]);
const BURNT = T("burnt", "Подгорело", [
  "Снимите с огня и не мешайте — иначе горелое уйдёт во всё блюдо.",
  "Аккуратно переложите верхнюю часть в чистую посуду, пригоревшее оставьте на дне.",
  "Если пахнет гарью, положите сверху ломтик хлеба на 5–10 минут — он заберёт часть запаха.",
], 10);
const SMOKE = T("oil-smoke", "Масло брызгает или дымит", [
  "Убавьте огонь: дым значит, что масло перегрелось.",
  "Брызги — от воды: обсушите продукты бумажным полотенцем перед жаркой.",
  "Если масло вспыхнуло — накройте крышкой и выключите огонь. Водой не тушить!",
]);
const STICKS = T("sticks", "Прилипает к сковороде", [
  "Не двигайте кусок 2–3 минуты: когда схватится корочка, он отлипнет сам.",
  "Сковорода и масло должны прогреться до того, как кладёте продукт.",
  "Если прилипло намертво — добавьте ложку масла с края и подденьте тонкой лопаткой.",
]);

const SOUP = [
  T("soup-bland", "Пресный вкус", [
    "Посолите понемногу и попробуйте через минуту.",
    "Добавьте каплю кислоты: лимонный сок, ложку сметаны или рассола.",
    "В самом конце — свежая зелень и немного чеснока.",
  ]),
  T("soup-thin", "Слишком жидкий", [
    "Варите без крышки ещё 10 минут — лишняя вода выкипит.",
    "Или разомните часть картошки или овощей прямо в кастрюле.",
  ], 10),
  T("soup-thick", "Слишком густой", [
    "Долейте горячей воды или бульона по полстакана.",
    "Доведите до кипения и попробуйте соль.",
  ]),
  T("soup-cloudy", "Бульон мутный", [
    "Убавьте огонь: бульон должен едва булькать, а не кипеть ключом.",
    "Снимите пену шумовкой.",
    "Если нужен прозрачный — процедите через сито с бумажной салфеткой.",
  ]),
];

// Cutlets, meatballs and the like: the trouble everyone meets first.
const MINCED = T("minced-falls", "Котлеты разваливаются", [
  "Уберите фарш в холодильник на 15–20 минут — холодный держит форму лучше.",
  "Добавьте в фарш ещё немного хлеба, размоченного в молоке, или ложку манки и хорошо вымешайте, «отбейте» фарш о миску.",
  "Жарьте на хорошо разогретой сковороде и не переворачивайте, пока снизу не схватится корочка.",
]);

const MEAT = [
  T("meat-tough", "Мясо жёсткое", [
    "Долейте немного горячей воды, накройте крышкой.",
    "Тушите на слабом огне ещё 20–30 минут: жёсткое мясо мягчеет от долгого томления, а не от сильного огня.",
  ], 20),
  T("meat-raw", "Снаружи готово, внутри сырое", [
    "Убавьте огонь до слабого и накройте крышкой.",
    "Или переложите в духовку на средний жар на 10–15 минут.",
    "Проверьте: проткните в самом толстом месте — сок должен быть прозрачным, без розового.",
  ], 10),
  T("meat-dry", "Получилось сухим", [
    "Нарежьте тонко поперёк волокон.",
    "Полейте соусом, бульоном или сливками и прогрейте под крышкой 2–3 минуты.",
  ]),
];

const FISH = [
  T("fish-breaks", "Рыба разваливается", [
    "Переворачивайте один раз, широкой лопаткой.",
    "Жарьте сначала на коже и дайте корочке схватиться.",
    "Если уже развалилась — подайте кусочками с соусом, будто так и задумано.",
  ]),
];

const UNDERCOOKED_RICE = T("rice-hard", "Рис не доварился, а вода ушла", [
  "Сделайте ложкой 4–5 ямок до дна.",
  "Влейте в них полстакана кипятка.",
  "Накройте крышкой, самый слабый огонь, 10 минут.",
], 10);
const UNDERCOOKED = T("grain-hard", "Не доварилось, а вода ушла", [
  "Долейте полстакана кипятка.",
  "Накройте крышкой: самый слабый огонь, 10 минут, не мешайте.",
], 10);
const MUSHY = T("grain-mushy", "Разварилось, получилась каша", [
  "Снимите крышку и дайте постоять 5 минут — уйдёт лишний пар.",
  "Разрыхлите вилкой, а не ложкой.",
  "Если совсем каша — сделайте из неё котлетки или запеканку.",
]);
const WATERY = T("grain-water", "Готово, а вода осталась", [
  "Слейте лишнюю воду через сито или придерживая крышкой.",
  "Подержите пару минут без крышки на слабом огне.",
]);
const PASTA = [
  T("pasta-stuck", "Макароны слиплись", [
    "Промойте горячей водой.",
    "Сразу смешайте с ложкой масла или с соусом.",
  ]),
];
const MASH = [
  T("mash-lumps", "Пюре с комками", [
    "Разомните толкушкой, пока картошка горячая.",
    "Влейте горячее молоко понемногу и взбейте.",
    "Не блендером: от него пюре становится клейким.",
  ]),
];

const BAKING = [
  T("dough-rise", "Тесто не поднимается", [
    "Перенесите в тёплое место без сквозняка — например, в выключенную духовку с включённой лампочкой.",
    "Подождите ещё 20–30 минут.",
    "Если дрожжи старые — растворите свежие в тёплой воде с ложкой сахара и вмешайте в тесто.",
  ], 30),
  T("dough-sticky", "Тесто липнет к рукам", [
    "Смажьте руки маслом или смочите водой.",
    "Подсыпайте муку по ложке, не больше — иначе выпечка станет жёсткой.",
    "Уберите тесто в холодильник на 15 минут: с холодным легче работать.",
  ], 15),
  T("bake-top", "Верх подгорает, а внутри сырое", [
    "Накройте форму фольгой.",
    "Убавьте жар и пеките дальше.",
    "Проверьте деревянной шпажкой: выходит сухой — готово.",
  ]),
  T("bake-fell", "Осело после духовки", [
    "Вкус от этого не пострадал.",
    "Нарежьте и подайте с кремом, сметаной или ягодами.",
    "В следующий раз не открывайте духовку первые 20 минут.",
  ]),
];

const THICKEN = [
  T("not-thick", "Не густеет", [
    "Прогрейте ещё 2–3 минуты, помешивая.",
    "Для соуса: разведите ложку крахмала в холодной воде и влейте тонкой струйкой, не переставая мешать.",
    "Крем уберите в холодильник — остынет и загустеет.",
  ]),
  T("lumps", "Получились комочки", [
    "Пробейте венчиком или блендером.",
    "Или протрите через сито.",
  ]),
  T("curdled", "Свернулось, расслоилось", [
    "Снимите с огня.",
    "Добавьте ложку холодной воды или сливок и энергично взбейте венчиком.",
  ]),
];
const CREAM = T("cream-whip", "Сливки не взбиваются", [
  "Охладите сливки, миску и венчик в холодильнике 15 минут.",
  "Нужны сливки жирностью от 30%.",
  "Взбивайте сначала на малой скорости, потом на большой.",
], 15);

const PANCAKES = [
  T("pancake-tear", "Блины рвутся или прилипают", [
    "Хорошо прогрейте сковороду и смажьте маслом перед первым блином.",
    "Добавьте в тесто ложку масла и дайте ему постоять 15 минут.",
    "Если всё равно рвутся — добавьте одно яйцо или ложку муки.",
  ], 15),
];
const SYRNIKI = [
  T("syrniki-spread", "Сырники расползаются", [
    "Добавьте ложку муки или манки.",
    "Уберите массу в холодильник на 15 минут.",
    "Жарьте на среднем огне и переворачивайте один раз.",
  ], 15),
];
const OMELET = [
  T("omelet-fell", "Омлет опал", [
    "Вкус от этого не пострадал — подавайте сразу.",
    "В следующий раз не открывайте крышку или духовку первые 10 минут.",
  ]),
  T("omelet-raw-top", "Снизу пригорает, сверху жидкий", [
    "Убавьте огонь и накройте крышкой — верх дойдёт паром.",
    "3–4 минуты, не переворачивая.",
  ], 4),
];
const CASSEROLE = [
  T("casserole-raw", "В середине сырая", [
    "Накройте фольгой и допеките 10–15 минут.",
    "Проверьте шпажкой в самой середине.",
  ], 10),
  T("casserole-spreads", "Расползается при нарезке", [
    "Дайте постоять 10–15 минут — остывая, она схватится.",
    "Режьте острым ножом, смоченным в горячей воде.",
  ], 10),
];
const DUMPLINGS = [
  T("dumplings-stuck", "Слиплись", [
    "Перемешайте, отделите ложкой и добавьте ложку масла.",
    "Варите в большой кастрюле и помешайте сразу, как опустили.",
  ]),
  T("dumplings-burst", "Разварились, лопаются", [
    "Убавьте огонь: вода должна кипеть тихо.",
    "Вынимайте через 2–3 минуты после того, как всплыли.",
  ]),
];
const ROAST_VEG = [
  T("veg-steamed", "Овощи не запекаются, а тушатся", [
    "Разложите в один слой — им нужно место.",
    "Сделайте жар сильнее и пеките без крышки и фольги.",
  ]),
];
const DRINK = [
  T("drink-sweet", "Слишком сладко", [
    "Разбавьте холодной кипячёной водой.",
    "Добавьте несколько капель лимонного сока.",
  ]),
  T("drink-bland", "Несладко или пресно", [
    "Добавьте сахар или мёд, пока напиток тёплый.",
    "Дайте настояться ещё 30 минут — вкус станет ярче.",
  ], 30),
];

const SALAD = [
  T("salad-juice", "Салат пустил сок", [
    "Слейте лишний сок.",
    "Заправляйте прямо перед подачей.",
    "Огурцы и помидоры солите в последний момент.",
  ]),
];

/** 4–6 troubles that fit this dish: its own first, then «Пересолено» and «Подгорело». */
export function troublesFor(r: Recipe): Trouble[] {
  const k = kindOf(r);
  if (k.drink) return DRINK;
  const own: Trouble[] = [];
  if (k.omelet) own.push(...OMELET);
  if (k.casserole) own.push(...CASSEROLE);
  if (k.dumplings) own.push(...DUMPLINGS);
  if (k.roastVeg) own.push(...ROAST_VEG);
  if (k.soup) own.push(...SOUP);
  if (k.rice) own.push(UNDERCOOKED_RICE, MUSHY);
  else if (k.grain) own.push(UNDERCOOKED, MUSHY, WATERY);
  if (k.pasta) own.push(...PASTA);
  if (k.mash) own.push(...MASH);
  if (k.minced) own.push(MINCED);
  if (k.meat) own.push(...MEAT);
  if (k.fish) own.push(...FISH);
  if (k.pancakes) own.push(...PANCAKES);
  if (k.syrniki) own.push(...SYRNIKI);
  if (k.baking && !k.pancakes && !k.syrniki) own.push(...BAKING.filter((t) => k.yeast || t.id !== "dough-rise"));
  if (k.cream) own.push(CREAM);
  if (k.sauce || k.dessert) own.push(...THICKEN);
  if (k.salad) own.push(...SALAD);
  if (k.fry && !k.soup && !k.baking) own.push(STICKS, SMOKE);
  const seen = new Set<string>();
  const list = own.filter((t) => !seen.has(t.id) && seen.add(t.id)).slice(0, 4);
  list.push(k.soup ? SALTY_SOUP : SALTY);
  if (!k.salad && !k.dessert) list.push(BURNT);
  return list.slice(0, 6);
}

/** Every answer once (for Школа готовки → «Спасение»). */
export const ALL_TROUBLES: Trouble[] = [SALTY_SOUP, SALTY, BURNT, SMOKE, STICKS, ...SOUP, MINCED, ...MEAT, ...FISH, UNDERCOOKED_RICE, UNDERCOOKED, MUSHY, WATERY,
  ...PASTA, ...MASH, ...BAKING, ...THICKEN, CREAM, ...PANCAKES, ...SYRNIKI, ...SALAD, ...OMELET, ...CASSEROLE, ...DUMPLINGS, ...ROAST_VEG, ...DRINK];

/** Школа готовки → «Спасение»: the same answers, by kind of dish. */
export const RESCUE_GROUPS: { title: string; items: Trouble[] }[] = [
  { title: "Супы", items: [...SOUP, SALTY_SOUP] },
  { title: "Крупы, паста, пюре", items: [UNDERCOOKED_RICE, UNDERCOOKED, MUSHY, WATERY, ...PASTA, ...MASH] },
  { title: "Мясо и рыба", items: [MINCED, ...MEAT, ...FISH] },
  { title: "Жарка", items: [STICKS, SMOKE, BURNT, SALTY] },
  { title: "Выпечка, блины, сырники", items: [...BAKING, ...PANCAKES, ...SYRNIKI] },
  { title: "Соусы, кремы, сливки", items: [...THICKEN, CREAM] },
  { title: "Яйца, запеканки, вареники", items: [...OMELET, ...CASSEROLE, ...DUMPLINGS] },
  { title: "Овощи и салаты", items: [...ROAST_VEG, ...SALAD] },
  { title: "Напитки", items: DRINK },
];
