// The week plan into the phone's own calendar: an .ics file with one event per dish, at the time to start cooking
// (so it is done by the meal) and a reminder 15 minutes before. Opens in any calendar app; nothing is sent anywhere.
import { recipeById, type MenuDay } from "../engine";

const MEAL_AT = { breakfast: 8 * 60, lunch: 13 * 60, dinner: 19 * 60 } as const;
const pad = (n: number) => String(n).padStart(2, "0");
const esc = (s: string) => s.replace(/[\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
const stamp = (d: Date) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";

export function planIcs(days: MenuDay[], siteUrl: string): string {
  const now = new Date();
  const ev: string[] = [];
  for (const d of days) d.items.forEach((it, n) => {
    const r = recipeById(it.recipeId);
    if (!r) return;
    const [y, m, day] = d.date.split("-").map(Number);
    const meal = MEAL_AT[it.meal ?? "dinner"];
    const minutes = it.leftover ? 15 : Math.min(Math.max(r.totalMinutes, 15), 240);
    const start = new Date(y, m - 1, day, 0, meal - minutes);
    const end = new Date(y, m - 1, day, 0, meal);
    ev.push("BEGIN:VEVENT", "UID:" + d.date + "-" + n + "-" + r.id + "@what-to-cook", "DTSTAMP:" + stamp(now), "DTSTART:" + stamp(start), "DTEND:" + stamp(end),
      "SUMMARY:" + esc((it.leftover ? "Разогреть: " : "Приготовить: ") + r.title),
      "DESCRIPTION:" + esc("Рецепт: " + siteUrl + "#/r/" + r.id),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc("Пора начинать: " + r.title), "TRIGGER:-PT15M", "END:VALARM", "END:VEVENT");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Что приготовить?//RU", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
}

export function downloadIcs(text: string, name = "plan.ics"): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
