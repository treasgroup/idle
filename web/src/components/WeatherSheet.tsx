// «Погода за окном» in the profile: off until the person picks a city (or, on the site, «где я сейчас»).
import { useEffect, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { apiUrl, isNativeApp } from "../engine";
import { useStore } from "../app/store";
import { setWeatherPlace, usePlace, useWeather, type Place } from "../app/weather";
import { Sheet } from "./ui";

export const degrees = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(Math.round(n)) + "°";

export function WeatherSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast, online } = useStore();
  const place = usePlace();
  const w = useWeather();
  const [q, setQ] = useState("");
  const [list, setList] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) { setList([]); return; }
    let on = true;
    const t = window.setTimeout(() => {
      fetch(apiUrl("weather.city") + "&q=" + encodeURIComponent(text))
        .then((r) => (r.ok ? r.json() : { list: [] }))
        .then((j) => { if (on) setList(Array.isArray(j.list) ? j.list : []); })
        .catch(() => on && setList([]));
    }, 350);
    return () => { on = false; window.clearTimeout(t); };
  }, [q]);

  const pick = (p: Place) => { setWeatherPlace(p); setQ(""); setList([]); toast("Буду учитывать погоду: " + p.name); };
  const here = () => {
    if (!navigator.geolocation) return toast("Браузер не умеет определять место — впишите город.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBusy(false); pick({ name: "Где я сейчас", lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2) }); },
      () => { setBusy(false); toast("Не получилось определить место — впишите город."); },
      { maximumAge: 3600e3, timeout: 10000 },
    );
  };

  return (
    <Sheet open={open} title="Погода за окном" onClose={onClose}
      footer={place ? <button className="btn-ghost w-full" onClick={() => { setWeatherPlace(null); toast("Погоду больше не учитываю"); }}>Не учитывать погоду</button> : undefined}>
      <p className="text-body-sm text-ink-soft">Когда холодно — чаще предложу супы и сытное, в жару — лёгкое, салаты и окрошку. Нужен только город: он хранится на этом устройстве.</p>
      {place && (
        <div className="mt-4 flex items-center gap-3 rounded-card border border-herb/40 bg-herb-soft px-4 py-3">
          <MapPin size={20} className="shrink-0 text-ink-soft" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold">{place.name}</span>
            <span className="block truncate text-caption text-ink-soft">{w ? "Сейчас " + degrees(w.t) + (w.max !== w.t ? ", днём до " + degrees(w.max) : "") : place.area || "Узнаю погоду…"}</span>
          </span>
        </div>
      )}
      <label className="mt-5 grid gap-1.5">
        <span className="text-body-sm font-semibold">{place ? "Другой город" : "Ваш город"}</span>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Например, Тула" autoComplete="address-level2" enterKeyHint="search" />
      </label>
      {!online && q.trim().length >= 2 && <p className="mt-2 text-caption text-ink-soft">Нет интернета — города найдутся, когда связь появится.</p>}
      {list.length > 0 && (
        <div className="mt-2 grid overflow-hidden rounded-card border border-line bg-card divide-y divide-line" role="list">
          {list.map((p) => (
            <button key={p.lat + "," + p.lon} role="listitem" className="flex min-h-[52px] flex-col justify-center px-4 py-2 text-left hover:bg-sunken/60" onClick={() => pick(p)}>
              <span className="text-body-sm font-semibold">{p.name}</span>
              {p.area && <span className="text-caption text-ink-soft">{p.area}</span>}
            </button>
          ))}
        </div>
      )}
      {!isNativeApp() && (
        <button className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-body-sm hover:border-line-strong disabled:opacity-60" onClick={here} disabled={busy}>
          <LocateFixed size={18} className="text-ink-soft" aria-hidden />{busy ? "Определяю…" : "Определить, где я"}
        </button>
      )}
      <p className="mt-5 text-caption text-ink-faint">Прогноз: MET Norway</p>
    </Sheet>
  );
}
