// Where the app can be had: the stores it is in, by phone. Google Play and App Store come with one line each here
// when the app is there (Профиль → «Приложение на телефон» shows what fits the phone).

export type Platform = "android" | "ios" | "desktop";
export interface Store { id: string; title: string; hint: string; url: string; on: Platform[] }

export const RUSTORE_URL = "https://apps.rustore.ru/app/su.treas.cook";

export const STORES: Store[] = [
  { id: "rustore", title: "Скачать в RuStore", hint: "Приложение для Android: таймеры со звуком при выключенном экране, рецепты без интернета", url: RUSTORE_URL, on: ["android", "desktop"] },
  // { id: "gplay", title: "Скачать в Google Play", hint: "Приложение для Android", url: "https://play.google.com/store/apps/details?id=su.treas.cook", on: ["android", "desktop"] },
  // { id: "appstore", title: "Скачать в App Store", hint: "Приложение для iPhone", url: "https://apps.apple.com/app/id…", on: ["ios", "desktop"] },
];

export function platform(): Platform {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  // iPadOS asks as a Mac: a touch screen tells them apart.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}
