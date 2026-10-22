// «Статистика → Откуда открывают»: which places of the service people open recipes from — the big card on Главная,
// «На сегодня», a holiday or season shelf, a collection, «Выбрать за меня», Шеф, search… (app/openFrom.ts sends the
// place with each «open»). For decisions about Главная by numbers, not by taste.
import { useEffect, useState } from "react";
import { get } from "./api";

type Row = { source: string; opens: number; people: number };

const NAMES: Record<string, string> = {
  hero: "Главная · большая карточка (рецепт дня / по плану)",
  today: "Главная · «На сегодня»",
  holiday: "Главная · праздничная полка",
  season: "Главная · сезонная полка или карточка",
  collections: "Главная · подборки",
  pick: "Главная · «Выбрать за меня»",
  recent: "Главная · «Недавно смотрели» / «Сохранённое»",
  home: "Главная · другое",
  chat: "Шеф (чат)",
  recipes: "Поиск и каталог",
  favorites: "Избранное",
  menu: "План на неделю",
  shopping: "Покупки",
  pantry: "Мои продукты",
  learn: "Школа готовки",
  profile: "Профиль",
  cook: "Готовка",
  dinner: "Ужин к сроку",
  "-": "Место не известно (открыто до счётчика или по ссылке)",
};

export function Opens() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setRows(null); get<{ rows: Row[] }>("admin.opens", { days }).then((j) => setRows(j.rows), (e) => setErr((e as Error).message)); }, [days]);
  const total = (rows ?? []).reduce((n, r) => n + r.opens, 0);
  const top = Math.max(1, ...(rows ?? []).map((r) => r.opens));
  return (
    <div className="adm-card">
      <h2 style={{ marginBottom: 2 }}>Откуда открывают рецепты</h2>
      <p className="adm-muted" style={{ margin: 0 }}>Сколько раз рецепты открывали из каждого места сервиса и сколько разных людей. Считается с обновления 22 октября; что открыто раньше — в строке «Место не известно».</p>
      <div style={{ display: "flex", gap: 6, margin: "12px 0" }}>
        {[7, 30, 90].map((d) => <button key={d} className={"cx-pill" + (days === d ? " on" : "")} onClick={() => setDays(d)}>{d} дней</button>)}
      </div>
      {err && <p className="cx-err">{err}</p>}
      {!rows ? <p className="adm-muted">Загружаю…</p> : rows.length === 0 ? <p className="adm-muted">За эти дни рецепты не открывали.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr style={{ textAlign: "left", color: "#6b6560" }}><th style={{ padding: "6px 0" }}>Место</th><th style={{ width: "34%" }} /><th style={{ textAlign: "right" }}>Открытий</th><th style={{ textAlign: "right", paddingLeft: 12 }}>Людей</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} style={{ borderTop: "1px solid #eee7dc" }}>
                <td style={{ padding: "8px 8px 8px 0" }}>{NAMES[r.source] ?? r.source}</td>
                <td><div style={{ height: 8, borderRadius: 4, background: "#B7432F", width: Math.max(2, Math.round((r.opens / top) * 100)) + "%" }} /></td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.opens} <span className="adm-muted">· {Math.round((r.opens / total) * 100)}%</span></td>
                <td style={{ textAlign: "right", paddingLeft: 12, fontVariantNumeric: "tabular-nums" }}>{r.people}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
