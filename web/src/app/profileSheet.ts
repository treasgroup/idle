// A sheet of Профиль opened from elsewhere: «Ограничения» in Шеф's answer («…изменить можно в «Профиле» → «Под меня»
// → «Ограничения»») goes straight to the «не ем» list. Kept until Профиль is on screen to take it.
import { replace, routeHash } from "./router";

export type ProfileSheet = "limits";
export const OPEN_PROFILE_SHEET = "cook-open-profile-sheet";
let pending: ProfileSheet | null = null;

export function openProfileSheet(sheet: ProfileSheet): void {
  pending = sheet;
  replace(routeHash({ tab: "profile" }));
  // Профиль already on screen hears it at once; otherwise it takes it when it appears.
  window.dispatchEvent(new CustomEvent(OPEN_PROFILE_SHEET, { detail: sheet }));
}
export function takeProfileSheet(): ProfileSheet | null {
  const s = pending;
  pending = null;
  return s;
}
