// «Подборки» in the admin panel: every holiday, season and theme on Главная, and the owner's own collections.
// Each one: shown or not, its title and line, recipes added by hand or taken out (over the built-in rule),
// and a drawn cover — the prompt to copy into an image generator and the upload.
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCatalog, recipes, useCatalog, type Recipe } from "../engine";
import { HOLIDAYS, MIN_DISHES, SEASONS, THEMES, type Collection, type Custom, type Customs } from "../app/seasonal";
import { get, photo, post, upload } from "./api";
import { coverPrompt, type CoverShape } from "./prompts";
import { BTN, BTN_OUTLINE, BTN_SM, INPUT } from "./ui";

type Kind = "holiday" | "season" | "theme" | "own";
interface Entry { kind: Kind; c: Collection; when?: string; min: number }
interface CatalogAnswer { files: { name: string; data?: unknown; error?: string }[]; hidden: string[]; photos: Record<string, number> }

const THEME_WHEN: Record<string, string> = { sick: "сентябрь – апрель", picnic: "май – август" };
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const recipesWord = (n: number) => n + " " + (n % 10 === 1 && n % 100 !== 11 ? "рецепт" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "рецепта" : "рецептов");

export function Collections() {
  const [all, setAll] = useState<Recipe[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, number>>({});
  const [customs, setCustoms] = useState<Customs>({});
  const [problem, setProblem] = useState("");
  const [sel, setSel] = useState("romantic");

  useEffect(() => {
    Promise.all([get<CatalogAnswer>("catalog"), get<{ collections: Customs }>("collections")])
      .then(([cat, col]) => {
        useCatalog(buildCatalog(cat.files));
        const hidden = new Set(cat.hidden ?? []);
        setAll(recipes().filter((r) => !hidden.has(r.id)));
        setPhotos(cat.photos ?? {});
        setCustoms(col.collections ?? {});
      })
      .catch((e: Error) => setProblem(e.message));
  }, []);

  const entries = useMemo<Entry[]>(() => [
    ...HOLIDAYS.map((c) => ({ kind: "holiday" as const, c, when: c.when, min: 4 })),
    ...SEASONS.map((c) => ({ kind: "season" as const, c, when: c.when, min: 4 })),
    ...THEMES.map((c) => ({ kind: "theme" as const, c, when: THEME_WHEN[c.key], min: MIN_DISHES })),
    ...Object.entries(customs).filter(([, x]) => x.custom).map(([key, x]) => ({ kind: "own" as const, c: { key, title: x.title ?? "Без названия", hint: x.hint ?? "", emoji: x.emoji ?? "🍽️", test: () => false }, min: MIN_DISHES })),
  ], [customs]);

  // Every collection's recipes: the rule's ones without those taken out, and those added by hand (first).
  const lists = useMemo(() => {
    const out: Record<string, { rule: Recipe[]; final: Recipe[] }> = {};
    if (!all) return out;
    const byId = new Map(all.map((r) => [r.id, r]));
    for (const e of entries) {
      const x = customs[e.c.key] ?? {};
      const rule = all.filter(e.c.test);
      const remove = new Set(x.remove ?? []);
      const added = (x.add ?? []).map((id) => byId.get(id)).filter((r): r is Recipe => !!r);
      const addedIds = new Set(added.map((r) => r.id));
      out[e.c.key] = { rule, final: [...added, ...rule.filter((r) => !remove.has(r.id) && !addedIds.has(r.id))] };
    }
    return out;
  }, [all, entries, customs]);

  const save = async (key: string, x: Custom) => { const j = await post<{ collections: Customs }>("admin.collection.save", { key, collection: x }); setCustoms(j.collections ?? {}); };
  const create = async (title: string) => {
    const key = "my-" + Date.now().toString(36);
    await save(key, { custom: true, title, on: true, add: [] });
    setSel(key);
  };
  const remove = async (key: string) => {
    const j = await post<{ collections: Customs }>("admin.collection.save", { key, delete: true });
    setCustoms(j.collections ?? {});
    setSel("romantic");
  };

  const cur = entries.find((e) => e.c.key === sel) ?? entries.find((e) => e.kind === "theme")!;
  const groups: [Kind, string][] = [["theme", "Подборки на Главной"], ["own", "Ваши подборки"], ["holiday", "Праздники · карусель, когда праздник близко"], ["season", "Сезоны · карусель, всегда одна"]];

  return (
    <section>
      <div className="adm-toolbar">
        <div>
          <h1 className="adm-title">Подборки</h1>
          <p className="adm-muted">Праздники, сезоны и подборки на Главной. Изменения видны на сайте после обновления страницы.</p>
        </div>
        <div className="adm-actions"><NewCollection onCreate={create} /></div>
      </div>
      {problem && <div className="adm-alert adm-bad">{problem}</div>}
      {!all && !problem ? <p className="adm-muted">Загружаю каталог…</p> : all && (
        <div className="cx-cols">
          <div className="adm-card cx-list">
            {groups.map(([kind, label]) => {
              const list = entries.filter((e) => e.kind === kind);
              if (!list.length) return null;
              return (
                <div key={kind}>
                  <div className="cx-group">{label}</div>
                  {list.map((e) => {
                    const x = customs[e.c.key] ?? {};
                    const n = lists[e.c.key]?.final.length ?? 0;
                    const off = x.on === false;
                    const img = x.cover ? "../collections/" + e.c.key + ".jpg?v=" + x.cover : null;
                    return (
                      <button key={e.c.key} className={"cx-li" + (e.c.key === cur.c.key ? " on" : "") + (off || n < e.min ? " off" : "")} onClick={() => setSel(e.c.key)}>
                        <span className="cx-ic">{img ? <img src={img} alt="" /> : x.emoji ?? e.c.emoji}</span>
                        <span>{x.title ?? e.c.title}</span>
                        <span className="cx-n">{off ? "выключена" : n < e.min ? n + " · мало" : n}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <Editor key={cur.c.key} e={cur} x={customs[cur.c.key] ?? {}} rule={lists[cur.c.key]?.rule ?? []} final={lists[cur.c.key]?.final ?? []}
            all={all} photos={photos} onSave={(x) => save(cur.c.key, x)} onDelete={() => remove(cur.c.key)} onCustoms={setCustoms} />
        </div>
      )}
    </section>
  );
}

function NewCollection({ onCreate }: { onCreate: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  if (!open) return <button className={BTN} onClick={() => setOpen(true)}>+ Новая подборка</button>;
  return (
    <form className="cx-row" style={{ marginTop: 0 }} onSubmit={(ev) => { ev.preventDefault(); if (title.trim()) void onCreate(title.trim()).then(() => { setOpen(false); setTitle(""); }); }}>
      <input className={INPUT} style={{ width: 260 }} autoFocus placeholder="Например: Завтрак в выходной" value={title} onChange={(ev) => setTitle(ev.target.value)} />
      <button className={BTN} type="submit">Создать</button>
      <button className={BTN_OUTLINE} type="button" onClick={() => setOpen(false)}>Отмена</button>
    </form>
  );
}

function Editor({ e, x, rule, final, all, photos, onSave, onDelete, onCustoms }: {
  e: Entry; x: Custom; rule: Recipe[]; final: Recipe[]; all: Recipe[]; photos: Record<string, number>;
  onSave: (x: Custom) => Promise<void>; onDelete: () => Promise<void>; onCustoms: (c: Customs) => void;
}) {
  const [title, setTitle] = useState(x.title ?? "");
  const [hint, setHint] = useState(x.hint ?? "");
  const [emoji, setEmoji] = useState(x.emoji ?? "");
  const [view, setView] = useState<"all" | "rule" | "added" | "removed">("all");
  const [status, setStatus] = useState<{ ok?: string; err?: string }>({});
  const on = x.on !== false;
  const add = x.add ?? [], removed = x.remove ?? [];
  const ruleIds = useMemo(() => new Set(rule.map((r) => r.id)), [rule]);
  const byId = useMemo(() => new Map(all.map((r) => [r.id, r])), [all]);
  const showCover = e.kind === "theme" || e.kind === "own";

  const run = async (f: () => Promise<unknown>, ok: string) => {
    setStatus({});
    try { await f(); setStatus({ ok }); } catch (err) { setStatus({ err: (err as Error).message }); }
  };
  const change = (patch: Partial<Custom>, ok = "Сохранено") => run(() => onSave({ ...x, ...patch }), ok);
  const addRecipe = (id: string) => change(removed.includes(id) ? { remove: removed.filter((r) => r !== id) } : ruleIds.has(id) ? {} : { add: [...add, id] }, "Добавлено");
  const takeOut = (id: string) => change(add.includes(id) ? { add: add.filter((r) => r !== id) } : { remove: [...removed, id] }, "Убрано");
  const putBack = (id: string) => change({ remove: removed.filter((r) => r !== id) }, "Возвращено");

  const tiles = view === "all" ? final : view === "rule" ? rule : view === "added" ? add.map((id) => byId.get(id)).filter((r): r is Recipe => !!r) : removed.map((id) => byId.get(id)).filter((r): r is Recipe => !!r);
  const state = !on ? "выключена — на Главной её нет" : final.length < e.min ? `пока не видна: нужно минимум ${e.min} рецептов` : e.kind === "holiday" ? "появляется на Главной: " + e.when : e.kind === "season" ? "на Главной: " + e.when : e.when ? "на Главной: " + e.when : "видна на Главной";

  return (
    <div className="adm-card">
      <div className="cx-head">
        <div>
          <h2 style={{ marginBottom: 2 }}>{(x.emoji ?? e.c.emoji) + " " + (x.title ?? e.c.title)}</h2>
          <p className="adm-muted" style={{ margin: 0 }}>{recipesWord(final.length)} · {state}</p>
        </div>
        <div className="cx-row" style={{ marginTop: 0 }}>
          <label className="cx-toggle"><input type="checkbox" checked={on} onChange={() => change({ on: !on }, on ? "Выключена" : "Включена")} />Показывать</label>
          {e.kind === "own" && <button className={BTN_SM} onClick={() => { if (confirmDelete(x.title ?? "")) void run(onDelete, "Удалена"); }}>Удалить подборку</button>}
        </div>
      </div>

      <form className="cx-fields" onSubmit={(ev) => { ev.preventDefault(); void change({ title: title.trim() || undefined, hint: hint.trim() || undefined, emoji: emoji.trim() || undefined }); }}>
        <div><label>Название</label><input className={INPUT} value={title} placeholder={e.c.title} onChange={(ev) => setTitle(ev.target.value)} /></div>
        <div><label>Строка под названием</label><input className={INPUT} value={hint} placeholder={e.c.hint || "Например: Ужин для двоих"} onChange={(ev) => setHint(ev.target.value)} /></div>
        <div><label>Значок</label><input className={INPUT} value={emoji} placeholder={e.c.emoji} onChange={(ev) => setEmoji(ev.target.value)} /></div>
        <div className="cx-row" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
          <button className={BTN_OUTLINE} type="submit">Сохранить название</button>
          {status.ok && <span className="cx-saved">✓ {status.ok}</span>}
          {status.err && <span className="cx-err">{status.err}</span>}
        </div>
      </form>

      {showCover && <Cover e={e} x={x} first={final[0]} photos={photos} title={x.title ?? e.c.title} hint={x.hint ?? e.c.hint} onCustoms={onCustoms} />}

      <div className="cx-section">
        <span className="cx-label">Рецепты в подборке</span>
        <div className="cx-pills">
          <button className={"cx-pill" + (view === "all" ? " on" : "")} onClick={() => setView("all")}>Все {final.length}</button>
          {e.kind !== "own" && <button className={"cx-pill" + (view === "rule" ? " on" : "")} onClick={() => setView("rule")}>По правилу {rule.length}</button>}
          <button className={"cx-pill" + (view === "added" ? " on" : "")} onClick={() => setView("added")}>Добавлены вами {add.length}</button>
          {e.kind !== "own" && <button className={"cx-pill" + (view === "removed" ? " on" : "")} onClick={() => setView("removed")}>Убраны вами {removed.length}</button>}
        </div>
        <Search all={all} photos={photos} inList={(id) => final.some((r) => r.id === id)} onAdd={addRecipe} />
        {tiles.length === 0
          ? <p className="adm-muted" style={{ marginTop: 14 }}>{view === "added" ? "Вы пока ничего не добавили. Найдите рецепт в поиске выше." : view === "removed" ? "Вы ничего не убирали." : "Пока пусто. Добавьте рецепты через поиск."}</p>
          : (
            <div className="cx-tiles" style={{ marginTop: 14 }}>
              {tiles.slice(0, 200).map((r) => {
                const out = removed.includes(r.id);
                const src = photo(r.id, photos);
                return (
                  <div key={r.id} className={"cx-tile" + (out ? " out" : "")}>
                    {src ? <img src={src} alt="" loading="lazy" /> : <div className="cx-ph" />}
                    {add.includes(r.id) && <span className="cx-badge">добавлен</span>}
                    {out ? <button className="cx-x" onClick={() => putBack(r.id)}>Вернуть</button> : <button className="cx-x" onClick={() => takeOut(r.id)}>Убрать</button>}
                    <b>{r.title}</b>
                  </div>
                );
              })}
            </div>
          )}
        {tiles.length > 200 && <p className="adm-muted">Показаны первые 200.</p>}
        {e.kind !== "own" && <p className="adm-muted" style={{ marginTop: 14 }}>Подборка набирается сама по правилу. Можно добавить любой рецепт через поиск или убрать лишний — ваше решение всегда важнее правила. Добавленные вами рецепты на сайте идут первыми.</p>}
      </div>
    </div>
  );
}

function confirmDelete(title: string): boolean {
  return window.confirm("Удалить подборку «" + title + "»? Её обложки тоже удалятся.");
}

/** Two covers: tall 4:5 for phones and wide 3:2 for computers. Without the wide one, computers cut the tall one. */
function Cover({ e, x, first, photos, title, hint, onCustoms }: { e: Entry; x: Custom; first?: Recipe; photos: Record<string, number>; title: string; hint: string; onCustoms: (c: Customs) => void }) {
  const fallback = first ? photo(first.id, photos) : null;
  return (
    <div className="cx-covers">
      <CoverSlot e={e} shape="tall" version={x.cover} fallback={fallback} title={title} hint={hint} onCustoms={onCustoms} />
      <CoverSlot e={e} shape="wide" version={x.coverWide} fallback={x.cover ? "../collections/" + e.c.key + ".jpg?v=" + x.cover : fallback} title={title} hint={hint} onCustoms={onCustoms} />
    </div>
  );
}

const SHAPES: Record<CoverShape, { label: string; none: string; cut: string }> = {
  tall: { label: "Для телефона · вертикальная 4:5", none: "пока стоит фото первого блюда", cut: "Картинка сама обрежется до 4:5." },
  wide: { label: "Для компьютера · горизонтальная 3:2", none: "пока обрезается вертикальная", cut: "Картинка сама обрежется до 3:2." },
};

function CoverSlot({ e, shape, version, fallback, title, hint, onCustoms }: { e: Entry; shape: CoverShape; version?: number; fallback: string | null; title: string; hint: string; onCustoms: (c: Customs) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const prompt = coverPrompt(e.c.key, title, hint, shape);
  const own = version ? "../collections/" + e.c.key + (shape === "wide" ? "-wide" : "") + ".jpg?v=" + version : null;
  const s = SHAPES[shape];
  const send = async (f: File) => {
    setBusy(true); setMsg({});
    try {
      const form = new FormData(); form.append("key", e.c.key); form.append("shape", shape); form.append("cover", f);
      const j = await upload<{ collections: Customs }>("admin.collection.cover", form);
      onCustoms(j.collections ?? {}); setMsg({ ok: "Обложка загружена" });
    } catch (err) { setMsg({ err: (err as Error).message }); } finally { setBusy(false); if (file.current) file.current.value = ""; }
  };
  const drop = async () => {
    try { const j = await post<{ collections: Customs }>("admin.collection.cover.delete", { key: e.c.key, shape }); onCustoms(j.collections ?? {}); setMsg({ ok: "Обложка убрана" }); }
    catch (err) { setMsg({ err: (err as Error).message }); }
  };
  const img = "cx-cover-img cx-cover-" + shape;
  return (
    <div className="cx-cover">
      {own ? <img className={img} src={own} alt="" /> : fallback ? <img className={img} src={fallback} alt="" /> : <div className={img}>{e.c.emoji}</div>}
      <div>
        <span className="cx-label">{s.label} · {own ? "ваша картинка" : s.none}</span>
        <textarea className="cx-prompt" readOnly value={prompt} onFocus={(ev) => ev.currentTarget.select()} />
        <div className="cx-row">
          <button className={BTN_OUTLINE} onClick={() => void navigator.clipboard.writeText(prompt).then(() => setMsg({ ok: "Промт скопирован" }), () => setMsg({ err: "Не получилось скопировать — выделите текст и нажмите Ctrl+C" }))}>Скопировать промт</button>
          <button className={BTN} disabled={busy} onClick={() => file.current?.click()}>{busy ? "Загружаю…" : own ? "Заменить" : "Загрузить"}</button>
          {own && <button className={BTN_SM} onClick={() => void drop()}>Убрать</button>}
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void send(f); }} />
        </div>
        <p className="adm-muted" style={{ marginTop: 8, marginBottom: 0 }}>JPEG, PNG или WebP до 12 МБ. {s.cut}{msg.ok && <span className="cx-saved"> ✓ {msg.ok}</span>}{msg.err && <span className="cx-err"> {msg.err}</span>}</p>
      </div>
    </div>
  );
}

function Search({ all, photos, inList, onAdd }: { all: Recipe[]; photos: Record<string, number>; inList: (id: string) => boolean; onAdd: (id: string) => void }) {
  const [q, setQ] = useState("");
  const found = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    return all.filter((r) => norm(r.title).includes(n)).slice(0, 12);
  }, [q, all]);
  return (
    <div className="cx-search">
      <input className={INPUT} placeholder="Найти рецепт по названию и добавить в подборку…" value={q} onChange={(ev) => setQ(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Escape") setQ(""); }} />
      {found.length > 0 && (
        <div className="cx-found">
          {found.map((r) => {
            const src = photo(r.id, photos);
            const there = inList(r.id);
            return (
              <div key={r.id} className="cx-found-row">
                {src ? <img src={src} alt="" loading="lazy" /> : <div className="cx-ph" />}
                <span>{r.title}</span>
                {there ? <span className="adm-muted" style={{ flex: "none" }}>уже в подборке</span> : <button className={BTN_SM} onClick={() => { onAdd(r.id); setQ(""); }}>Добавить</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
