// «Рецепты → Фото»: the recipes without a photo one at a time — copy the prompt, make the picture in an image
// generator, copy it there and press Ctrl+V here (or drop / choose a file): it goes up as JPEG and the next recipe
// opens. The ones people open most go first. The prompt is the same as on the recipe's own page (the older panel).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildCatalog, matchesDish, recipes, useCatalog, type Recipe } from "../engine";
import { get, post, upload } from "./api";
import { BTN, BTN_OUTLINE, BTN_SM } from "./ui";

interface CatalogAnswer { files: { name: string; data?: unknown; error?: string }[]; hidden: string[]; photos: Record<string, number> }
type Order = "popular" | "new" | "abc";

// ---------- The prompt (as the older panel writes it) ----------
const STYLE = "Ракурс сверху под углом 45 градусов, блюдо в центре кадра, вокруг немного свободного места. Мягкий дневной свет из окна слева, лёгкие естественные тени. Матовая керамическая посуда молочного цвета, светлый деревянный стол, льняная салфетка песочного цвета, рядом 1–2 сырых продукта из рецепта. Тёплые естественные цвета, небольшая глубина резкости, задний план слегка размыт. Обычная домашняя порция, как готовят дома, без ресторанной подачи. Без людей, рук, текста, надписей и логотипов. Горизонтальный кадр 4:3.";
export const NEGATIVE = "текст, надписи, водяной знак, логотип, руки, люди, несколько разных блюд, мультяшный стиль, 3D-рендер, иллюстрация, пластиковый глянец, пересвет, тёмный фон, ресторанная подача, лишний гарнир, искажённые столовые приборы";
const PLAIN = /^(вода|соль|сахар|сахарн|растительн|подсолнечн|оливков|рафинирован|черн\S* перец|чёрн\S* перец|молот|перец молот|сода|разрыхлител|уксус|лимонн\S* сок|соев\S* соус|лавров|специ|приправ|ваниль|желатин|дрожж|крахмал|бульонн)/i;
const product = (name: string) => name.toLowerCase().replace(/ё/g, "е")
  .replace(/\s*(без жидкости|с варкой до \d+ минут|быстрого приготовления|для варки|в собственном соку|10–20%|10-20%|\d+([.,]\d+)?%)\s*/g, " ")
  .replace(/^((уже приготовленн|консервированн|замороженн|свеж|охлажденн)\S*\s+|сыр(ая|ой|ое|ые|ую)\s+)+/, "")
  .replace(/\s+(без кости|для варки|для жарки)\b.*$/, "").replace(/\s+/g, " ").trim();
function seen(r: Recipe, max = 5): string[] {
  const out: string[] = [];
  for (const i of r.ingredients) {
    if (i.optional || PLAIN.test(i.name.trim())) continue;
    const p = product(i.name);
    if (p && !out.includes(p)) out.push(p);
    if (out.length >= max) break;
  }
  return out;
}
function serving(r: Recipe): string {
  const is = (k: string) => matchesDish(r, "dish:" + k);
  return is("soup") ? "суп налит в глубокую широкую тарелку, рядом ложка и ломтик хлеба"
    : is("salad") ? "салат в неглубокой широкой миске"
    : is("pancakes") || is("syrniki") ? "стопкой на плоской тарелке, рядом маленькая пиалка со сметаной"
    : is("porridge") ? "каша в небольшой глубокой миске"
    : is("baking") ? "выпечка целиком на деревянной доске, один кусок отрезан и лежит рядом"
    : is("omelette") ? "на плоской тарелке, рядом вилка"
    : "на плоской тарелке, порция для одного человека, рядом вилка";
}
export function recipePrompt(r: Recipe): string {
  const items = seen(r);
  return "Реалистичная фотография домашнего блюда: «" + r.title + "»."
    + (items.length ? " В блюде видно: " + items.join(", ") + "." : "")
    + (r.tags.includes("vegetarian") ? " Блюдо без мяса и рыбы." : "")
    + (r.look ? " Как выглядит: " + r.look.replace(/[.\s]+$/, "") + "." : " Подача: " + serving(r) + ".")
    + " " + STYLE;
}

// ---------- Any picture → JPEG the server takes (up to 1600 px wide) ----------
async function toJpeg(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / bmp.width, 1600 / bmp.height);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const out = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.9));
  if (!out) throw new Error("Картинка не читается — попробуйте другой файл");
  return out;
}
function imageOf(list: DataTransferItemList | FileList | null | undefined): File | null {
  if (!list) return null;
  for (const it of Array.from(list as ArrayLike<DataTransferItem | File>)) {
    const f = it instanceof File ? it : it.kind === "file" ? it.getAsFile() : null;
    if (f && f.type.startsWith("image/")) return f;
  }
  return null;
}

export function Photos() {
  const [photos, setPhotos] = useState<Record<string, number> | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [opens, setOpens] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<Order>("popular");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [last, setLast] = useState<{ id: string; title: string; url: string } | null>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get<CatalogAnswer>("catalog").then((cat) => {
      useCatalog(buildCatalog(cat.files));
      setHidden(new Set(cat.hidden ?? []));
      setPhotos(cat.photos ?? {});
    }).catch((e) => setMsg({ err: "Каталог не загрузился: " + (e as Error).message }));
    get<{ opens: Record<string, number> }>("admin.photo.queue").then((j) => setOpens(j.opens ?? {}), () => {});
  }, []);

  const all = useMemo(() => (photos ? recipes().filter((r) => !hidden.has(r.id)) : []), [photos, hidden]);
  const queue = useMemo(() => {
    if (!photos) return [];
    const list = all.map((r, i) => ({ r, i })).filter(({ r }) => !photos[r.id]);
    list.sort((a, b) => order === "abc" ? a.r.title.localeCompare(b.r.title, "ru")
      : order === "new" ? b.i - a.i
      : (opens[b.r.id] ?? 0) - (opens[a.r.id] ?? 0) || a.i - b.i);
    // «Пропустить» moves a recipe to the end, not away.
    const later = new Set(skipped);
    return [...list.filter((x) => !later.has(x.r.id)), ...skipped.map((id) => list.find((x) => x.r.id === id)).filter((x): x is { r: Recipe; i: number } => !!x)].map((x) => x.r);
  }, [all, photos, order, opens, skipped]);
  const cur = queue[0] ?? null;
  const prompt = cur ? recipePrompt(cur) : "";
  const dayStart = new Date().setHours(0, 0, 0, 0) / 1000;
  const today = photos ? Object.values(photos).filter((v) => v >= dayStart).length : 0;
  const withPhoto = all.length - queue.length;

  const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => setMsg({ ok: what + " скопирован" }), () => setMsg({ err: "Не получилось скопировать — выделите текст вручную" }));

  const send = useCallback(async (file: File | Blob | null) => {
    if (!file || !cur || busy) return;
    setBusy(true); setMsg({});
    try {
      const jpeg = await toJpeg(file);
      const form = new FormData(); form.append("recipeId", cur.id); form.append("photo", jpeg, cur.id + ".jpg");
      const j = await upload<{ saved: boolean; version: number }>("admin.photo.upload", form);
      setPhotos((p) => ({ ...(p ?? {}), [cur.id]: j.version }));
      setSkipped((s) => s.filter((id) => id !== cur.id));
      setLast({ id: cur.id, title: cur.title, url: URL.createObjectURL(jpeg) });
      setMsg({ ok: "Фото сохранено — следующий рецепт" });
    } catch (e) {
      setMsg({ err: (e as Error).message || "Фото не загрузилось" });
    } finally { setBusy(false); }
  }, [cur, busy]);

  // Ctrl+V anywhere on the tab (not inside a text field).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const f = imageOf(e.clipboardData?.items);
      if (f) { e.preventDefault(); void send(f); }
      else if (e.clipboardData?.types.includes("text/plain")) setMsg({ err: "В буфере текст, а не картинка: скопируйте саму картинку (правой кнопкой → «Копировать изображение»)" });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [send]);

  const undo = () => {
    if (!last) return;
    post("admin.photo.delete", { recipeId: last.id }).then(() => {
      setPhotos((p) => { const n = { ...(p ?? {}) }; delete n[last.id]; return n; });
      setMsg({ ok: "Фото «" + last.title + "» удалено — рецепт снова в очереди" }); setLast(null);
    }, (e) => setMsg({ err: (e as Error).message }));
  };

  if (!photos) return <div className="adm-card"><p className="adm-muted">{msg.err ?? "Загружаю каталог…"}</p></div>;
  return (
    <div className="adm-card">
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div><b>Без фото: {queue.length} из {all.length}</b>{today > 0 && <span className="adm-muted"> · сегодня добавлено {today}</span>}</div>
        <label className="adm-muted">Сначала:{" "}
          <select value={order} onChange={(e) => setOrder(e.target.value as Order)} style={{ height: 32, borderRadius: 8, border: "1px solid #d8d0c4", padding: "0 6px" }}>
            <option value="popular">те, что чаще открывают</option><option value="new">новые</option><option value="abc">по алфавиту</option>
          </select>
        </label>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: "#efe7da", overflow: "hidden", margin: "8px 0 4px" }}>
        <div style={{ height: "100%", width: (all.length ? Math.round((withPhoto / all.length) * 100) : 0) + "%", background: "#3f7a4f" }} />
      </div>

      {!cur ? <p style={{ fontSize: 18, marginTop: 20 }}>🎉 У всех рецептов есть фото.</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, marginTop: 14 }}>
          <div>
            <div className="adm-muted" style={{ fontSize: 13 }}>{opens[cur.id] ? "Открывали " + opens[cur.id] + " раз за месяц" : "За месяц не открывали"}</div>
            <h2 style={{ fontSize: 22, margin: "2px 0 8px" }}>{cur.title}</h2>
            <p style={{ background: "#f5f0e7", borderRadius: 10, padding: "12px 14px", fontSize: 14, lineHeight: 1.55, margin: "0 0 10px" }}>{prompt}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className={BTN} onClick={() => void copy(prompt, "Промпт")}>Скопировать промпт</button>
              <button className={BTN_OUTLINE} onClick={() => void copy(NEGATIVE, "Список «чего не должно быть»")}>«Чего не должно быть»</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button className={BTN_SM} onClick={() => { setSkipped((s) => [...s.filter((id) => id !== cur.id), cur.id]); setMsg({}); }}>Пропустить</button>
              <a className={BTN_SM} href={"../#/r/" + encodeURIComponent(cur.id)} target="_blank" rel="noreferrer">Открыть рецепт ↗</a>
            </div>
          </div>
          <div
            role="button" tabIndex={0} aria-label="Вставить или выбрать картинку"
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInput.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); void send(imageOf(e.dataTransfer.files) ?? imageOf(e.dataTransfer.items)); }}
            style={{ border: "2px dashed " + (over ? "#B7432F" : "#d3c4ae"), background: over ? "#fbefe9" : "#fffdf9", borderRadius: 14, minHeight: 250, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8, padding: 18, cursor: "pointer", color: "#6b6560" }}>
            {busy ? <b style={{ color: "#211D1A", fontSize: 17 }}>Загружаю…</b> : <>
              <div style={{ fontSize: 34 }} aria-hidden>🖼️</div>
              <b style={{ color: "#211D1A", fontSize: 17 }}>Вставьте картинку сюда</b>
              <span>Скопируйте картинку в нейросети и нажмите <kbd>Ctrl</kbd> + <kbd>V</kbd><br />— или перетащите файл, или нажмите, чтобы выбрать</span>
              <span style={{ fontSize: 13 }}>Сразу загрузится и откроется следующий рецепт</span>
            </>}
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { void send(imageOf(e.target.files)); e.target.value = ""; }} />
          </div>
        </div>
      )}

      {(msg.ok || msg.err) && <p className={msg.err ? "cx-err" : "cx-saved"} style={{ margin: "12px 0 0" }}>{msg.err ?? "✓ " + msg.ok}</p>}
      {last && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, padding: 8, border: "1px solid #eee7dc", borderRadius: 10 }}>
          <img src={last.url} alt="" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6 }} />
          <span style={{ flex: 1, fontSize: 14 }}>Только что: <b>{last.title}</b></span>
          <button className={BTN_SM} onClick={undo}>Не то фото — удалить</button>
        </div>
      )}
      {cur && queue.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 14, overflow: "hidden", flexWrap: "wrap" }}>
          <span className="adm-muted" style={{ fontSize: 13, alignSelf: "center" }}>Дальше:</span>
          {queue.slice(1, 6).map((r) => <span key={r.id} style={{ border: "1px solid #eee7dc", borderRadius: 9, padding: "4px 10px", fontSize: 13, color: "#6b6560", background: "#fff" }}>{r.title}</span>)}
          {queue.length > 6 && <span className="adm-muted" style={{ fontSize: 13, alignSelf: "center" }}>…ещё {queue.length - 6}</span>}
        </div>
      )}
    </div>
  );
}
