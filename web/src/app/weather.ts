// «Погода за окном» — only when the person turns it on in the profile. In the cold, soups and hearty, warm dishes come
// up a little higher; in the heat, light dishes, salads and cold soups. Only the chosen city is kept, on this device;
// the server is asked for the weather of a place rounded to ~25 km, at most once an hour.
import { useEffect, useState } from "react";
import { apiUrl, courseOf, type Recipe } from "../engine";
import { PERSONAL_EVENT } from "./personal";

export interface Place { name: string; area?: string; lat: number; lon: number }
export interface Weather { t: number; max: number; min: number; rain: boolean; snow: boolean; at: number }
export type Feel = "frost" | "cold" | "cool" | "mild" | "warm" | "hot";

const KEY = "cook-weather";
const NOW_KEY = "cook-weather-now";
const HOUR = 3600e3;
export const WEATHER_EVENT = "cook-weather";

function read<T>(key: string): T | null { try { return JSON.parse(localStorage.getItem(key) || "null") as T | null; } catch { return null; } }
function write(key: string, v: unknown) { try { if (v == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

/** The chosen place, or null when the weather is off. */
export const weatherPlace = (): Place | null => read<Place>(KEY);

export function setWeatherPlace(p: Place | null): void {
  write(KEY, p);
  write(NOW_KEY, null);
  current = null;
  notify();
  if (p) void refreshWeather();
}

let current: Weather | null = null;
let loading: Promise<void> | null = null;
function notify() { if (typeof window !== "undefined") { window.dispatchEvent(new Event(WEATHER_EVENT)); window.dispatchEvent(new Event(PERSONAL_EVENT)); } }

/** The weather known now (no request): null when off, not loaded yet or older than three hours. */
export function weatherNow(): Weather | null {
  if (!weatherPlace()) return null;
  current ??= read<Weather>(NOW_KEY);
  return current && Date.now() - current.at < 3 * HOUR ? current : null;
}

/** Asks the server when the weather is on and the last answer is older than an hour. Errors are quiet. */
export function refreshWeather(): Promise<void> {
  const p = weatherPlace();
  if (!p) return Promise.resolve();
  const have = weatherNow();
  if (have && Date.now() - have.at < HOUR) return Promise.resolve();
  loading ??= fetch(apiUrl("weather") + "&lat=" + p.lat.toFixed(2) + "&lon=" + p.lon.toFixed(2))
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || typeof j.t !== "number" || !weatherPlace()) return;
      current = { t: j.t, max: j.max, min: j.min, rain: !!j.rain, snow: !!j.snow, at: Date.now() };
      write(NOW_KEY, current);
      notify();
    })
    .catch(() => undefined)
    .finally(() => { loading = null; });
  return loading;
}

export function useWeather(): Weather | null {
  const [w, setW] = useState(weatherNow);
  useEffect(() => {
    const on = () => setW(weatherNow());
    window.addEventListener(WEATHER_EVENT, on);
    void refreshWeather();
    return () => window.removeEventListener(WEATHER_EVENT, on);
  }, []);
  return w;
}

/** The chosen place, following changes made anywhere in the app. */
export function usePlace(): Place | null {
  const [p, setP] = useState(weatherPlace);
  useEffect(() => { const on = () => setP(weatherPlace()); window.addEventListener(WEATHER_EVENT, on); return () => window.removeEventListener(WEATHER_EVENT, on); }, []);
  return p;
}

/** How the day feels, by the warmest hour ahead (a cold morning before a warm day is still a warm day). */
export function feel(w: Weather): Feel {
  const t = w.max;
  return t <= -5 ? "frost" : t <= 5 ? "cold" : t <= 13 ? "cool" : t <= 22 ? "mild" : t <= 27 ? "warm" : "hot";
}

const COLD_SOUP = /окрошк|гаспачо|свекольник|холодник|ботвин/i;
export const isColdSoup = (r: Recipe): boolean => courseOf(r) === "soup" && (COLD_SOUP.test(r.title) || r.id.startsWith("cold-"));

/** The weather's small push for a dish (0 when the weather is off or mild). */
export function weatherScore(r: Recipe, w: Weather | null): number {
  if (!w) return 0;
  const f = feel(w);
  const course = courseOf(r);
  const tags = r.tags;
  let s = 0;
  if (f === "frost" || f === "cold") {
    if (course === "soup" && !isColdSoup(r)) s += 0.6;
    if (tags.includes("hearty") || tags.includes("cozy")) s += 0.4;
    if (isColdSoup(r)) s -= 1;
    else if (course === "salad") s -= 0.3;
  } else if (f === "cool") {
    if (course === "soup" && !isColdSoup(r)) s += 0.3;
    if (tags.includes("cozy")) s += 0.2;
    if (isColdSoup(r)) s -= 0.6;
  } else if (f === "warm" || f === "hot") {
    const k = f === "hot" ? 1 : 0.6;
    if (isColdSoup(r)) s += 0.9 * k;
    else if (course === "soup") s -= 0.3 * k;
    if (course === "salad" || tags.includes("light") || tags.includes("fresh")) s += 0.5 * k;
    if (tags.includes("hearty")) s -= 0.4 * k;
    if (r.totalMinutes > 90 && r.appliances.includes("oven")) s -= 0.3 * k;
  }
  if (w.rain || w.snow) { if (tags.includes("cozy") || courseOf(r) === "baking") s += 0.2; }
  return s;
}

/** A quiet line for the home screen: «За окном +3° — самое время для супа». Null when there is nothing to say. */
export function weatherLine(w: Weather | null): string | null {
  if (!w) return null;
  const deg = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(Math.round(n)) + "°";
  const f = feel(w);
  const now = "За окном " + deg(w.t);
  if (f === "frost") return now + " — согреет горячий суп или что-то сытное";
  if (f === "cold") return now + (w.snow ? ", снег" : w.rain ? ", дождь" : "") + " — день для горячего супа";
  if (f === "cool") return w.rain ? now + ", дождь — хорошо бы что-то уютное" : now + " — подойдёт суп или горячее";
  if (f === "hot") return now + " — в жару лучше лёгкое и холодное";
  if (f === "warm") return now + " — хорошо пойдёт салат или окрошка";
  return w.rain ? now + ", дождь — день для чего-то уютного" : null;
}
