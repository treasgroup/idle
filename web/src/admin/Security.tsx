// «Настройки → Безопасность»: where the admin is logged in now and every login attempt of the last 90 days (right
// or wrong password), with the address half hidden. «Выйти на всех других устройствах» closes every login but this one.
// Another login never closes yours: a sudden «войдите снова» means the 7 days ran out or the browser forgot it.
import { useCallback, useEffect, useState } from "react";
import { get, post } from "./api";
import { BTN } from "./ui";

type Session = { current: boolean; at: number; until: number; ip: string; ua: string };
type Login = { at: number; ip: string; ua: string; ok: boolean };

/** «Chrome · Windows» from the browser's own description; «неизвестно» for scripts and empty ones. */
export function device(ua: string): string {
  const browser = /YaBrowser/.test(ua) ? "Яндекс Браузер" : /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return [browser, os].filter(Boolean).join(" · ") || "неизвестно";
}
function when(ms: number): string {
  const d = new Date(ms), today = new Date();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ms >= day) return "сегодня, " + time;
  if (ms >= day - 864e5) return "вчера, " + time;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + ", " + time;
}
const dateOnly = (ms: number) => new Date(ms).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

/** Wrong passwords in a row from one address and device come as one line «неверный пароль ×3». */
function grouped(list: Login[]): (Login & { n: number })[] {
  const out: (Login & { n: number })[] = [];
  for (const l of list) {
    const last = out[out.length - 1];
    if (last && !l.ok && !last.ok && last.ip === l.ip && last.ua === l.ua) last.n++;
    else out.push({ ...l, n: 1 });
  }
  return out;
}

const TD = { padding: "9px 10px 9px 0", borderTop: "1px solid #eee7dc", verticalAlign: "middle" } as const;
const TH = { padding: "4px 10px 6px 0", textAlign: "left", fontSize: 12, color: "#6b6560", fontWeight: 600 } as const;

export function Security() {
  const [data, setData] = useState<{ sessions: Session[]; logins: Login[] } | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => get<{ sessions: Session[]; logins: Login[] }>("admin.security").then(setData, (e) => setErr((e as Error).message)), []);
  useEffect(() => { void load(); }, [load]);
  const others = (data?.sessions ?? []).filter((s) => !s.current).length;
  const closeOthers = () => {
    if (!confirm("Выйти из админки на всех других устройствах? Здесь вход останется.")) return;
    post<{ closed: number }>("admin.logout.others", {}).then((j) => { setMsg(j.closed ? "Готово: закрыто входов — " + j.closed : "Других входов не было"); void load(); }, (e) => setErr((e as Error).message));
  };
  const wrong = (data?.logins ?? []).filter((l) => !l.ok && l.at > Date.now() - 7 * 864e5).length;
  return (
    <>
      <div className="adm-card">
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>Где вы сейчас вошли</h2>
            <p className="adm-muted" style={{ margin: 0 }}>Вход действует 7 дней. Чужой вход вас не выкидывает — у каждого свой.</p>
          </div>
          <button className={BTN} disabled={!others} onClick={closeOthers}>Выйти на всех других устройствах</button>
        </div>
        {msg && <p className="cx-saved" style={{ margin: "10px 0 0" }}>{msg}</p>}
        {err && <p className="cx-err">{err}</p>}
        {!data ? <p className="adm-muted">Загружаю…</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 12 }}>
            <thead><tr><th style={TH}>Устройство</th><th style={TH}>Адрес</th><th style={TH}>Вошли</th><th style={TH}>Действует до</th></tr></thead>
            <tbody>
              {data.sessions.map((s, i) => (
                <tr key={i}>
                  <td style={TD}>{s.ua ? device(s.ua) : "вход до обновления"}{s.current && <span style={{ marginLeft: 8, background: "#e6f1e8", color: "#3f7a4f", borderRadius: 999, padding: "1px 8px", fontSize: 12, fontWeight: 600 }}>это вы</span>}</td>
                  <td style={TD}>{s.ip}</td>
                  <td style={TD}>{when(s.at)}</td>
                  <td style={TD}>{dateOnly(s.until)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="adm-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 2 }}>Попытки входа</h2>
        <p className="adm-muted" style={{ margin: 0 }}>
          За 90 дней, с верным и неверным паролем. Записываются с обновления админки, где появилась эта вкладка.
          {wrong > 0 && <b style={{ color: "#B7432F" }}> Неверных паролей за неделю: {wrong}.</b>}
        </p>
        {data && (data.logins.length === 0 ? <p className="adm-muted">Пока ни одной записи.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 12 }}>
            <thead><tr><th style={TH}>Когда</th><th style={TH}>Устройство</th><th style={TH}>Адрес</th><th style={TH}>Итог</th></tr></thead>
            <tbody>
              {grouped(data.logins).map((l, i) => (
                <tr key={i}>
                  <td style={TD}>{when(l.at)}</td>
                  <td style={TD}>{device(l.ua)}</td>
                  <td style={TD}>{l.ip}</td>
                  <td style={{ ...TD, color: l.ok ? undefined : "#B7432F", fontWeight: l.ok ? 400 : 600 }}>{l.ok ? "вошли" : "неверный пароль" + (l.n > 1 ? " ×" + l.n : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </>
  );
}
