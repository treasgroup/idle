// Collections on Главная: the holiday that is near (only then), the time of year (always), and themes —
// a romantic dinner, for children, for guests… Each is a rule over the catalog; a theme with too few dishes hides.
import { apiUrl, courseOf, isLenten, type Recipe } from "../engine";

/** Orthodox Easter (Gregorian date) for a year. */
export function orthodoxEaster(year: number): Date {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return new Date(year, month - 1, day + 13); // Julian → Gregorian (1900–2099)
}

export interface Collection { key: string; title: string; hint: string; emoji: string; test: (r: Recipe) => boolean }

const days = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 864e5);
const title = (re: RegExp) => (r: Recipe) => re.test(r.title);
const occasion = (...o: string[]) => (r: Recipe) => o.some((x) => r.occasions?.includes(x));
const course = (...c: string[]) => (r: Recipe) => c.includes(courseOf(r));

/** A holiday or a season: when it is shown (`active`) and the same in words for the admin panel (`when`). */
export interface Timed extends Collection { when: string; active: (now: Date) => boolean }

// Day counts from `now` to a date of its year; Easter's comes from orthodoxEaster.
const dayOf = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());
const toEaster = (now: Date) => days(orthodoxEaster(now.getFullYear()), dayOf(now));
const near = (mm: number, dd: number, before = 14) => (now: Date) => { const n = days(new Date(now.getFullYear(), mm - 1, dd), dayOf(now)); return n >= 0 && n <= before; };
const month = (now: Date) => now.getMonth() + 1;

/** In order of priority: the first active one is shown. */
export const HOLIDAYS: Timed[] = [
  { key: "newyear", emoji: "🎄", title: "К Новому году", hint: "Салаты, горячее и закуски к столу", when: "весь декабрь", active: (n) => month(n) === 12, test: (r) => occasion("new-year")(r) || title(/оливье|шуб|холодец|заливн/i)(r) },
  // After the holiday: something light and simple, soups and porridge, and ideas for what is left.
  { key: "afterny", emoji: "🥣", title: "После праздника", hint: "Лёгкое, супы и что сделать с остатками", when: "1–8 января", active: (n) => month(n) === 1 && n.getDate() <= 8, test: (r) => !occasion("new-year")(r) && r.difficulty !== "hard" && (r.tags.includes("light") || course("soup", "breakfast")(r) || title(/омлет|каш[аи]|запеканк|овощ/i)(r)) },
  { key: "maslenitsa", emoji: "🥞", title: "Масленица", hint: "Блины, оладьи и всё к ним", when: "масленичная неделя", active: (n) => toEaster(n) >= 49 && toEaster(n) <= 55, test: (r) => occasion("maslenitsa")(r) || title(/блин|олад|сырник|панкейк/i)(r) },
  { key: "easter", emoji: "🥚", title: "К Пасхе", hint: "Выпечка и праздничный стол", when: "неделя перед Пасхой", active: (n) => toEaster(n) >= 0 && toEaster(n) <= 7, test: (r) => occasion("easter")(r) || course("baking", "dessert")(r) || title(/кулич|пасх|творож/i)(r) },
  { key: "feb23", emoji: "🎖️", title: "К 23 февраля", hint: "Сытное горячее и закуски", when: "12–23 февраля", active: near(2, 23, 11), test: (r) => (occasion("holiday", "guests")(r) || r.tags.includes("hearty")) && course("main", "snack")(r) },
  { key: "mar8", emoji: "💐", title: "К 8 Марта", hint: "Нежные салаты, десерты и ужин для двоих", when: "26 февраля – 8 марта", active: near(3, 8, 10), test: (r) => occasion("date")(r) || (occasion("holiday", "guests")(r) && course("salad", "dessert", "baking")(r)) },
  { key: "lent", emoji: "🌿", title: "Великий пост", hint: "Постные блюда на каждый день", when: "весь Великий пост", active: (n) => toEaster(n) >= 1 && toEaster(n) <= 48, test: (r) => isLenten(r) && course("main", "soup", "salad")(r) },
  { key: "may", emoji: "🔥", title: "Майские: на природу", hint: "Шашлык, гриль и всё для пикника", when: "26 апреля – 10 мая", active: (n) => (month(n) === 4 && n.getDate() >= 26) || (month(n) === 5 && n.getDate() <= 10), test: (r) => occasion("picnic")(r) || title(/шашлык|гриль|мангал|кебаб|люля/i)(r) },
  { key: "halloween", emoji: "🎃", title: "К Хеллоуину", hint: "Тыквенное и для детского праздника", when: "17–31 октября", active: near(10, 31), test: (r) => occasion("kids-party")(r) || title(/тыкв/i)(r) },
];

/** The holiday that is near — about two weeks before it — or a church time; null when there is none (no shelf then). */
export function holidayCollection(now = new Date()): Timed | null {
  return HOLIDAYS.find((h) => h.active(now)) ?? null;
}

export const SEASONS: Timed[] = [
  { key: "summer", emoji: "☀️", title: "Летнее", hint: "Окрошка, холодные супы и салаты", when: "июнь – август", active: (n) => month(n) >= 6 && month(n) <= 8, test: title(/окрошк|холодник|гаспачо|свекольник|салат|огур|кабач/i) },
  { key: "autumn", emoji: "🍂", title: "Осеннее", hint: "Тыква, грибы и яблоки", when: "сентябрь – ноябрь", active: (n) => month(n) >= 9 && month(n) <= 11, test: title(/тыкв|гриб|шампиньон|яблок|шарлотк/i) },
  { key: "spring", emoji: "🌱", title: "Весеннее", hint: "Зелень, щавель, редис и молодые овощи", when: "март – май", active: (n) => month(n) >= 3 && month(n) <= 5, test: (r) => r.tags.includes("fresh") || title(/щавел|зелен|редис|молод|шпинат|огур|салат/i)(r) },
  { key: "winter", emoji: "❄️", title: "Согревающее", hint: "Супы, рагу и всё горячее", when: "декабрь – февраль", active: (n) => month(n) === 12 || month(n) <= 2, test: (r) => course("soup")(r) || title(/рагу|жарк|туш/i)(r) },
];

/** The time of year: always one. */
export function seasonCollection(now = new Date()): Timed {
  return SEASONS.find((s) => s.active(now)) ?? SEASONS[3];
}

export interface Theme extends Collection { when?: (now: Date) => boolean }

const MOVIE = /пицц|начос|крыл|гренк|чипс|попкорн|бургер|хот-?дог|шаурм|наггетс|кесадиль|сэндвич|бутерброд|тако/i;
const ROMANTIC = /лосос|форел|стейк|ризотто|паст[аы](?![а-яё])|креветк|утк|фондан|тирамису|панна|медальон/i;
const SICK = /бульон|куриный суп|суп с курицей|кисел|морс|каш[аи]|овсян/i;
const isWarmMonth = (now: Date) => { const m = now.getMonth() + 1; return m >= 5 && m <= 8; };
// «Детям» is set on most of the catalog (716 of 1000): the shelf keeps to what children really eat with pleasure.
const KID_FOOD = /сырник|блин|олад|панкейк|омлет|каш[аи]|запеканк|котлет|тефтел|фрикадел|наггетс|пюре|макарон|спагетти|лапш|вермишел|пельмен|вареник|ленив|пицц|бутерброд|гренк|тост|сосиск|кекс|маффин|печенье|пирожк|шарлотк|творож|йогурт|смузи|какао|кисел|морс|компот|драник|зраз|суп с фрикадельк|куриный суп/i;
const NOT_KID_FOOD = /печен[ьи](?![еь])|сердеч|желуд|язык|почк|остр|по-корейски|кимчи/i;

/** Themes for Главная, in order; `when` keeps some to their season. */
export const THEMES: Theme[] = [
  { key: "romantic", emoji: "🕯️", title: "Романтический ужин", hint: "Ужин для двоих", test: (r) => occasion("date")(r) || (ROMANTIC.test(r.title) && course("main", "dessert")(r) && r.difficulty !== "hard") },
  { key: "kids", emoji: "🧸", title: "Детям нравится", hint: "То, что едят с удовольствием", test: (r) => r.kids === true && r.difficulty !== "hard" && !r.tags.includes("spicy") && KID_FOOD.test(r.title) && !NOT_KID_FOOD.test(r.title) },
  { key: "guests", emoji: "🍽️", title: "Для гостей", hint: "Горячее, салаты и закуски к столу", test: (r) => occasion("guests")(r) && course("main", "salad", "snack", "baking")(r) },
  { key: "movie", emoji: "🎬", title: "Вечер кино", hint: "Закуски и то, что едят руками", test: (r) => MOVIE.test(r.title) || course("snack")(r) },
  { key: "sick", emoji: "🍵", title: "Когда приболел", hint: "Бульоны, супы и мягкая еда", when: (now) => !isWarmMonth(now), test: (r) => SICK.test(r.title) || (course("soup")(r) && r.mainIngredient === "chicken") },
  { key: "picnic", emoji: "🧺", title: "На пикник", hint: "Шашлык, бутерброды и то, что легко взять с собой", when: isWarmMonth, test: (r) => occasion("picnic")(r) || title(/шашлык|гриль|бутерброд|сэндвич|пирож/i)(r) },
  { key: "lenten", emoji: "🥦", title: "Постное", hint: "Без мяса, молока и яиц", test: (r) => isLenten(r) && course("main", "soup", "salad")(r) },
];

/** A theme is shown only with at least this many fitting dishes. */
export const MIN_DISHES = 8;

/** The themes for today; during Великий пост «Постное» comes first. */
export function themesNow(now = new Date()): Theme[] {
  const list = THEMES.filter((t) => !t.when || t.when(now));
  return holidayCollection(now)?.key === "lent" ? [...list.filter((t) => t.key === "lenten"), ...list.filter((t) => t.key !== "lenten")] : list;
}

/** The cover drawn for a collection (collections/<key>.jpg on the site), with its version so a new one shows at once. */
export const coverUrl = (key: string, v: number): string => apiUrl("today").replace(/api\/index\.php.*$/, "") + "collections/" + key + ".jpg?v=" + v;

// ---------- The owner's changes from the admin panel ----------

/** Per collection: shown or not, its own title and line, recipes added or taken out by hand, the cover's version.
 * `custom`: a collection the owner made, only of hand-picked recipes. */
export interface Custom { on?: boolean; title?: string; hint?: string; emoji?: string; add?: string[]; remove?: string[]; custom?: boolean; cover?: number }
export type Customs = Record<string, Custom>;

const SAVED = "cook-collections";
const saved = (): Customs => { try { return JSON.parse(localStorage.getItem(SAVED) || "{}"); } catch { return {}; } };
let asked: Promise<Customs> | null = null;

/** Fetched once per start, kept for the next one (and for use without the internet). */
export function loadCustoms(): Promise<Customs> {
  asked ??= fetch(apiUrl("collections")).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j: { collections?: Customs }) => { const c = j.collections ?? {}; try { localStorage.setItem(SAVED, JSON.stringify(c)); } catch { /* private mode */ } return c; })
    .catch(() => saved());
  return asked;
}
export const savedCustoms = saved;

/** A collection with the owner's title and line, and its rule with the hand-picked changes; null when switched off. */
export function withCustom<T extends Collection>(c: T, x: Custom | undefined): T | null {
  if (!x) return c;
  if (x.on === false) return null;
  const add = new Set(x.add ?? []), remove = new Set(x.remove ?? []);
  return { ...c, title: x.title ?? c.title, hint: x.hint ?? c.hint, emoji: x.emoji ?? c.emoji, test: (r: Recipe) => add.has(r.id) || (!remove.has(r.id) && c.test(r)) };
}

/** The owner's own collections (only hand-picked recipes), after the built-in themes. */
export function customThemes(all: Customs): Theme[] {
  return Object.entries(all).filter(([, x]) => x.custom && x.on !== false && x.title).map(([key, x]) => {
    const ids = new Set(x.add ?? []);
    return { key, title: x.title!, hint: x.hint ?? "", emoji: x.emoji ?? "🍽️", test: (r: Recipe) => ids.has(r.id) };
  });
}
