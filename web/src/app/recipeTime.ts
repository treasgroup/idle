// A recipe's time said honestly: «40 мин + ждать сутки» instead of «25 ч» for a dish that needs 40 minutes of work and
// a night in the fridge (dough rising, marinating, a cake soaking). Short for cards, longer for the recipe page.
import { formatMinutes, type Recipe } from "../engine";

const waitOf = (r: Recipe) => r.totalMinutes - r.activeMinutes;
/** Most of the time is waiting (an hour or more, and longer than the work itself). */
export const hasWait = (r: Recipe): boolean => r.activeMinutes > 0 && waitOf(r) >= 60 && waitOf(r) >= r.activeMinutes;

function waitWords(min: number): string {
  if (min < 90) return formatMinutes(min);
  if (min < 18 * 60) return Math.round(min / 60) + " ч";
  if (min < 36 * 60) return "сутки";
  return Math.round(min / 1440) + " сут.";
}

/** Cards and lists: «40 мин + ждать 5 ч» or just «25 мин». */
export const timeShort = (r: Recipe): string => (hasWait(r) ? formatMinutes(r.activeMinutes) + " + ждать " + waitWords(waitOf(r)) : formatMinutes(r.totalMinutes));
/** The recipe page: «40 мин у плиты, потом ждать 5 ч». */
export const timeLong = (r: Recipe): string => (hasWait(r) ? formatMinutes(r.activeMinutes) + " у плиты, потом ждать " + waitWords(waitOf(r)) : formatMinutes(r.totalMinutes));
