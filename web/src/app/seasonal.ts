// Collections for the time of year and church holidays (what the audience lives by): Новый год, Масленица,
// Великий пост, Пасха, summer, autumn, winter.
import { courseOf, isLenten, type Recipe } from "../engine";

/** Orthodox Easter (Gregorian date) for a year. */
export function orthodoxEaster(year: number): Date {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return new Date(year, month - 1, day + 13); // Julian → Gregorian (1900–2099)
}

export interface Collection { key: string; title: string; hint: string; test: (r: Recipe) => boolean }

const days = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 864e5);
const title = (re: RegExp) => (r: Recipe) => re.test(r.title);

export function seasonalCollection(now = new Date()): Collection | null {
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const easter = orthodoxEaster(y);
  const toEaster = days(easter, new Date(y, m - 1, d));
  if (toEaster >= 49 && toEaster <= 55) return { key: "maslenitsa", title: "Масленица", hint: "Блины, оладьи и всё к ним", test: title(/блин|олад|сырник|панкейк/i) };
  if (toEaster >= 1 && toEaster <= 48) return { key: "lent", title: "Великий пост", hint: "Постные блюда на каждый день", test: (r) => isLenten(r) && ["main", "soup", "salad"].includes(courseOf(r)) };
  if (toEaster >= -7 && toEaster <= 0) return { key: "easter", title: "К Пасхе", hint: "Выпечка и праздничный стол", test: (r) => ["baking", "dessert"].includes(courseOf(r)) || title(/кулич|пасх|творож/i)(r) };
  if ((m === 12 && d >= 10) || (m === 1 && d <= 10)) return { key: "newyear", title: "К Новому году", hint: "Салаты, горячее и закуски к столу", test: (r) => r.occasions?.includes("guests") || title(/оливье|шуб|холодец|салат|запеч/i)(r) };
  if (m >= 6 && m <= 8) return { key: "summer", title: "Летнее", hint: "Окрошка, холодные супы и салаты", test: (r) => title(/окрошк|холодник|гаспачо|свекольник|салат|огур|кабач/i)(r) };
  if (m >= 9 && m <= 11) return { key: "autumn", title: "Осеннее", hint: "Тыква, грибы и яблоки", test: title(/тыкв|гриб|шампиньон|яблок|шарлотк/i) };
  if (m <= 2 || m === 12) return { key: "winter", title: "Согревающее", hint: "Супы, рагу и всё горячее", test: (r) => courseOf(r) === "soup" || title(/рагу|жарк|туш/i)(r) };
  return null;
}
