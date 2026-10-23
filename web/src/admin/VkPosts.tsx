// «Продвижение → ВКонтакте → Готовые посты»: two kinds of post to put in the community by hand (VK does not let a
// site post by itself): «Меню на неделю» — 7 dinners by the week plan's rules, with the link «Взять это меню себе»
// (shefly.ru/?m=<code>, screens/TakeMenu) — and «Что приготовить из …» — 5 dishes with one product and the link
// to its page on the site (/iz/<product>). Each: the text to copy and one collage picture to download.
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MENU_PLAN, DEFAULT_STATE, buildCatalog, generateMenu, inSeason, isLenten, isUnusual, recipes, shortName, useCatalog,
  type MenuPlan, type Recipe,
} from "../engine";
import { timeShort } from "../app/recipeTime";
import { get, photo, post } from "./api";
import { BTN, BTN_OUTLINE } from "./ui";

interface CatalogAnswer { files: { name: string; data?: unknown; error?: string }[]; hidden: string[]; photos: Record<string, number> }

const site = () => new URL("../", location.href).href;
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const KINDS = [
  { id: "dinner", label: "Ужины" },
  { id: "quick", label: "Быстрые (до 40 мин)" },
  { id: "lenten", label: "Постные" },
] as const;
type Kind = (typeof KINDS)[number]["id"];

// «Что приготовить из тыквы»: the product in the genitive for the common ones; others get «Фасоль: что приготовить».
const OF: Record<string, string> = {
  pumpkin: "тыквы", cabbage: "капусты", apple: "яблок", mushroom: "грибов", beet: "свёклы", zucchini: "кабачков",
  eggplant: "баклажанов", potato: "картошки", carrot: "моркови", tomato: "помидоров", cucumber: "огурцов", egg: "яиц",
  "cottage-cheese": "творога", "minced-meat": "фарша", buckwheat: "гречки", rice: "риса", pasta: "макарон",
  "chicken-fillet": "куриного филе", "chicken-breast": "куриной грудки", liver: "печени", "green-onion": "зелёного лука", radish: "редиски",
};
const ICON: Record<string, string> = { pumpkin: "🎃", cabbage: "🥬", apple: "🍎", mushroom: "🍄", beet: "🫜", zucchini: "🥒", eggplant: "🍆", potato: "🥔", carrot: "🥕", tomato: "🍅", cucumber: "🥒", egg: "🥚" };
// What is in season for «Что приготовить из …», by month (only those the catalog has enough of are offered).
const SEASON: Record<number, string[]> = {
  0: ["cabbage", "beet", "potato", "carrot"], 1: ["cabbage", "beet", "potato", "carrot"], 2: ["egg", "cottage-cheese", "potato", "cabbage"],
  3: ["egg", "green-onion", "radish", "cottage-cheese"], 4: ["green-onion", "radish", "cucumber", "egg"], 5: ["cucumber", "zucchini", "tomato", "radish"],
  6: ["zucchini", "tomato", "cucumber", "eggplant"], 7: ["zucchini", "eggplant", "tomato", "apple"], 8: ["apple", "mushroom", "pumpkin", "zucchini"],
  9: ["pumpkin", "cabbage", "apple", "mushroom"], 10: ["pumpkin", "cabbage", "apple", "beet"], 11: ["cabbage", "beet", "potato", "carrot"],
};
const BASICS = /^(salt|black-pepper|water|sugar|vegetable-oil|sunflower-oil|olive-oil|butter|flour|wheat-flour|onion|garlic|bay-leaf|dill|parsley)$/;

/** A seeded shuffle, so «Другие блюда» gives another set and the same seed the same one. */
function shuffled<T>(list: T[], seed: number): T[] {
  let s = seed >>> 0 || 7;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  return list.map((x) => ({ x, k: rnd() })).sort((a, b) => a.k - b.k).map((o) => o.x);
}

// ---------- Collage ----------
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
function cover(g: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  if (!img) { g.fillStyle = "#E8E1D5"; g.fillRect(x, y, w, h); return; }
  const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function caption(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number, size: number) {
  const grad = g.createLinearGradient(0, y + h * 0.45, 0, y + h);
  grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,0.72)");
  g.fillStyle = grad; g.fillRect(x, y + h * 0.45, w, h * 0.55);
  g.fillStyle = "#fff"; g.font = `600 ${size}px "Golos Text", Arial, sans-serif`;
  const words = text.split(" "); const lines: string[] = []; let line = "";
  for (const wd of words) { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > w - 24 && line) { lines.push(line); line = wd; } else line = t; }
  if (line) lines.push(line);
  lines.slice(-3).forEach((l, i, all) => g.fillText(l, x + 12, y + h - 14 - (all.length - 1 - i) * (size + 4)));
}
async function collage(kind: "menu" | "product", title: string, items: { r: Recipe; label: string }[], photos: Record<string, number>): Promise<Blob | null> {
  const imgs = await Promise.all(items.map(({ r }) => loadImage(photo(r.id, photos) ?? "")));
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  if (kind === "menu") {
    c.width = 1200; c.height = 760;
    g.fillStyle = "#FAF7F0"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#211D1A"; g.font = `700 52px "Golos Text", Arial, sans-serif`; g.fillText(title, 28, 72);
    const tw = (1200 - 28 * 2 - 12 * 3) / 4, th = (760 - 110 - 28 - 12) / 2;
    for (let i = 0; i < 8; i++) {
      const x = 28 + (i % 4) * (tw + 12), y = 110 + Math.floor(i / 4) * (th + 12);
      g.save(); g.beginPath(); g.roundRect(x, y, tw, th, 18); g.clip();
      if (i < items.length) { cover(g, imgs[i], x, y, tw, th); caption(g, items[i].label, x, y, tw, th, 26); }
      else { g.fillStyle = "#B7432F"; g.fillRect(x, y, tw, th); g.fillStyle = "#fff"; g.font = `700 34px "Golos Text", Arial, sans-serif`; g.fillText("Что", x + 24, y + th / 2 - 8); g.fillText("приготовить?", x + 24, y + th / 2 + 34); }
      g.restore();
    }
  } else {
    c.width = 1200; c.height = 680;
    g.fillStyle = "#FAF7F0"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#211D1A"; g.font = `700 50px "Golos Text", Arial, sans-serif`; g.fillText(title, 28, 70);
    const top = 100, H = 680 - top - 28, big = (1200 - 56 - 12) * 0.5, sw = (1200 - 56 - 12 * 2 - big) / 2, sh = (H - 12) / 2;
    const boxes = [[28, top, big, H], [28 + big + 12, top, sw, sh], [28 + big + 24 + sw, top, sw, sh], [28 + big + 12, top + sh + 12, sw, sh], [28 + big + 24 + sw, top + sh + 12, sw, sh]];
    boxes.forEach(([x, y, w, h], i) => {
      g.save(); g.beginPath(); g.roundRect(x, y, w, h, 18); g.clip();
      if (items[i]) { cover(g, imgs[i], x, y, w, h); caption(g, items[i].label, x, y, w, h, i ? 24 : 34); } else { g.fillStyle = "#E8E1D5"; g.fillRect(x, y, w, h); }
      g.restore();
    });
  }
  return new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.9));
}
function download(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- The block ----------
export function VkPosts() {
  const [photos, setPhotos] = useState<Record<string, number> | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    get<CatalogAnswer>("catalog").then((cat) => {
      const hidden = new Set(cat.hidden ?? []);
      useCatalog(buildCatalog(cat.files.map((f) => (f.data && typeof f.data === "object" ? { ...f, data: { ...(f.data as object), recipes: ((f.data as { recipes?: { id: string }[] }).recipes ?? []).filter((r) => !hidden.has(r.id)) } } : f))));
      setPhotos(cat.photos ?? {});
    }).catch((e) => setErr("Каталог не загрузился: " + (e as Error).message));
  }, []);
  return (
    <div className="adm-card" style={{ marginTop: 16 }}>
      <h2 style={{ marginBottom: 2 }}>Готовые посты</h2>
      <p className="adm-muted" style={{ margin: 0 }}>Текст и картинка для поста в сообществе — скопируйте и вставьте в ВК вручную (сайту ВК публиковать не даёт).</p>
      {err && <p className="cx-err">{err}</p>}
      {!photos ? <p className="adm-muted">Загружаю каталог…</p> : <><MenuPost photos={photos} /><ProductPost photos={photos} /></>}
    </div>
  );
}

function Actions({ text, picture, files, wait }: { text: string; picture: () => Promise<Blob | null>; files: { r: Recipe }[]; wait?: boolean }) {
  const [msg, setMsg] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
      <button className={BTN} disabled={wait} title={wait ? "Ждём ссылку «Взять это меню себе»" : undefined} onClick={() => void navigator.clipboard.writeText(text).then(() => setMsg("Текст скопирован"), () => setMsg("Не получилось — выделите текст и нажмите Ctrl+C"))}>Скопировать текст</button>
      <button className={BTN_OUTLINE} onClick={() => void picture().then((b) => (b ? (download(b, "post-" + Date.now() + ".jpg"), setMsg("Картинка скачана")) : setMsg("Картинка не собралась")))}>Скачать картинку-коллаж</button>
      <button className={BTN_OUTLINE} onClick={() => { files.forEach(({ r }, i) => setTimeout(() => { const a = document.createElement("a"); a.href = "../photos/" + r.id + ".jpg"; a.download = r.id + ".jpg"; a.click(); }, i * 300)); setMsg("Фото скачиваются"); }}>Скачать фото по одному ({files.length})</button>
      {msg && <span className="adm-muted">{msg}</span>}
    </div>
  );
}

function Preview({ text, items, photos, big }: { text: string; items: { r: Recipe; label: string }[]; photos: Record<string, number>; big?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 12, marginTop: 10 }}>
      <textarea className="cx-prompt" readOnly value={text} style={{ minHeight: 280 }} onFocus={(e) => e.currentTarget.select()} />
      <div style={{ display: "grid", gridTemplateColumns: big ? "2fr 1fr 1fr" : "repeat(4, 1fr)", gridAutoRows: big ? "90px" : "86px", gap: 4, alignContent: "start" }}>
        {items.map(({ r, label }, i) => (
          <div key={r.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#E8E1D5", gridRow: big && i === 0 ? "span 2" : undefined }}>
            {photo(r.id, photos) && <img src={photo(r.id, photos)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 6px 4px", fontSize: 10, color: "#fff", background: "linear-gradient(transparent, rgba(0,0,0,.7))" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuPost({ photos }: { photos: Record<string, number> }) {
  const [kind, setKind] = useState<Kind>("dinner");
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [code, setCode] = useState("");
  const [shareErr, setShareErr] = useState("");
  const dishes = useMemo(() => {
    const only = (r: Recipe) => !!photos[r.id] && !isUnusual(r) && (kind === "quick" ? r.totalMinutes <= 40 : kind === "lenten" ? isLenten(r) : true);
    const plan = { ...DEFAULT_MENU_PLAN, meals: ["dinner"], cookAhead: false, quickWeekdays: false, only } as MenuPlan;
    const start = new Date(); const days = Array.from({ length: 7 }, (_, i) => ({ date: new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10), items: [] }));
    const menu = generateMenu(days, DEFAULT_STATE.preferences, 2, seed, plan);
    return menu.map((d) => d.items.find((it) => !it.leftover)).filter(Boolean).map((it) => recipes().find((r) => r.id === it!.recipeId)).filter((r): r is Recipe => !!r).slice(0, 7);
  }, [kind, seed, photos]);
  useEffect(() => {
    setCode(""); setShareErr("");
    let off = false;
    if (dishes.length) post<{ code: string }>("admin.menu.share", { ids: dishes.map((r) => r.id) }).then((j) => !off && setCode(j.code), (e) => !off && setShareErr((e as Error).message));
    return () => { off = true; };
  }, [dishes]);
  const title = kind === "lenten" ? "Постное меню на неделю" : kind === "quick" ? "Быстрые ужины на неделю" : "Меню на неделю";
  const text = "🗓 " + title + ": " + dishes.length + " ужинов без повторов\n\n"
    + dishes.map((r, i) => DAYS[i] + " — " + r.title).join("\n")
    + "\n\nВзять это меню себе — блюда встанут в план, продукты в список покупок:\n" + site() + (code ? "?m=" + code : "")
    + "\n\nВсе рецепты — пошагово, с таймерами.\n\n#менюнанеделю #чтоприготовить #ужин" + (kind === "lenten" ? " #постноеменю" : "");
  const items = dishes.map((r, i) => ({ r, label: DAYS[i] + " · " + r.title }));
  return (
    <div className="cx-section">
      <h3 style={{ margin: "0 0 4px" }}>🗓 Меню на неделю</h3>
      <p className="adm-muted" style={{ margin: 0 }}>7 ужинов по правилам плана: привычные, по сезону, без повторов, только с фото.</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        {KINDS.map((k) => <button key={k.id} className={"cx-pill" + (kind === k.id ? " on" : "")} onClick={() => setKind(k.id)}>{k.label}</button>)}
        <span style={{ flex: 1 }} />
        <button className={BTN_OUTLINE} onClick={() => setSeed((s) => s + 1)}>↻ Другие блюда</button>
      </div>
      {shareErr ? <p className="cx-err" style={{ margin: "6px 0 0" }}>Ссылка «Взять это меню себе» не создалась: {shareErr}</p>
        : !code && dishes.length > 0 && <p className="adm-muted" style={{ margin: "6px 0 0" }}>Готовлю ссылку «Взять это меню себе»…</p>}
      <Preview text={text} items={items} photos={photos} />
      <Actions text={text} files={items} wait={!code} picture={() => collage("menu", title, items, photos)} />
    </div>
  );
}

function ProductPost({ photos }: { photos: Record<string, number> }) {
  const month = new Date().getMonth();
  // Products with at least five dishes with a photo, the season's first.
  const products = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of recipes()) if (photos[r.id]) for (const id of new Set(r.ingredients.filter((i) => !i.optional).map((i) => i.id))) if (!BASICS.test(id)) n.set(id, (n.get(id) ?? 0) + 1);
    return [...n].filter(([, k]) => k >= 5).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [photos]);
  const season = (SEASON[month] ?? []).filter((id) => products.includes(id));
  const [id, setId] = useState(() => season[0] ?? products[0] ?? "");
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const dishes = useMemo(() => {
    const pool = shuffled(recipes().filter((r) => photos[r.id] && r.ingredients.some((i) => i.id === id && !i.optional) && !isUnusual(r) && inSeason(r, month)), seed);
    // Not five soups: two of a kind at most, the dish where the product is the star first.
    const out: Recipe[] = []; const per = new Map<string, number>();
    const star = (r: Recipe) => (r.mainIngredient === id || new RegExp(shortName(id).slice(0, 4), "i").test(r.title) ? 0 : 1);
    for (const r of pool.sort((a, b) => star(a) - star(b))) {
      const c = r.course ?? "other";
      if ((per.get(c) ?? 0) >= 2) continue;
      per.set(c, (per.get(c) ?? 0) + 1); out.push(r);
      if (out.length === 5) break;
    }
    return out;
  }, [id, seed, photos, month]);
  const name = shortName(id);
  const title = OF[id] ? "Что приготовить из " + OF[id] : name.charAt(0).toUpperCase() + name.slice(1) + ": что приготовить";
  const text = (ICON[id] ?? "🍽️") + " " + title + ": " + dishes.length + " идей\n\n"
    + dishes.map((r, i) => (i + 1) + ". " + r.title + " — " + timeShort(r)).join("\n")
    + "\n\nВсе рецепты с этим продуктом — пошагово, с таймерами:\n" + site() + "iz/" + id
    + "\n\n#" + name.toLowerCase().replace(/[^а-яёa-z0-9]/gi, "") + " #чтоприготовить #рецепты";
  const items = dishes.map((r) => ({ r, label: r.title }));
  return (
    <div className="cx-section">
      <h3 style={{ margin: "0 0 4px" }}>{ICON[id] ?? "🍽️"} Что приготовить из …</h3>
      <p className="adm-muted" style={{ margin: 0 }}>5 блюд с одним продуктом; ссылка — на страницу сайта со всеми его рецептами.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        <label className="adm-muted" htmlFor="vk-product">Продукт</label>
        <select id="vk-product" value={id} onChange={(e) => setId(e.target.value)} style={{ height: 34, borderRadius: 8, border: "1px solid #d8d0c4", padding: "0 8px" }}>
          {season.length > 0 && <optgroup label="Сейчас в сезоне">{season.map((p) => <option key={p} value={p}>{shortName(p)}</option>)}</optgroup>}
          <optgroup label="Все продукты">{products.filter((p) => !season.includes(p)).map((p) => <option key={p} value={p}>{shortName(p)}</option>)}</optgroup>
        </select>
        <span style={{ flex: 1 }} />
        <button className={BTN_OUTLINE} onClick={() => setSeed((s) => s + 1)}>↻ Другие блюда</button>
      </div>
      <Preview text={text} items={items} photos={photos} big />
      <Actions text={text} files={items} picture={() => collage("product", title, items, photos)} />
    </div>
  );
}
