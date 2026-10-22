// «Статистика → Что ищут»: what people looked for and did not find — typed in «Поиск» or asked of Шеф — with how
// many people and how many recipes the catalog has for it NOW (so a dish added since shows as done). What to add
// next by what is asked, not by guess. «Шеф не понял» is apart: those are phrasings to teach, not recipes to add.
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_STATE, buildCatalog, searchRecipes, useCatalog } from "../engine";
import { navigatorAnswer } from "../app/navigator";
import { DEFAULT_PROFILE } from "../app/profile";
import { readQuery } from "../app/searchWords";
import { get } from "./api";
import { BTN_SM } from "./ui";

// «борщ за 20 минут», «хочу с креветками»: the dish words alone, to see whether the catalog has it in some form.
const DISH_ONLY = /(^|\s)(\d+|за|до|минут\S*|мин|час\S*|хочу|хочется|можно|сделай|приготовь\S*|рецепт\S*|с|и|из|на|в|по|для|без)(?=\s|$)/g;
const dishWords = (text: string) => readQuery(text).text.toLowerCase().replace(DISH_ONLY, " ").replace(/\s+/g, " ").trim();
type Have = { exact: number; near: number };

type Row = { text: string; n: number; people: number; last: number; search: number; chat: number; unclear: boolean };
interface CatalogAnswer { files: { name: string; data?: unknown; error?: string }[]; hidden: string[] }

const when = (ms: number) => {
  const d = new Date(ms), day = new Date().setHours(0, 0, 0, 0);
  return ms >= day ? "сегодня" : ms >= day - 864e5 ? "вчера" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};
const TD = { padding: "8px 10px 8px 0", borderTop: "1px solid #eee7dc", verticalAlign: "top" } as const;
const TH = { padding: "4px 10px 6px 0", textAlign: "left", fontSize: 12, color: "#6b6560", fontWeight: 600 } as const;

export function Searches() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{ rows: Row[]; total: { search: number; chat: number } } | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    get<CatalogAnswer>("catalog").then((cat) => {
      const hidden = new Set(cat.hidden ?? []);
      useCatalog(buildCatalog(cat.files.map((f) => (f.data && typeof f.data === "object" ? { ...f, data: { ...(f.data as object), recipes: ((f.data as { recipes?: { id: string }[] }).recipes ?? []).filter((r) => !hidden.has(r.id)) } } : f))));
      setReady(true);
    }).catch((e) => setErr("Каталог не загрузился: " + (e as Error).message));
  }, []);
  useEffect(() => { setData(null); get<{ rows: Row[]; total: { search: number; chat: number } }>("admin.searches", { days }).then(setData, (e) => setErr((e as Error).message)); }, [days]);

  // How many recipes the catalog has for each query now.
  // Exactly as typed, else by the dish words alone («есть похожие»: the dish is there, not with those conditions).
  const now = useMemo(() => (ready && data ? new Map(data.rows.map((r): [string, Have] => {
    const exact = searchRecipes(r.text).length, w = dishWords(r.text);
    return [r.text, { exact, near: exact ? 0 : w ? searchRecipes(w).length : 0 }];
  })) : null), [ready, data]);
  // Requests about the service itself («сделай шрифт крупнее», «где мой план») are not dishes.
  const rows = (data?.rows ?? []).filter((r) => !navigatorAnswer(r.text, DEFAULT_STATE, DEFAULT_PROFILE));
  const missing = rows.filter((r) => !r.unclear);
  const unclear = rows.filter((r) => r.unclear);
  const stillMissing = missing.filter((r) => { const h = now?.get(r.text); return !!h && !h.exact && !h.near; });
  const copy = () => navigator.clipboard.writeText(stillMissing.map((r) => r.text).join("\n")).then(() => setMsg("Скопировано: " + stillMissing.length), () => setMsg("Не получилось скопировать"));

  const table = (rows: Row[], showNow: boolean) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 10 }}>
      <thead><tr><th style={TH}>Что искали</th><th style={TH}>Людей</th><th style={TH}>Раз</th><th style={TH}>Где</th><th style={TH}>Последний раз</th>{showNow && <th style={TH}>Сейчас в каталоге</th>}</tr></thead>
      <tbody>
        {rows.map((r) => {
          const have = now?.get(r.text) ?? null;
          const label = !have ? "…" : have.exact ? "уже есть: " + have.exact : have.near ? "есть похожие: " + have.near : "нет";
          const color = !have ? "#6b6560" : have.exact ? "#3f7a4f" : have.near ? "#a5641a" : "#B7432F";
          return (
            <tr key={r.text}>
              <td style={{ ...TD, fontWeight: 600 }}>{r.text}</td>
              <td style={TD}>{r.people}</td>
              <td style={TD}>{r.n}</td>
              <td style={{ ...TD, color: "#6b6560" }}>{[r.search ? "поиск" : "", r.chat ? "Шеф" : ""].filter(Boolean).join(", ")}</td>
              <td style={{ ...TD, color: "#6b6560" }}>{when(r.last)}</td>
              {showNow && <td style={{ ...TD, color, fontWeight: 600 }}>{label}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      <div className="adm-card">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>Что ищут и не находят</h2>
            <p className="adm-muted" style={{ margin: 0 }}>Запросы в поиске и Шефу, где не нашлось ни одного рецепта. Сверху — что искало больше всего людей. Запросы из поиска записываются с этого обновления.</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>{[7, 30, 90].map((d) => <button key={d} className={"cx-pill" + (days === d ? " on" : "")} onClick={() => setDays(d)}>{d} дней</button>)}</div>
        </div>
        {err && <p className="cx-err">{err}</p>}
        {!data ? <p className="adm-muted">Загружаю…</p> : <>
          <p className="adm-muted" style={{ margin: "10px 0 0" }}>
            За {days} дней: запросов в поиске — {data.total.search}, Шефу — {data.total.chat}. Не нашлось: {missing.length} разных{now ? ", из них до сих пор нет в каталоге — " + stillMissing.length : ""}.
          </p>
          {stillMissing.length > 0 && (
            <p style={{ margin: "8px 0 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className={BTN_SM} onClick={() => void copy()}>Скопировать то, чего нет ({stillMissing.length})</button>
              <span className="adm-muted" style={{ fontSize: 13 }}>— можно вставить в «Новые рецепты», чтобы нейросеть написала эти блюда.</span>
              {msg && <span className="cx-saved">{msg}</span>}
            </p>
          )}
          {missing.length === 0 ? <p className="adm-muted">За эти дни всё, что искали, нашлось.</p> : table(missing, true)}
        </>}
      </div>
      {data && unclear.length > 0 && (
        <div className="adm-card" style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 2 }}>Шеф не понял</h2>
          <p className="adm-muted" style={{ margin: 0 }}>Это не блюда, а фразы, которые Шеф не разобрал. Их можно научить в «Шеф → Обучение Шефа».</p>
          {table(unclear, false)}
        </div>
      )}
    </>
  );
}
