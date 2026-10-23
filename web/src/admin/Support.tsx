// «Продвижение → Поддержка автора»: everything on the page /avtor — the photo, the texts, the button's link to CloudTips,
// VK and Telegram, and the people who supported with their sums (the page shows the biggest first). One «Сохранить»
// for all; the photo is saved at once.
import { useEffect, useRef, useState } from "react";
import { get, post, upload } from "./api";
import { BTN, BTN_OUTLINE, BTN_SM, INPUT } from "./ui";

interface Person { id: string; nick: string; amount: number; date: string }
interface Support {
  title: string; sub: string; text: string; button: string; url: string; buttonNote: string; goals: string;
  vk: string; tg: string; listNote: string; showAmounts: boolean; showGoals: boolean; people: Person[];
}
interface State { support: Support; photo: string | null; page: string }

const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const money = (n: number) => n.toLocaleString("ru-RU") + " ₽";
const byAmount = (l: Person[]) => [...l].sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
// The admin lives at /admin/: the page and the photo are one folder up.
const up = (p: string) => "../" + p;

export function SupportPage() {
  const [s, setS] = useState<Support | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [page, setPage] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ nick: "", amount: "", date: today() });
  const file = useRef<HTMLInputElement>(null);
  const take = (j: State) => { setS({ ...j.support, people: byAmount(j.support.people) }); setPhoto(j.photo); setPage(j.page); };
  useEffect(() => { get<State>("admin.support").then(take, (e) => setMsg({ err: (e as Error).message })); }, []);
  if (!s) return <div className="adm-card">{msg.err ? <p className="cx-err">{msg.err}</p> : <p className="adm-muted">Загружаю…</p>}</div>;

  const set = <K extends keyof Support>(k: K, v: Support[K]) => { setS({ ...s, [k]: v }); setMsg({}); };
  const save = async () => {
    setBusy(true); setMsg({});
    try { take(await post<State>("admin.support.save", { support: s })); setMsg({ ok: "Сохранено — уже на сайте" }); }
    catch (e) { setMsg({ err: (e as Error).message }); } finally { setBusy(false); }
  };
  const sendPhoto = async (f: File) => {
    setMsg({});
    try { const form = new FormData(); form.append("photo", f); take(await upload<State>("admin.support.photo", form)); setMsg({ ok: "Фото загружено" }); }
    catch (e) { setMsg({ err: (e as Error).message }); } finally { if (file.current) file.current.value = ""; }
  };
  const dropPhoto = async () => {
    try { take(await post<State>("admin.support.photo.delete", {})); setMsg({ ok: "Фото убрано" }); } catch (e) { setMsg({ err: (e as Error).message }); }
  };
  const addPerson = () => {
    const nick = add.nick.trim();
    if (!nick) return;
    const p: Person = { id: Math.random().toString(36).slice(2, 10), nick, amount: Math.max(0, Math.round(Number(add.amount.replace(",", ".")) || 0)), date: add.date || today() };
    set("people", byAmount([...s.people, p]));
    setAdd({ nick: "", amount: "", date: add.date });
  };
  const edit = (id: string, patch: Partial<Person>) => set("people", s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const total = s.people.reduce((n, p) => n + p.amount, 0);
  const field = (label: string, k: "title" | "sub" | "button" | "url" | "buttonNote" | "vk" | "tg" | "listNote", placeholder = "") => (
    <label style={{ display: "block", marginTop: 12 }}><span className="cx-label">{label}</span>
      <input className={INPUT} value={s[k]} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} /></label>
  );
  const box = { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", alignItems: "start", marginTop: 16 } as const;

  return (
    <div className="adm-card">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Поддержка автора</h2>
          <p className="adm-muted" style={{ margin: 0 }}>Страница shefly.ru/avtor. Изменения видны на сайте сразу после «Сохранить». В приложении из RuStore этой страницы нет.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className={BTN_OUTLINE} href={up(page)} target="_blank" rel="noopener">Открыть страницу ↗</a>
          <button className={BTN} disabled={busy} onClick={() => void save()}>{busy ? "Сохраняю…" : "Сохранить"}</button>
        </div>
      </div>
      {(msg.ok || msg.err) && <p className={msg.ok ? "cx-saved" : "cx-err"} style={{ margin: "10px 0 0" }}>{msg.ok ? "✓ " + msg.ok : msg.err}</p>}

      <div style={box}>
        <section style={{ border: "1px solid #eee7dc", borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Страница</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "#f6e2d6", display: "grid", placeItems: "center", fontSize: 28, flex: "none" }}>
              {photo ? <img src={up(photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🧑‍🍳"}
            </div>
            <button className={BTN_OUTLINE} onClick={() => file.current?.click()}>{photo ? "Заменить фото" : "Загрузить фото"}</button>
            {photo && <button className={BTN_SM} onClick={() => void dropPhoto()}>Убрать</button>}
            <span className="adm-muted" style={{ fontSize: 12 }}>обрежется до квадрата</span>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendPhoto(f); }} />
          </div>
          {field("Заголовок", "title")}
          {field("Строка под заголовком", "sub")}
          <label style={{ display: "block", marginTop: 12 }}><span className="cx-label">Текст · абзацы через пустую строку, первый абзац крупнее</span>
            <textarea className={INPUT} style={{ height: 260, paddingTop: 8, lineHeight: 1.45 }} value={s.text} onChange={(e) => set("text", e.target.value)} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10 }}>
            {field("Текст кнопки", "button")}
            {field("Ссылка кнопки", "url", "https://pay.cloudtips.ru/p/…")}
          </div>
          {field("Строка под кнопкой", "buttonNote")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {field("ВКонтакте", "vk", "https://vk.com/…")}
            {field("Telegram", "tg", "https://t.me/…")}
          </div>
          <p className="adm-muted" style={{ fontSize: 12, margin: "4px 0 0" }}>Пустая ссылка — кнопки на странице не будет.</p>
          <label style={{ display: "block", marginTop: 12 }}><span className="cx-label">На что пойдёт поддержка · одна строка — один пункт: «🖥 Заголовок — пояснение»</span>
            <textarea className={INPUT} style={{ height: 96, paddingTop: 8 }} value={s.goals} onChange={(e) => set("goals", e.target.value)} /></label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 14 }}><input type="checkbox" checked={s.showGoals} onChange={(e) => set("showGoals", e.target.checked)} />Показывать блок «На что пойдёт поддержка»</label>
        </section>

        <section style={{ border: "1px solid #eee7dc", borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Поддержали · {s.people.length} · {money(total)}</h3>
          <p className="adm-muted" style={{ fontSize: 12, margin: "4px 0 10px" }}>На странице — от самой большой суммы к меньшей.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr 1fr auto", gap: 6, alignItems: "center" }}>
            <input className={INPUT} placeholder="Ник" value={add.nick} onChange={(e) => setAdd({ ...add, nick: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") addPerson(); }} />
            <input className={INPUT} placeholder="Сумма, ₽" inputMode="numeric" value={add.amount} onChange={(e) => setAdd({ ...add, amount: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") addPerson(); }} />
            <input className={INPUT} type="date" value={add.date} onChange={(e) => setAdd({ ...add, date: e.target.value })} />
            <button className={BTN} disabled={!add.nick.trim()} onClick={addPerson} aria-label="Добавить">+</button>
          </div>
          {s.people.length === 0 ? <p className="adm-muted" style={{ marginTop: 12 }}>Пока никого. Добавьте ник и сумму — и нажмите «Сохранить».</p> : (
            <div style={{ marginTop: 10 }}>
              {s.people.map((p) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr 1fr auto", gap: 6, alignItems: "center", padding: "5px 0", borderTop: "1px solid #f0ebe3" }}>
                  <input className={INPUT} value={p.nick} onChange={(e) => edit(p.id, { nick: e.target.value })} aria-label="Ник" />
                  <input className={INPUT} inputMode="numeric" value={String(p.amount)} onChange={(e) => edit(p.id, { amount: Math.max(0, Math.round(Number(e.target.value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0)) })} aria-label="Сумма" />
                  <input className={INPUT} type="date" value={p.date} onChange={(e) => edit(p.id, { date: e.target.value })} aria-label="Дата" />
                  <button className={BTN_SM} onClick={() => set("people", s.people.filter((x) => x.id !== p.id))} aria-label={"Убрать " + p.nick}>✕</button>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 14 }}><input type="checkbox" checked={s.showAmounts} onChange={(e) => set("showAmounts", e.target.checked)} />Показывать суммы на странице</label>
          {field("Строка под списком", "listNote")}
        </section>
      </div>
    </div>
  );
}
