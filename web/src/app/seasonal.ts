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

/** The holiday that is near — about two weeks before it — or a church time; null when there is none (no shelf then). */
export function holidayCollection(now = new Date()): Collection | null {
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const today = new Date(y, m - 1, d);
  const toEaster = days(orthodoxEaster(y), today);
  const until = (mm: number, dd: number) => days(new Date(y, mm - 1, dd), today);
  const near = (mm: number, dd: number, before = 14) => { const n = until(mm, dd); return n >= 0 && n <= before; };
  if (m === 12) return { key: "newyear", emoji: "🎄", title: "К Новому году", hint: "Салаты, горячее и закуски к столу", test: (r) => occasion("new-year")(r) || title(/оливье|шуб|холодец|заливн/i)(r) };
  // After the holiday: something light and simple, soups and porridge, and ideas for what is left.
  if (m === 1 && d <= 8) return { key: "afterny", emoji: "🥣", title: "После праздника", hint: "Лёгкое, супы и что сделать с остатками", test: (r) => !occasion("new-year")(r) && r.difficulty !== "hard" && (r.tags.includes("light") || course("soup", "breakfast")(r) || title(/омлет|каш[аи]|запеканк|овощ/i)(r)) };
  if (toEaster >= 49 && toEaster <= 55) return { key: "maslenitsa", emoji: "🥞", title: "Масленица", hint: "Блины, оладьи и всё к ним", test: (r) => occasion("maslenitsa")(r) || title(/блин|олад|сырник|панкейк/i)(r) };
  if (toEaster >= 0 && toEaster <= 7) return { key: "easter", emoji: "🥚", title: "К Пасхе", hint: "Выпечка и праздничный стол", test: (r) => occasion("easter")(r) || course("baking", "dessert")(r) || title(/кулич|пасх|творож/i)(r) };
  if (near(2, 23, 11)) return { key: "feb23", emoji: "🎖️", title: "К 23 февраля", hint: "Сытное горячее и закуски", test: (r) => (occasion("holiday", "guests")(r) || r.tags.includes("hearty")) && course("main", "snack")(r) };
  if (near(3, 8, 10)) return { key: "mar8", emoji: "💐", title: "К 8 Марта", hint: "Нежные салаты, десерты и ужин для двоих", test: (r) => occasion("date")(r) || (occasion("holiday", "guests")(r) && course("salad", "dessert", "baking")(r)) };
  if (toEaster >= 1 && toEaster <= 48) return { key: "lent", emoji: "🌿", title: "Великий пост", hint: "Постные блюда на каждый день", test: (r) => isLenten(r) && course("main", "soup", "salad")(r) };
  if ((m === 4 && d >= 26) || (m === 5 && d <= 10)) return { key: "may", emoji: "🔥", title: "Майские: на природу", hint: "Шашлык, гриль и всё для пикника", test: (r) => occasion("picnic")(r) || title(/шашлык|гриль|мангал|кебаб|люля/i)(r) };
  if (near(10, 31)) return { key: "halloween", emoji: "🎃", title: "К Хеллоуину", hint: "Тыквенное и для детского праздника", test: (r) => occasion("kids-party")(r) || title(/тыкв/i)(r) };
  return null;
}

/** The time of year: always one. */
export function seasonCollection(now = new Date()): Collection {
  const m = now.getMonth() + 1;
  if (m >= 6 && m <= 8) return { key: "summer", emoji: "☀️", title: "Летнее", hint: "Окрошка, холодные супы и салаты", test: title(/окрошк|холодник|гаспачо|свекольник|салат|огур|кабач/i) };
  if (m >= 9 && m <= 11) return { key: "autumn", emoji: "🍂", title: "Осеннее", hint: "Тыква, грибы и яблоки", test: title(/тыкв|гриб|шампиньон|яблок|шарлотк/i) };
  if (m >= 3 && m <= 5) return { key: "spring", emoji: "🌱", title: "Весеннее", hint: "Зелень, щавель, редис и молодые овощи", test: (r) => r.tags.includes("fresh") || title(/щавел|зелен|редис|молод|шпинат|огур|салат/i)(r) };
  return { key: "winter", emoji: "❄️", title: "Согревающее", hint: "Супы, рагу и всё горячее", test: (r) => course("soup")(r) || title(/рагу|жарк|туш/i)(r) };
}

export interface Theme extends Collection { when?: (now: Date) => boolean }

const MOVIE = /пицц|начос|крыл|гренк|чипс|попкорн|бургер|хот-?дог|шаурм|наггетс|кесадиль|сэндвич|бутерброд|тако/i;
const ROMANTIC = /лосос|форел|стейк|ризотто|паст[аы](?![а-яё])|креветк|утк|фондан|тирамису|панна|медальон/i;
const SICK = /бульон|куриный суп|суп с курицей|кисел|морс|каш[аи]|овсян/i;
const isWarmMonth = (now: Date) => { const m = now.getMonth() + 1; return m >= 5 && m <= 8; };

/** Themes for Главная, in order; `when` keeps some to their season. */
export const THEMES: Theme[] = [
  { key: "romantic", emoji: "🕯️", title: "Романтический ужин", hint: "Ужин для двоих", test: (r) => occasion("date")(r) || (ROMANTIC.test(r.title) && course("main", "dessert")(r) && r.difficulty !== "hard") },
  { key: "kids", emoji: "🧸", title: "Детям нравится", hint: "То, что едят с удовольствием", test: (r) => r.kids === true },
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

/** The cover drawn for a collection (collections/<key>.jpg on the site); the card falls back to a dish photo without it. */
export const coverUrl = (key: string): string => apiUrl("today").replace(/api\/index\.php.*$/, "") + "collections/" + key + ".jpg";
