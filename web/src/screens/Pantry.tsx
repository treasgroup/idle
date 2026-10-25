// «Мои продукты»: what is in the fridge and cupboards, what has to be used soon, and Шеф's ideas from it.
import { useMemo, useState } from "react";
import { Plus, ScanText, Search, X, Refrigerator, Clock, ChevronRight, Trash2, UtensilsCrossed, Bell, ScanBarcode } from "lucide-react";
import {
  AISLES, LEFTOVERS, aisleOf, addToFridge, daysLeft, expiringSoon, expiryLabel, ingredient, ingredientOptions, pantryGroups, plural,
  searchIngredients, setExpiry, shortName, type FridgeItem,
} from "../engine";
import { useStore } from "../app/store";
import { FreezerSection } from "../components/Freezer";
import { knownProduct } from "../app/knownProducts";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { ChefAvatar, Chip, Empty, Section, Sheet, cx } from "../components/ui";
import { useReminders } from "../app/reminders";
import { useHint } from "../app/hints";
import { BarcodeScan, canScan } from "../components/BarcodeScan";
import { ProductTiles } from "../components/ProductTiles";

const EXPIRY = [["Сегодня", 0], ["Завтра", 1], ["3 дня", 3], ["Неделя", 7], ["Месяц", 30], ["Без срока", null]] as const;

/** Picks product names out of a pasted receipt or a free list: "СМЕТАНА 20% 300Г  89,90" → sour cream. */
export function parseReceipt(text: string, ids: string[]): string[] {
  const found = new Set<string>();
  for (const raw of text.split(/\n|;|,(?!\d)/)) {
    // A unit is cut only when no letter follows it («2 лука» keeps «лука»).
    const line = raw.toLowerCase().replace(/ё/g, "е")
      .replace(/\d+([.,]\d+)?\s*(?:(?:%|кг|гр?|мл|л|шт|уп|x|х|\*|руб|р\.?|₽)(?![а-яa-z]))?/g, " ")
      .replace(/[^а-яa-z\s-]/g, " ").replace(/\s+/g, " ").trim();
    if (line.length < 3 || /^(итог|итого|сумма|ндс|кассир|чек|скидк|оплат|безнал|наличн|сдача|смена|инн|фн|фд|фп|спасибо|пакет)/.test(line)) continue;
    const known = knownProduct(line);
    if (known) { for (const id of known) if (ids.includes(id)) found.add(id); continue; }
    // A one-word line in another case («2 лука») first tries its base form, if a product is named exactly that.
    const stem = line.replace(/(ов|ей|а|я|ы|и|у|ю)$/, "");
    const exact = !line.includes(" ") && stem !== line ? searchIngredients(stem, ids, 3).find((id) => shortName(id).toLowerCase().replace(/ё/g, "е") === stem) : undefined;
    if (exact) { found.add(exact); continue; }
    const whole = searchIngredients(line, ids, 1)[0];
    if (whole && line.split(" ").length <= 4) { found.add(whole); continue; }
    const words = line.split(" ").filter((w) => w.length >= 3);
    for (const w of words.slice(0, 3)) {
      const hit = searchIngredients(w, ids, 1)[0];
      if (hit) { found.add(hit); break; }
    }
  }
  return [...found];
}

const products = (n: number) => n + " " + plural(n, "продукт", "продукта", "продуктов");

export function Pantry() {
  const { s, update, toast } = useStore();
  const a = useAssistant();
  const [adding, setAdding] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [edit, setEdit] = useState<FridgeItem | null>(null);
  const soon = useMemo(() => expiringSoon(s.fridge), [s.fridge]);
  const reminders = useReminders();
  const [remindHint, remindSeen] = useHint("pantry-remind");
  const byAisle = useMemo(() => AISLES.map((x) => ({ ...x, items: s.fridge.filter((f) => aisleOf({ ingredientId: f.id, name: ingredient(f.id)?.name ?? f.id }) === x.key) }))
    .filter((g) => g.items.length).map((g) => ({ ...g, items: [...g.items].sort((p, q) => (p.until ?? Infinity) - (q.until ?? Infinity)) })), [s.fridge]);

  /** Opens the conversation with recipes from home products (optionally around the ones that have to be used). */
  const cookFromHome = (focus?: string[]) => {
    const ids = s.fridge.map((f) => f.id);
    const c = { ...a.base(), available: ids, ...(focus ? { desired: focus } : { strictPantry: ids.length >= 4 }) };
    // When that finds nothing: each product that has to be used on its own, then only what is at home, then dishes
    // where one or two things are to buy («Макароны по-флотски» wanting tomato paste was hidden altogether).
    const name = (id: string) => shortName(id).toLowerCase();
    const next = [
      ...(focus && focus.length > 1 ? focus.map((id) => ({ c: { ...a.base(), available: ids, desired: [id] }, intro: "Чтобы не пропало (" + name(id) + "), приготовьте:" })) : []),
      ...(ids.length >= 4 ? [{ c: { ...a.base(), available: ids, strictPantry: true }, intro: "Из того, что есть, можно приготовить:" }] : []),
      { c: { ...a.base(), available: ids, strictPantry: false }, intro: "Почти всё есть — кое-что докупить:" },
    ];
    a.show(focus ? "Использовать: " + focus.map(name).join(", ") : "Из того, что дома", c,
      focus ? "Чтобы ничего не пропало, приготовьте:" : "Из того, что есть, можно приготовить:", { fresh: true, next });
    goChat();
  };
  const remove = (id: string) => {
    const before = s.fridge;
    update((st) => ({ ...st, fridge: st.fridge.filter((f) => f.id !== id) }));
    toast(shortName(id) + " — убрано", { label: "Отменить", run: () => update((st) => ({ ...st, fridge: before })) });
  };

  return (
    <div className="pt-4 sm:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1">Мои продукты</h1>
          <p className="mt-1 text-body-sm text-ink-soft">{s.fridge.length ? products(s.fridge.length) : "Что есть в холодильнике и шкафу"}</p>
        </div>
        {s.fridge.length > 0 && (
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setReceipt(true)}><ScanText size={18} />Добавить по чеку</button>
            <button className="btn-soft" onClick={() => setAdding(true)}><Plus size={18} />Добавить</button>
          </div>
        )}
      </div>

      {s.fridge.length === 0 ? (
        <div className="mt-6">
          <Empty icon={<Refrigerator size={48} />} title="Отметьте, что есть дома" mood="fridge"
            actions={<>
              <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={18} />Добавить продукты</button>
              <button className="btn-outline" onClick={() => setReceipt(true)}><ScanText size={18} />Добавить по чеку</button>
            </>}>
            Шеф будет подбирать рецепты из ваших продуктов, считать, что докупить, и напоминать о сроках — чтобы ничего не выбрасывать.
          </Empty>
        </div>
      ) : (
        <>
          {/* What spoils within three days goes into the dishes first (куриное филе «ещё 2 дня» was left out of four
              potato dishes); with nothing urgent, everything at home. */}
          <button onClick={() => { const urgent = s.fridge.filter((f) => { const d = daysLeft(f); return d != null && d >= 0 && d <= 3; }).sort((p, q) => (p.until ?? 0) - (q.until ?? 0)).slice(0, 2).map((f) => f.id); cookFromHome(urgent.length ? urgent : undefined); }} className="mt-5 flex w-full items-center gap-3 rounded-card bg-brand-soft p-4 text-left transition-transform active:scale-[.99]">
            <ChefAvatar size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-title text-brand-ink">Что приготовить из этого?</span>
              <span className="block text-small text-ink-soft">Шеф подберёт блюда из ваших продуктов</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-ink-faint" aria-hidden />
          </button>
          {remindHint && reminders.supported && !reminders.on && s.fridge.some((f) => f.until != null) && (
            <div className="mt-3 flex items-start gap-3 rounded-card border border-line bg-card p-4">
              <Bell size={20} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium">Напомнить, пока не испортилось?</p>
                <p className="mt-0.5 text-small text-ink-soft">Вечером в 17:30 подскажу, что пора использовать и что из этого приготовить.</p>
                <button className="btn-soft mt-3 h-10" onClick={async () => {
                  remindSeen();
                  try { await reminders.enable("17:30", s.reminders.weekly); toast("Готово: напомню в 17:30"); }
                  catch (e) { toast(e instanceof Error ? e.message : "Не получилось включить напоминания"); }
                }}>Напоминать</button>
              </div>
              <button className="icon-btn -mr-2 -mt-2" onClick={remindSeen} aria-label="Не надо"><X size={18} /></button>
            </div>
          )}

          {soon.length > 0 && (
            <Section title="Пора использовать" icon={<Clock size={20} className="text-warn" aria-hidden />}>
              <div className="rounded-card bg-warn-soft p-4">
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {soon.map((f) => (
                    <li key={f.id}>
                      <button className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-input bg-card px-3 text-left text-body-sm" onClick={() => setEdit(f)}>
                        <span className="truncate">{shortName(f.id)}</span>
                        <span className={cx("shrink-0 text-small font-semibold", (daysLeft(f) ?? 1) < 0 ? "text-brand" : "text-warn")}>{expiryLabel(f)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button className="btn-primary mt-3 w-full sm:w-auto" onClick={() => cookFromHome(soon.filter((f) => (daysLeft(f) ?? 0) >= 0).slice(0, 2).map((f) => f.id))}>
                  <UtensilsCrossed size={18} />Рецепты, чтобы не выбрасывать
                </button>
              </div>
            </Section>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {byAisle.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h2 className="label mb-2">{g.label}</h2>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((f) => {
                    const d = daysLeft(f);
                    return (
                      <button key={f.id} onClick={() => setEdit(f)} className={cx("chip gap-1.5", d !== null && d <= 1 && "border-warn bg-warn-soft", d !== null && d < 0 && "border-brand")}>
                        {shortName(f.id)}{f.until && d !== null && d <= 4 ? <span className="text-caption text-ink-soft">· {expiryLabel(f)}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <FreezerSection />

      <Section title="Осталось от вчера?">
        <div className="flex flex-wrap gap-2">
          {LEFTOVERS.map((l) => <Chip key={l.key} onClick={() => { void a.ask(l.phrase, { fresh: true, shown: l.label, source: "option" }); goChat(); }}>{l.label}</Chip>)}
        </div>
      </Section>

      <AddProducts open={adding} onClose={() => setAdding(false)} />
      <ReceiptImport open={receipt} onClose={() => setReceipt(false)} />
      <Sheet open={!!edit} title={edit ? shortName(edit.id) : ""} onClose={() => setEdit(null)}>
        {edit && (
          <>
            <p className="label mb-2">Годен до</p>
            <div className="flex flex-wrap gap-2">
              {EXPIRY.map(([label, days]) => <Chip key={label} onClick={() => { update((st) => ({ ...st, fridge: st.fridge.map((f) => (f.id === edit.id ? setExpiry(f, days) : f)) })); setEdit(null); }}>{label}</Chip>)}
            </div>
            <p className="mt-3 text-caption text-ink-soft">Сейчас: {expiryLabel(edit) || "без срока"}. Срок ставится сам по типу продукта — поправьте, если на упаковке другой.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn-soft" onClick={() => { cookFromHome([edit.id]); setEdit(null); }}><UtensilsCrossed size={18} />Рецепты с ним</button>
              <button className="btn-outline" onClick={() => { remove(edit.id); setEdit(null); }}><Trash2 size={18} />Закончился</button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function AddProducts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update, toast } = useStore();
  const [q, setQ] = useState("");
  const [scanning, setScanning] = useState(false);
  const scan = canScan();
  const ids = useMemo(() => ingredientOptions().map((o) => o.id).filter((id) => id !== "water"), []);
  const groups = useMemo(() => pantryGroups(), []);
  const has = (id: string) => s.fridge.some((f) => f.id === id);
  const toggle = (id: string) => update((st) => ({ ...st, fridge: has(id) ? st.fridge.filter((f) => f.id !== id) : addToFridge(st.fridge, [id]) }));
  const found = q.trim() ? searchIngredients(q, ids, 12) : [];
  return (
    <Sheet open={open} title="Что есть дома" onClose={onClose} tall
      footer={<button className="btn-primary w-full" onClick={onClose}>Готово · дома {s.fridge.length}</button>}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input className={cx("input pl-10", scan && "pr-14")} placeholder="Найти продукт" value={q} onChange={(e) => setQ(e.target.value)} />
        {scan && <button className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2" onClick={() => setScanning(true)} aria-label="Сканировать штрихкод"><ScanBarcode size={22} /></button>}
      </div>
      {scanning && <BarcodeScan onClose={() => setScanning(false)} onFound={({ id, name }) => {
        setScanning(false);
        if (id) { if (!has(id)) toggle(id); toast("Добавлено: " + shortName(id)); }
        else { if (name) setQ(name.split(/\s+/).slice(0, 2).join(" ")); toast(name ? "Не узнал «" + name + "» — выберите продукт из списка" : "Этого штрихкода нет в базе — найдите продукт поиском"); }
      }} />}
      {q.trim() ? (
        <div className="mt-3 flex flex-wrap gap-2">{found.length ? found.map((id) => <Chip key={id} on={has(id)} onClick={() => toggle(id)}>{shortName(id)}</Chip>) : <p className="text-small text-ink-soft">Такого продукта нет в рецептах.</p>}</div>
      ) : <>
        <ProductTiles className="mt-4" on={has} onToggle={toggle} />
        {groups.map((g) => (
        <div key={g.key} className="mt-4">
          <p className="label mb-2">{g.label}</p>
          <div className="flex flex-wrap gap-2">{g.items.slice(0, 14).map((i) => <Chip key={i.id} on={has(i.id)} onClick={() => toggle(i.id)}>{i.label}</Chip>)}</div>
        </div>
      ))}</>}
    </Sheet>
  );
}

function ReceiptImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update, toast } = useStore();
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[] | null>(null);
  const ids = useMemo(() => ingredientOptions().map((o) => o.id).filter((id) => id !== "water"), []);
  const close = () => { setText(""); setPicked(null); onClose(); };
  return (
    <Sheet open={open} title="Добавить из чека" onClose={close}>
      {picked === null ? (
        <>
          <p className="text-body-sm text-ink-soft">Скопируйте чек из приложения банка, «Проверки чеков» ФНС или из письма магазина и вставьте сюда. Подойдёт и обычный список продуктов.</p>
          <textarea className="input mt-3 h-auto min-h-[160px] py-3" placeholder={"СМЕТАНА 20% 300Г   89,90\nФАРШ ДОМАШНИЙ 400Г  259,00\nморковь, лук, кефир"} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary mt-3 w-full" disabled={!text.trim()} onClick={() => { const r = parseReceipt(text, ids); if (!r.length) toast("Не нашёл знакомых продуктов — попробуйте написать названия проще"); setPicked(r); }}>Найти продукты</button>
        </>
      ) : (
        <>
          <p className="text-body-sm text-ink-soft">{picked.length ? "Нашёл. Снимите лишнее и добавьте:" : "Ничего не нашлось."}</p>
          <div className="mt-3 flex flex-wrap gap-2">{picked.map((id) => <span key={id} className="chip chip-on">{shortName(id)}<button className="-mr-1 grid h-8 w-8 place-items-center rounded-full" onClick={() => setPicked((p) => p!.filter((x) => x !== id))} aria-label={"Убрать: " + shortName(id)}><X size={14} /></button></span>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => setPicked(null)}>Назад</button>
            <button className="btn-primary" disabled={!picked.length} onClick={() => { update((st) => ({ ...st, fridge: addToFridge(st.fridge, picked) })); toast("Добавлено: " + picked.length + ". Сроки поставлены по типу продуктов."); close(); }}>Добавить</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
