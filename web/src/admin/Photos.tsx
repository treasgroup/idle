// «Рецепты → Фото»: the recipes without a photo in numbered batches of 5–10 — copy each prompt into its own chat of
// an image generator; when a picture is ready, copy it, click the card with the same number and press Ctrl+V (or drop
// a file on the card): it goes up as JPEG and Ctrl+V moves on to the next empty card. The ones people open most go first. The prompt is the same as on the recipe's own page (the older panel).
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

type Busy = Record<string, boolean>;

export function Photos() {
  const [photos, setPhotos] = useState<Record<string, number> | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [opens, setOpens] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<Order>("popular");
  const [size, setSize] = useState(10);
  // The batch on screen: fixed ids, so the cards keep their numbers (card 3 ↔ chat 3) while photos come in.
  const [batch, setBatch] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [copied, setCopied] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Busy>({});
  const [local, setLocal] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [over, setOver] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickFor = useRef<string | null>(null);

  useEffect(() => {
    get<CatalogAnswer>("catalog").then((cat) => {
      useCatalog(buildCatalog(cat.files));
      setHidden(new Set(cat.hidden ?? []));
      setPhotos(cat.photos ?? {});
    }).catch((e) => setMsg({ err: "Каталог не загрузился: " + (e as Error).message }));
    get<{ opens: Record<string, number> }>("admin.photo.queue").then((j) => setOpens(j.opens ?? {}), () => {});
  }, []);

  const all = useMemo(() => (photos ? recipes().filter((r) => !hidden.has(r.id)) : []), [photos, hidden]);
  const byId = useMemo(() => new Map(all.map((r) => [r.id, r])), [all]);
  const queue = useMemo(() => {
    if (!photos) return [];
    const list = all.map((r, i) => ({ r, i })).filter(({ r }) => !photos[r.id]);
    list.sort((a, b) => order === "abc" ? a.r.title.localeCompare(b.r.title, "ru")
      : order === "new" ? b.i - a.i
      : (opens[b.r.id] ?? 0) - (opens[a.r.id] ?? 0) || a.i - b.i);
    return list.map((x) => x.r);
  }, [all, photos, order, opens]);

  // A new batch: the next recipes of the queue that are not on screen yet.
  const nextBatch = useCallback((n = size, skip: string[] = []) => {
    const out = queue.filter((r) => !skip.includes(r.id)).slice(0, n).map((r) => r.id);
    setBatch(out); setActive(out[0] ?? null); setCopied(new Set()); setLocal({}); setMsg({});
  }, [queue, size]);
  // The first batch once the catalog is here, and a new one when the order or size changes.
  const ready = !!photos && all.length > 0;
  useEffect(() => { if (ready) nextBatch(); }, [ready, order, size, Object.keys(opens).length]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = batch.map((id) => byId.get(id)).filter((r): r is Recipe => !!r);
  const done = cards.filter((r) => photos?.[r.id]).length;
  const dayStart = new Date().setHours(0, 0, 0, 0) / 1000;
  const today = photos ? Object.values(photos).filter((v) => v >= dayStart).length : 0;
  const withPhoto = all.length - queue.length;

  const copy = (r: Recipe) => navigator.clipboard.writeText(recipePrompt(r)).then(
    () => { setCopied((s) => new Set(s).add(r.id)); setActive((a) => a ?? r.id); setMsg({ ok: "Промпт №" + (batch.indexOf(r.id) + 1) + " скопирован" }); },
    () => setMsg({ err: "Не получилось скопировать — выделите текст вручную" }));

  const send = useCallback(async (id: string | null, file: File | Blob | null) => {
    if (!file || !id || busy[id]) return;
    const r = byId.get(id);
    if (!r) return;
    setBusy((b) => ({ ...b, [id]: true })); setMsg({});
    try {
      const jpeg = await toJpeg(file);
      const form = new FormData(); form.append("recipeId", id); form.append("photo", jpeg, id + ".jpg");
      const j = await upload<{ saved: boolean; version: number }>("admin.photo.upload", form);
      setPhotos((p) => ({ ...(p ?? {}), [id]: j.version }));
      setLocal((l) => ({ ...l, [id]: URL.createObjectURL(jpeg) }));
      setMsg({ ok: "№" + (batch.indexOf(id) + 1) + " «" + r.title + "» — фото сохранено" });
      // The next card of the batch still without a photo becomes the one Ctrl+V goes to.
      const k = batch.indexOf(id);
      const next = [...batch.slice(k + 1), ...batch.slice(0, k)].find((x) => x !== id && !photos?.[x]);
      setActive(next ?? null);
    } catch (e) {
      setMsg({ err: "№" + (batch.indexOf(id) + 1) + ": " + ((e as Error).message || "фото не загрузилось") });
    } finally { setBusy((b) => ({ ...b, [id]: false })); }
  }, [busy, byId, batch, photos]);

  // Ctrl+V anywhere on the tab goes to the chosen card (not inside a text field).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const f = imageOf(e.clipboardData?.items);
      if (!f) { if (e.clipboardData?.types.includes("text/plain")) setMsg({ err: "В буфере текст, а не картинка: скопируйте саму картинку (правой кнопкой → «Копировать изображение»)" }); return; }
      e.preventDefault();
      if (!active) { setMsg({ err: "Сначала нажмите на карточку рецепта, к которому эта картинка" }); return; }
      void send(active, f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [send, active]);

  const remove = (r: Recipe) => {
    post("admin.photo.delete", { recipeId: r.id }).then(() => {
      setPhotos((p) => { const n = { ...(p ?? {}) }; delete n[r.id]; return n; });
      setLocal((l) => { const n = { ...l }; delete n[r.id]; return n; });
      setActive(r.id); setMsg({ ok: "Фото «" + r.title + "» удалено — вставьте другое" });
    }, (e) => setMsg({ err: (e as Error).message }));
  };
  const swap = (r: Recipe) => {
    // «Пропустить»: this card takes the next recipe of the queue that is not on screen.
    const fresh = queue.find((q) => !batch.includes(q.id));
    setBatch((b) => b.map((x) => (x === r.id ? fresh?.id : x)).filter((x): x is string => !!x));
    if (active === r.id) setActive(fresh?.id ?? null);
  };

  if (!photos) return <div className="adm-card"><p className="adm-muted">{msg.err ?? "Загружаю каталог…"}</p></div>;
  return (
    <div className="adm-card">
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div><b>Без фото: {queue.length} из {all.length}</b>{today > 0 && <span className="adm-muted"> · сегодня добавлено {today}</span>}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label className="adm-muted">По{" "}
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ height: 32, borderRadius: 8, border: "1px solid #d8d0c4", padding: "0 6px" }}>
              {[1, 3, 5, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="adm-muted">Сначала:{" "}
            <select value={order} onChange={(e) => setOrder(e.target.value as Order)} style={{ height: 32, borderRadius: 8, border: "1px solid #d8d0c4", padding: "0 6px" }}>
              <option value="popular">те, что чаще открывают</option><option value="new">новые</option><option value="abc">по алфавиту</option>
            </select>
          </label>
        </div>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: "#efe7da", overflow: "hidden", margin: "8px 0 4px" }}>
        <div style={{ height: "100%", width: (all.length ? Math.round((withPhoto / all.length) * 100) : 0) + "%", background: "#3f7a4f" }} />
      </div>
      <p className="adm-muted" style={{ margin: "8px 0 0", fontSize: 14 }}>
        Скопируйте промпты по номерам в разные чаты. Когда картинка готова — скопируйте её, нажмите на карточку с тем же номером и <kbd>Ctrl</kbd> + <kbd>V</kbd> (или перетащите файл на карточку).
        {" "}<button className={BTN_SM} onClick={() => void navigator.clipboard.writeText(NEGATIVE).then(() => setMsg({ ok: "«Чего не должно быть» скопировано" }))}>«Чего не должно быть»</button>
      </p>

      {(msg.ok || msg.err) && <p className={msg.err ? "cx-err" : "cx-saved"} style={{ margin: "10px 0 0" }}>{msg.err ?? "✓ " + msg.ok}</p>}

      {!queue.length && !cards.length ? <p style={{ fontSize: 18, marginTop: 20 }}>🎉 У всех рецептов есть фото.</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
          {cards.map((r, i) => {
            const has = !!photos[r.id], on = active === r.id && !has, up = !!busy[r.id];
            const src = local[r.id] ?? (has ? "../photos/" + r.id + ".jpg?v=" + photos[r.id] : "");
            return (
              <div key={r.id}
                onClick={() => !has && setActive(r.id)}
                onDragOver={(e) => { e.preventDefault(); setOver(r.id); }}
                onDragLeave={() => setOver((o) => (o === r.id ? null : o))}
                onDrop={(e) => { e.preventDefault(); setOver(null); void send(r.id, imageOf(e.dataTransfer.files) ?? imageOf(e.dataTransfer.items)); }}
                style={{ border: "2px solid " + (over === r.id || on ? "#B7432F" : has ? "#bcd8c2" : "#eee7dc"), background: on ? "#fbefe9" : has ? "#f3f8f4" : "#fff", borderRadius: 12, padding: 10, cursor: has ? "default" : "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ flex: "none", width: 26, height: 26, borderRadius: 999, background: has ? "#3f7a4f" : "#211D1A", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>{has ? "✓" : i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 14, lineHeight: 1.3, display: "block" }}>{r.title}</b>
                    <span className="adm-muted" style={{ fontSize: 12 }}>{opens[r.id] ? "открывали " + opens[r.id] + " раз за месяц" : "за месяц не открывали"}</span>
                  </div>
                </div>
                <div style={{ aspectRatio: "4 / 3", borderRadius: 8, overflow: "hidden", background: "#f5f0e7", display: "grid", placeItems: "center", textAlign: "center", color: "#6b6560", fontSize: 13, padding: src ? 0 : 8 }}>
                  {up ? <b style={{ color: "#211D1A" }}>Загружаю…</b>
                    : src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : on ? <span><b style={{ color: "#B7432F" }}>Ctrl + V</b><br />вставит картинку сюда</span>
                    : <span>Нажмите, чтобы вставить сюда,<br />или перетащите файл</span>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                  {has ? <button className={BTN_SM} onClick={() => remove(r)}>Не то — удалить</button> : <>
                    <button className={copied.has(r.id) ? BTN_SM : BTN + " h-8 px-3"} onClick={() => void copy(r)}>{copied.has(r.id) ? "✓ Промпт" : "Промпт"}</button>
                    <button className={BTN_SM} title="Выбрать файл на компьютере" onClick={() => { pickFor.current = r.id; fileInput.current?.click(); }}>Файл</button>
                    <button className={BTN_SM} title="Заменить другим рецептом из очереди" onClick={() => swap(r)}>Пропустить</button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { void send(pickFor.current, imageOf(e.target.files)); e.target.value = ""; }} />

      {cards.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <button className={done === cards.length ? BTN : BTN_OUTLINE} onClick={() => nextBatch(size, batch)}>Следующие {size}</button>
          <span className="adm-muted" style={{ fontSize: 14 }}>В этой пачке готово {done} из {cards.length}{done < cards.length ? " — остальные останутся в очереди" : ""}</span>
        </div>
      )}
    </div>
  );
}
