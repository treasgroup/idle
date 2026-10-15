// @ts-nocheck
/* eslint-disable */
// Pure helpers that lived in the old UI layer: message clean-up before parsing, home-pantry shelf life.
// Ported as-is from the previous build. Import via ./index.ts.
import { _e, Xb, cu, me, Rr } from "./core.js";
import { Tt } from "./services.js";

var jO = [
    [/(^|\s)(скока|скоко|скок|скольк)(?=[\s,.!?;:]|$)/g, "$1сколько"],
    [/(^|\s)(ч[её]|чо|шо|чего-то)(?=[\s,.!?;:]|$)/g, "$1что"],
    [
      /(^|\s)(чё|че|что|чо)[- ]?(нить|нибудь|нибуть|нибуд)(?=[\s,.!?;:]|$)/g,
      "$1что-нибудь",
    ],
    [/(^|\s)(чтото|че-то|чет|чот|чёт)(?=[\s,.!?;:]|$)/g, "$1что-то"],
    [/(^|\s)(щас|ща|счас)(?=[\s,.!?;:]|$)/g, "$1сейчас"],
    [
      /(^|\s)что такое(?=\s+(вкусн|интересн|необычн|быстр|легк|лёгк|сытн|простое|простенькое|приготовить|сделать|сварить|испечь|поесть))/g,
      "$1что-нибудь",
    ],
    [/(^|\s)(ваще|вобще|вообщем)(?=[\s,.!?;:]|$)/g, "$1вообще"],
    [/(^|\s)(тока|токо)(?=[\s,.!?;:]|$)/g, "$1только"],
    [/(^|\s)(канеш|канешн[оа]|конешно)(?=[\s,.!?;:]|$)/g, "$1конечно"],
    [
      /(^|\s)(пожрать|похавать|поесть бы|пожевать|перекусить бы)(?=[\s,.!?;:]|$)/g,
      "$1поесть",
    ],
    [/(^|\s)(жрать|хавать|шамать)(?=[\s,.!?;:]|$)/g, "$1есть"],
    [/(^|\s)(хавчик|жратв[аыу]|хавк[аиу])(?=[\s,.!?;:]|$)/g, "$1еду"],
    [/(^|\s)картох[аиуе](?=[\s,.!?;:]|$)/g, "$1картошка"],
    [/(^|\s)(хз|фиг знает|без понятия)(?=[\s,.!?;:]|$)/g, "$1не знаю"],
    [/(^|\s)(мб|можт)(?=[\s,.!?;:]|$)/g, "$1может"],
    [/(^|\s)(оч|оооочень|ооочень|оочень)(?=[\s,.!?;:]|$)/g, "$1очень"],
    [/(^|\s)(кушоц|кушац|кушоть|кушатб)(?=[\s,.!?;:]|$)/g, "$1кушать"],
    [
      /(^|\s)(пасиб[оа]?|спс|спасибочки|спасибки)(?=[\s,.!?;:]|$)/g,
      "$1спасибо",
    ],
    [
      /(^|\s)(плиз|плз|пжлст|пожалуста|пожалуйсто)(?=[\s,.!?;:]|$)/g,
      "$1пожалуйста",
    ],
    [/(^|\s)([а-я]{2,}[йь])те(?=[\s,.!?;:]|$)/g, "$1$2"],
    [
      /(^|\s)(покаж|подскаж|скаж|расскаж|найд|подбер|выбер|удив|помог|предлож|убер|исключ|свар|отвар|науч|повтор|очист|включ|выключ|верн|начн|объясн|посовет|сдела|пригот|запек|пожар)ите(?=[\s,.!?;:]|$)/g,
      "$1$2и",
    ],
    [/(^|\s)вы умеете(?=[\s,.!?;:]|$)/g, "$1ты умеешь"],
    [/(^|\s)(кто|как|что|а) вы(?=[\s,.!?;:]|$)/g, "$1$2 ты"],
    [/(^|\s)вас зовут(?=[\s,.!?;:]|$)/g, "$1тебя зовут"],
    [/(^|\s)у вас(?=[\s,.!?;:]|$)/g, "$1у тебя"],
  ],
  HO =
    /(^|\s)(ой|ай|ох|ах|эх|эм|эээ+|ээ|ммм+|мм|хм+|ну|короче|кароче|типа|типо|слушай|слышь|значит|в общем|вообщем|это самое|как бы|так сказать|наверное|наверно|походу|вот|блин|блин блинский|ёлки|елки|пожалуйста|давай-ка|ладно|окей|ок)(?=[\s,.!?;:]|$)/g,
  VO = /(^|\s)(?![свкуоиаяж])[а-яa-z](?=[\s,.!?;:]|$)/g;
function V0(e) {
  let t = _e(e)
    .replace(/[«»"“”„]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return t;
  t = Xb(cu(t));
  for (let [a, i] of jO) t = t.replace(a, i);
  return (
    (t = t.replace(
      /(^|\s)не знаю(?!\s*(что|чего|чем|как|какой|какое|какую))(?=[\s,.]|$)/g,
      "$1",
    )),
    t.split(/\s+/).filter(Boolean).length > 2 &&
      (t = t.replace(HO, "$1").replace(VO, "$1")),
    (t = t
      .replace(/\s+([,.!?])/g, "$1")
      .replace(/([,.!?])(\s*[,.!?])+/g, "$1")
      .replace(/^[\s,.!?]+/, "")
      .replace(/\s+/g, " ")
      .trim()),
    cu(t) || _e(e).trim()
  );
}

var F0 = 864e5,
  b4 = {
    "minced-pork-beef": 1,
    "minced-beef": 1,
    "beef-liver": 1,
    "chicken-fillet": 2,
    "chicken-thigh-fillet": 2,
    "pollock-fillet": 2,
    "pink-salmon-fillet": 2,
    "salted-herring-fillet": 5,
    beef: 3,
    pork: 3,
    "boiled-sausage": 5,
    frankfurters: 5,
    ham: 5,
    "smoked-pork": 10,
    "crab-sticks": 5,
    milk: 5,
    kefir: 5,
    "sour-cream": 7,
    "cottage-cheese": 3,
    cream: 5,
    "plain-yogurt": 7,
    butter: 30,
    "hard-cheese": 20,
    "processed-cheese": 14,
    "feta-cheese": 10,
    egg: 25,
    mayonnaise: 30,
    mushroom: 3,
    dill: 4,
    parsley: 4,
    "green-onion": 4,
    cilantro: 4,
    spinach: 3,
    sorrel: 3,
    "romaine-lettuce": 4,
    tomato: 5,
    cucumber: 5,
    zucchini: 7,
    eggplant: 7,
    "bell-pepper": 7,
    radish: 7,
    cabbage: 30,
    carrot: 21,
    beet: 30,
    potato: 30,
    pumpkin: 30,
    apple: 21,
    banana: 4,
    onion: null,
    "red-onion": null,
    garlic: null,
    "white-bread": 3,
    lavash: 4,
    "cooked-rice": 2,
    sauerkraut: 14,
    "pickled-cucumber": 30,
    "frozen-peas": null,
    "frozen-dumplings": null,
    "frozen-potato-dumplings": null,
    "frozen-pitted-cherry": null,
  };
function v4(e) {
  if (e in b4) return b4[e];
  let t = me(e),
    n = (t?.name || e).toLowerCase(),
    a = Rr({ ingredientId: e, name: n });
  return a === "meat"
    ? /фарш|печень|печёнк|печенк/.test(n)
      ? 1
      : t?.groups.includes("poultry") || /куриц|курин|индейк/.test(n)
        ? 2
        : /колбас|сосиск|ветчин|сардел/.test(n)
          ? 5
          : /копч|вялен/.test(n)
            ? 10
            : 3
    : a === "fish"
      ? /солён|солен|копч/.test(n)
        ? 5
        : 2
      : a === "dairy"
        ? /яйц|яиц/.test(n)
          ? 25
          : /масло/.test(n)
            ? 30
            : /твёрд|тверд|сыр/.test(n)
              ? 14
              : /творог/.test(n)
                ? 3
                : /сметан|йогурт/.test(n)
                  ? 7
                  : 5
        : a === "veg"
          ? /зелен|укроп|петруш|кинз|салат|шпинат|базилик/.test(n)
            ? 4
            : /гриб|шампин|вешенк/.test(n)
              ? 3
              : /картоф|капуст|свёкл|свекл|морков|тыкв|лук|чеснок/.test(n)
                ? 21
                : 7
          : a === "bread"
            ? 3
            : null;
}
var p6 = (e) => {
  let t = v4(e);
  return t !== null && t <= 7;
};
function k4(e, t = Date.now()) {
  let n = v4(e);
  return { id: e, at: t, until: n === null ? null : x4(t + n * F0) };
}
function x4(e) {
  let t = new Date(e);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59).getTime();
}
function Gm(e, t = Date.now()) {
  if (e.until === null) return null;
  let n = new Date(t),
    a = new Date(e.until);
  return Math.round(
    (new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() -
      new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) /
      F0,
  );
}
function Iu(e, t = Date.now()) {
  let n = Gm(e, t);
  return n === null
    ? ""
    : n < 0
      ? "срок вышел"
      : n === 0
        ? "истекает сегодня"
        : n === 1
          ? "истекает завтра"
          : n <= 4
            ? "ещё " + n + " дня"
            : "до " +
            new Date(e.until)
              .toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
              .replace(".", "");
}
function gl(e, t = Date.now()) {
  return e
    .filter((n) => {
      let a = Gm(n, t);
      return a !== null && a <= 1;
    })
    .sort((n, a) => (n.until ?? 0) - (a.until ?? 0));
}
function w4(e, t, n = Date.now()) {
  return { ...e, until: t === null ? null : x4(n + t * F0) };
}
function T4(e, t, n = Date.now()) {
  let a = e.filter((i) => t.includes(i.id));
  return [
    ...a,
    ...t.filter((i) => !a.some((s) => s.id === i)).map((i) => k4(i, n)),
  ];
}
function J0(e, t, n = Date.now()) {
  let a = t.filter((i) => !!me(i) && i !== "water");
  return [
    ...e.filter((i) => !a.includes(i.id)),
    ...[...new Set(a)].map((i) => k4(i, n)),
  ];
}
function m6(e, t) {
  let n = new Set(t.ingredients.filter((a) => !a.optional).map((a) => a.id));
  return e.filter((a) => n.has(a.id) && p6(a.id));
}
function Lu(e, t) {
  let n = m6(e.fridge, t);
  return n.length
    ? {
        data: {
          ...e,
          fridge: e.fridge.filter((a) => !n.some((i) => i.id === a.id)),
        },
        removed: n,
      }
    : { data: e, removed: n };
}
function $0(e, t) {
  let n = Tt(t);
  return e.filter((a) => a.until !== null && Tt(new Date(a.until)) === n);
}

var Qm = (e) =>
  e % 10 === 1 && e % 100 !== 11
    ? "продукт"
    : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 12 || e % 100 > 14)
      ? "продукта"
      : "продуктов";
var z6 = (e) => {
    if (!e.available.length && !e.missing.length) return "";
    let t = e.toBuy.length;
    if (!t) return "Всё есть дома";
    let n = e.toBuy.slice(0, 3).join(", ").toLowerCase() + (t > 3 ? "…" : "");
    return (
      (t === 1
        ? "Не хватает 1 продукта: "
        : "Нужно докупить " + t + " " + Qm(t) + ": ") + n
    );
  };
var cv = (e) =>
    e.map((t) => ({ id: t.recipe.id, reason: t.reason, note: z6(t) }));

export { V0, b4, v4, p6, k4, x4, Gm, Iu, gl, w4, T4, J0, m6, Lu, $0, Qm, z6, cv };
