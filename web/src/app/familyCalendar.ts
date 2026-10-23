// «Семейный календарь»: birthdays and the family's own dates, kept on the device only (in the profile). Three days
// before, the Home shelf and the reminder offer to lay the table («Праздничный стол»); on the day it says so.

export type DateKind = "birthday" | "anniversary" | "other";
export interface FamilyDate { id: string; kind: DateKind; who: string; day: number; month: number; year?: number }

export const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const KIND_ICON: Record<DateKind, string> = { birthday: "🎂", anniversary: "💍", other: "⭐" };
/** How many days ahead the Home shelf and the reminder start to speak of a date. */
export const AHEAD = 3;

const DAY = 864e5;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The next time the date comes, today included. 29 February is kept on the 28th in other years. */
export function nextDate(d: Pick<FamilyDate, "day" | "month">, now = new Date()): Date {
  const today = midnight(now);
  const at = (y: number) => {
    const last = new Date(y, d.month, 0).getDate();
    return new Date(y, d.month - 1, Math.min(d.day, last));
  };
  const thisYear = at(today.getFullYear());
  return thisYear >= today ? thisYear : at(today.getFullYear() + 1);
}
export const daysUntil = (d: Pick<FamilyDate, "day" | "month">, now = new Date()) => Math.round((nextDate(d, now).getTime() - midnight(now).getTime()) / DAY);
/** «60 лет» on the coming date, when the year is known. */
export function turning(d: FamilyDate, now = new Date()): number | null {
  return d.year ? nextDate(d, now).getFullYear() - d.year : null;
}
export const years = (n: number) => n + " " + (n % 10 === 1 && n % 100 !== 11 ? "год" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "года" : "лет");
export const dayMonth = (d: Pick<FamilyDate, "day" | "month">) => d.day + " " + MONTHS[d.month - 1];
/** «Сегодня», «Завтра», «Через 3 дня». */
export function whenText(days: number): string {
  if (days === 0) return "Сегодня";
  if (days === 1) return "Завтра";
  return "Через " + days + " " + (days % 10 === 1 && days % 100 !== 11 ? "день" : days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 12 || days % 100 > 14) ? "дня" : "дней");
}

/** The family's dates by how soon they come. */
export const byNext = (list: FamilyDate[], now = new Date()) => [...list].sort((a, b) => daysUntil(a, now) - daysUntil(b, now));
/** Dates from today to `AHEAD` days on: what the Home shelf and the reminder speak of. */
export const comingSoon = (list: FamilyDate[], now = new Date()) => byNext(list, now).filter((d) => daysUntil(d, now) <= AHEAD);

// «Мама» → «мамы», «сын Миша» → «сына Миши»: whose birthday it is. Family words from a list, names by their ending;
// a word it cannot decline is left as written.
const GEN: Record<string, string> = {
  мама: "мамы", папа: "папы", мать: "матери", отец: "отца", бабушка: "бабушки", дедушка: "дедушки", баба: "бабы", деда: "деды",
  сын: "сына", дочь: "дочери", дочка: "дочки", сынок: "сынка", муж: "мужа", жена: "жены", брат: "брата", сестра: "сестры",
  внук: "внука", внучка: "внучки", тётя: "тёти", тетя: "тети", дядя: "дяди", тёща: "тёщи", теща: "тещи", тесть: "тестя",
  свекровь: "свекрови", свёкор: "свёкра", свекор: "свекра", племянник: "племянника", племянница: "племянницы", друг: "друга",
  подруга: "подруги", крёстная: "крёстной", крестная: "крестной", крёстный: "крёстного", крестный: "крестного",
  мой: "моего", моя: "моей", наш: "нашего", наша: "нашей", любимая: "любимой", любимый: "любимого", младший: "младшего",
  младшая: "младшей", старший: "старшего", старшая: "старшей",
};
function genWord(w: string): string {
  const low = w.toLowerCase();
  if (GEN[low]) return w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() ? GEN[low][0].toUpperCase() + GEN[low].slice(1) : GEN[low];
  // A name (with a capital letter): by its ending.
  if (!/^[А-ЯЁ][а-яё]+$/.test(w)) return w;
  if (/[гкхжшчщ]а$/.test(w)) return w.slice(0, -1) + "и";
  if (/а$/.test(w)) return w.slice(0, -1) + "ы";
  if (/я$/.test(w)) return w.slice(0, -1) + "и";
  if (/й$/.test(w)) return w.slice(0, -1) + "я";
  if (/ь$/.test(w)) return w.slice(0, -1) + "я";
  if (/[бвгджзклмнпрстфхцчшщ]$/.test(w)) return w + "а";
  return w;
}
export const genitive = (phrase: string) => phrase.trim().split(/\s+/).map(genWord).join(" ");

/** «день рождения мамы», «наша годовщина», «встреча выпускников» — what the reminder and the Home tile speak of. */
export function eventPhrase(d: FamilyDate): string {
  const who = d.who.trim();
  if (d.kind === "birthday") {
    // «Мама», «Сын Миша» → «мамы», «сына Миши»: a family word in lower case, a name as written.
    const g = genitive(who);
    return "день рождения " + (GEN[who.split(/\s+/)[0].toLowerCase()] ? g[0].toLowerCase() + g.slice(1) : g);
  }
  if (d.kind === "anniversary") return /годовщ/i.test(who) ? lowerFirst(who) : "годовщина: " + who;
  return lowerFirst(who);
}
/** Lower case only for a common word: «Наша годовщина» → «наша годовщина», but «Новый год» stays. */
const lowerFirst = (s: string) => (/^(Наш|Наша|Наше|Мой|Моя|Встреча|День|Годовщина|Праздник|Юбилей)(?![а-яё])/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/** «Через 3 дня день рождения мамы — собрать праздничный стол?» for the reminder of that day; null when nothing is near. */
export function reminderText(list: FamilyDate[], day: Date): string | null {
  const d = comingSoon(list, day).find((x) => daysUntil(x, day) === AHEAD || daysUntil(x, day) === 0);
  if (!d) return null;
  const n = daysUntil(d, day);
  return n === 0 ? "Сегодня " + eventPhrase(d) + " 🎉 Если ещё не решили, что готовить, — соберём праздничный стол."
    : whenText(n) + " " + eventPhrase(d) + " — собрать праздничный стол?";
}

/** The saved list, checked: anything malformed is dropped. */
export function normalizeDates(raw: unknown): FamilyDate[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((d): d is FamilyDate => !!d && typeof d === "object"
    && typeof (d as FamilyDate).id === "string" && typeof (d as FamilyDate).who === "string"
    && ["birthday", "anniversary", "other"].includes((d as FamilyDate).kind)
    && Number.isInteger((d as FamilyDate).day) && (d as FamilyDate).day >= 1 && (d as FamilyDate).day <= 31
    && Number.isInteger((d as FamilyDate).month) && (d as FamilyDate).month >= 1 && (d as FamilyDate).month <= 12)
    .slice(0, 40)
    .map((d) => ({ id: d.id.slice(0, 40), kind: d.kind, who: d.who.slice(0, 40), day: d.day, month: d.month, ...(Number.isInteger(d.year) && d.year! > 1900 && d.year! <= 2100 ? { year: d.year } : {}) }));
}
