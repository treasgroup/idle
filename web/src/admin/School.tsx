// «Рецепты → Школа»: pictures for the cards of Школа готовки. Each card shows what it has now (a drawn scheme, an
// icon or an uploaded picture), a prompt to copy into an image generator and the upload — as with collection covers.
// Pictures are cut to 3:2 on the server (school/<lesson>-<card>.jpg) and show in the app and on the lesson pages.
import { useEffect, useRef, useState } from "react";
import { LESSONS, SECTIONS, type Lesson } from "../screens/learn-data";
import { get, post, upload } from "./api";
import { schoolPrompt } from "./prompts";
import { BTN, BTN_OUTLINE, BTN_SM } from "./ui";

type Images = Record<string, number>;
const img = (key: string, v: number) => "../school/" + key + ".jpg?v=" + v;

export function School() {
  const [images, setImages] = useState<Images>({});
  const [open, setOpen] = useState<string | null>(LESSONS[0].id);
  const [err, setErr] = useState("");
  useEffect(() => { get<{ images: Images }>("school.images").then((j) => setImages(j.images ?? {}), (e) => setErr((e as Error).message)); }, []);
  const cards = LESSONS.reduce((n, l) => n + l.cards.length, 0);
  const done = Object.keys(images).length;
  return (
    <div className="adm-card">
      <h2 style={{ marginBottom: 2 }}>Картинки для Школы готовки</h2>
      <p className="adm-muted" style={{ margin: 0 }}>У каждой карточки урока — промт для нейросети и загрузка. Картинка сама обрежется до 3:2. Без картинки карточка показывает нарисованную схему или крупную иконку — урок работает и так.</p>
      <p style={{ margin: "10px 0 0", fontSize: 15 }}>Загружено <b>{done}</b> из {cards} {cards % 10 === 1 && cards % 100 !== 11 ? "карточки" : "карточек"}.</p>
      {err && <p className="cx-err">{err}</p>}
      {SECTIONS.filter((s) => s.id === "basics" || s.id === "technique" || s.id === "products").map((s) => (
        <div key={s.id} className="cx-section">
          <h3 style={{ margin: "0 0 8px" }}>{s.label}</h3>
          {LESSONS.filter((l) => l.section === s.id).map((l) => {
            const have = l.cards.filter((_, n) => images[l.id + "-" + n]).length;
            return (
              <details key={l.id} open={open === l.id} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) setOpen(l.id); }} style={{ marginBottom: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 15 }}><b>{l.title}</b> <span className="adm-muted">· картинок {have} из {l.cards.length}</span></summary>
                <div style={{ display: "grid", gap: 16, marginTop: 10 }}>
                  {l.cards.map((_, n) => <CardSlot key={n} lesson={l} n={n} version={images[l.id + "-" + n]} onImages={setImages} />)}
                </div>
              </details>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CardSlot({ lesson, n, version, onImages }: { lesson: Lesson; n: number; version?: number; onImages: (i: Images) => void }) {
  const c = lesson.cards[n];
  const key = lesson.id + "-" + n;
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const prompt = schoolPrompt(lesson.title, c.title, c.text);
  const now = version ? "своя картинка" : c.art ? "сейчас нарисованная схема" : "сейчас иконка";
  const send = async (f: File) => {
    setBusy(true); setMsg({});
    try {
      const form = new FormData(); form.append("key", key); form.append("image", f);
      const j = await upload<{ images: Images }>("admin.school.image", form);
      onImages(j.images ?? {}); setMsg({ ok: "Загружено" });
    } catch (e) { setMsg({ err: (e as Error).message }); } finally { setBusy(false); if (file.current) file.current.value = ""; }
  };
  const drop = async () => {
    try { const j = await post<{ images: Images }>("admin.school.image.delete", { key }); onImages(j.images ?? {}); setMsg({ ok: "Убрано" }); }
    catch (e) { setMsg({ err: (e as Error).message }); }
  };
  return (
    <div className="cx-cover">
      {version ? <img className="cx-cover-img cx-cover-wide" src={img(key, version)} alt="" /> : <div className="cx-cover-img cx-cover-wide" style={{ fontSize: 14, color: "#8a8178", textAlign: "center", padding: 8 }}>{c.art ? "схема" : "иконка"}</div>}
      <div>
        <span className="cx-label">{n + 1}. {c.title} · {now}</span>
        <textarea className="cx-prompt" readOnly value={prompt} onFocus={(ev) => ev.currentTarget.select()} />
        <div className="cx-row">
          <button className={BTN_OUTLINE} onClick={() => void navigator.clipboard.writeText(prompt).then(() => setMsg({ ok: "Промт скопирован" }), () => setMsg({ err: "Не получилось скопировать — выделите текст и нажмите Ctrl+C" }))}>Скопировать промт</button>
          <button className={BTN} disabled={busy} onClick={() => file.current?.click()}>{busy ? "Загружаю…" : version ? "Заменить" : "Загрузить"}</button>
          {version && <button className={BTN_SM} onClick={() => void drop()}>Убрать</button>}
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void send(f); }} />
        </div>
        <p className="adm-muted" style={{ marginTop: 8, marginBottom: 0 }}>JPEG, PNG или WebP до 12 МБ, обрежется до 3:2.{msg.ok && <span className="cx-saved"> ✓ {msg.ok}</span>}{msg.err && <span className="cx-err"> {msg.err}</span>}</p>
      </div>
    </div>
  );
}
