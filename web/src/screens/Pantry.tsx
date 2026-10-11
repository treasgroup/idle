import { useMemo, useState } from "react";
import { Plus, Receipt, Search, Sparkles, X, Refrigerator } from "lucide-react";
import {
  AISLES, LEFTOVERS, aisleOf, addToFridge, daysLeft, expiringSoon, expiryLabel, freshConditions, ingredient, ingredientOptions, pantryGroups,
  searchIngredients, setExpiry, shortName, type FridgeItem,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { useAssistant } from "../app/assistant";
import { replace, routeHash } from "../app/router";
import { Chip, Empty, Section, Sheet, cx } from "../components/ui";

const EXPIRY = [["Сегодня", 0], ["Завтра", 1], ["3 дня", 3], ["Неделя", 7], ["Месяц", 30], ["Без срока", null]] as const;

/** Picks product names out of a pasted receipt or a free list: "СМЕТАНА 20% 300Г  89,90" → sour cream. */
export function parseReceipt(text: string, ids: string[]): string[] {
  const found = new Set<string>();
  for (const raw of text.split(/\n|;|,(?!\d)/)) {
    const line = raw.toLowerCase().replace(/ё/g, "е")
      .replace(/\d+([.,]\d+)?\s*(%|кг|г|гр|мл|л|шт|уп|x|х|\*|руб|р\.?|₽)?/g, " ")
      .replace(/[^а-яa-z\s-]/g, " ").replace(/\s+/g, " ").trim();
    if (line.length < 3 || /^(итог|итого|сумма|ндс|кассир|чек|скидк|оплат|безнал|наличн|сдача|смена|инн|фн|фд|фп|спасибо|пакет)/.test(line)) continue;
    const words = line.split(" ").filter((w) => w.length >= 3);
    for (const w of words.slice(0, 3)) {
      const hit = searchIngredients(w, ids, 1)[0];
      if (hit) { found.add(hit); break; }
    }
  }
  return [...found];
}

export function Pantry() {
  const { s, update } = useStore();
  const { openRecipe } = useActions();
  const a = useAssistant(openRecipe);
  const [adding, setAdding] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [edit, setEdit] = useState<FridgeItem | null>(null);
  const soon = useMemo(() => expiringSoon(s.fridge), [s.fridge]);
  const byAisle = useMemo(() => AISLES.map((x) => ({ ...x, items: s.fridge.filter((f) => aisleOf({ ingredientId: f.id, name: ingredient(f.id)?.name ?? f.id }) === x.key) }))
    .filter((g) => g.items.length).map((g) => ({ ...g, items: [...g.items].sort((p, q) => (p.until ?? Infinity) - (q.until ?? Infinity)) })), [s.fridge]);

  const cookFromHome = (focus?: string[]) => {
    const ids = s.fridge.map((f) => f.id);
    const c = { ...freshConditions({ servings: s.conditions.servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), available: ids, ...(focus ? { desired: focus } : { strictPantry: ids.length >= 4 }) };
    a.show(focus ? "Использовать: " + focus.map((id) => shortName(id).toLowerCase()).join(", ") : "Из того, что дома", c, focus ? "Вот что приготовить, чтобы продукты не пропали:" : "Вот что можно приготовить из того, что есть:");
    replace(routeHash({ tab: "home" }));
  };

  return (
    <div className="pb-8">
      <div className="flex items-end justify-between gap-3 px-4 pt-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Дома</h1>
          <p className="text-sm text-ink-soft">{s.fridge.length ? s.fridge.length + " продуктов · подбираю рецепты из них" : "Что есть в холодильнике и шкафу"}</p>
        </div>
        <div className="flex">
          <button className="btn-ghost px-2" onClick={() => setReceipt(true)} aria-label="Добавить из чека"><Receipt size={20} /></button>
          <button className="btn-ghost px-2" onClick={() => setAdding(true)} aria-label="Добавить продукты"><Plus size={22} /></button>
        </div>
      </div>

      {s.fridge.length > 0 && <div className="px-4 pt-3"><button className="btn-primary w-full py-3 text-base" onClick={() => cookFromHome()}><Sparkles size={18} /> Что приготовить из этого?</button></div>}

      {soon.length > 0 && (
        <Section title="🆘 Пора использовать">
          <div className="mx-4 rounded-xl2 bg-warn-soft p-3">
            <div className="flex flex-wrap gap-1.5">{soon.map((f) => <span key={f.id} className="rounded-full bg-card px-2.5 py-1 text-sm">{shortName(f.id)} · <b className={cx((daysLeft(f) ?? 1) < 0 && "text-brand")}>{expiryLabel(f)}</b></span>)}</div>
            <button className="btn-soft mt-3 w-full bg-card" onClick={() => cookFromHome(soon.filter((f) => (daysLeft(f) ?? 0) >= 0).slice(0, 2).map((f) => f.id))}>Рецепты, чтобы не выбрасывать</button>
          </div>
        </Section>
      )}

      {s.fridge.length === 0 ? (
        <>
          <Empty icon={<Refrigerator size={32} />} title="Отметьте, что есть дома">
            Буду подбирать рецепты из ваших продуктов, считать, что докупить, и напоминать о сроках — чтобы ничего не выбрасывать.
          </Empty>
          <div className="mt-4 grid grid-cols-2 gap-2 px-4">
            <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={17} /> Добавить</button>
            <button className="btn-outline" onClick={() => setReceipt(true)}><Receipt size={17} /> Из чека</button>
          </div>
        </>
      ) : (
        <div className="mt-5 space-y-5 px-4">
          {byAisle.map((g) => (
            <section key={g.key}>
              <h2 className="label mb-1.5">{g.label}</h2>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((f) => {
                  const d = daysLeft(f);
                  return (
                    <button key={f.id} onClick={() => setEdit(f)} className={cx("chip", d !== null && d <= 1 && "border-warn bg-warn-soft", d !== null && d < 0 && "border-brand")}>
                      {shortName(f.id)}{f.until ? <span className="text-xs text-ink-faint">· {expiryLabel(f)}</span> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Section title="Осталось от вчера?">
        <div className="scroll-x px-4">
          {LEFTOVERS.map((l) => <Chip key={l.key} onClick={() => { void a.ask(l.phrase, { shown: l.icon + " " + l.label, source: "option" }); replace(routeHash({ tab: "home" })); }}>{l.icon} {l.label}</Chip>)}
        </div>
      </Section>

      <AddProducts open={adding} onClose={() => setAdding(false)} />
      <ReceiptImport open={receipt} onClose={() => setReceipt(false)} />
      <Sheet open={!!edit} title={edit ? shortName(edit.id) : ""} onClose={() => setEdit(null)}>
        {edit && (
          <>
            <div className="label mb-2">Годен до</div>
            <div className="flex flex-wrap gap-2">
              {EXPIRY.map(([label, days]) => <Chip key={label} onClick={() => { update((st) => ({ ...st, fridge: st.fridge.map((f) => (f.id === edit.id ? setExpiry(f, days) : f)) })); setEdit(null); }}>{label}</Chip>)}
            </div>
            <p className="mt-2 text-xs text-ink-faint">Сейчас: {expiryLabel(edit) || "без срока"}. Срок ставится сам по типу продукта — поправьте, если на упаковке другой.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-soft" onClick={() => { cookFromHome([edit.id]); setEdit(null); }}>Рецепты с ним</button>
              <button className="btn-outline" onClick={() => { update((st) => ({ ...st, fridge: st.fridge.filter((f) => f.id !== edit.id) })); setEdit(null); }}>Закончился</button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function AddProducts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update } = useStore();
  const [q, setQ] = useState("");
  const ids = useMemo(() => ingredientOptions().map((o) => o.id).filter((id) => id !== "water"), []);
  const groups = useMemo(() => pantryGroups(), []);
  const has = (id: string) => s.fridge.some((f) => f.id === id);
  const toggle = (id: string) => update((st) => ({ ...st, fridge: has(id) ? st.fridge.filter((f) => f.id !== id) : addToFridge(st.fridge, [id]) }));
  const found = q.trim() ? searchIngredients(q, ids, 12) : [];
  return (
    <Sheet open={open} title="Что есть дома" onClose={onClose}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input className="input pl-10" placeholder="Найти продукт" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {q.trim() ? (
        <div className="mt-3 flex flex-wrap gap-2">{found.length ? found.map((id) => <Chip key={id} on={has(id)} onClick={() => toggle(id)}>{shortName(id)}</Chip>) : <p className="text-sm text-ink-faint">Такого продукта нет в рецептах.</p>}</div>
      ) : groups.map((g) => (
        <div key={g.key} className="mt-4">
          <div className="label mb-1.5">{g.label}</div>
          <div className="flex flex-wrap gap-2">{g.items.slice(0, 14).map((i) => <Chip key={i.id} on={has(i.id)} onClick={() => toggle(i.id)}>{i.label}</Chip>)}</div>
        </div>
      ))}
      <button className="btn-primary mt-5 w-full" onClick={onClose}>Готово</button>
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
          <p className="text-sm text-ink-soft">Скопируйте чек из приложения банка, «Проверки чеков» ФНС или из письма магазина и вставьте сюда. Подойдёт и обычный список продуктов.</p>
          <textarea className="input mt-3 min-h-[160px] text-sm" placeholder={"СМЕТАНА 20% 300Г   89,90\nФАРШ ДОМАШНИЙ 400Г  259,00\nморковь, лук, кефир"} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary mt-3 w-full" disabled={!text.trim()} onClick={() => { const r = parseReceipt(text, ids); if (!r.length) toast("Не нашёл знакомых продуктов — попробуйте написать названия проще"); setPicked(r); }}>Найти продукты</button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">{picked.length ? "Нашёл. Снимите лишнее и добавьте:" : "Ничего не нашлось."}</p>
          <div className="mt-3 flex flex-wrap gap-2">{picked.map((id) => <span key={id} className="chip chip-on">{shortName(id)}<button onClick={() => setPicked((p) => p!.filter((x) => x !== id))} aria-label="Убрать"><X size={14} /></button></span>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => setPicked(null)}>Назад</button>
            <button className="btn-primary" disabled={!picked.length} onClick={() => { update((st) => ({ ...st, fridge: addToFridge(st.fridge, picked) })); toast("Добавлено: " + picked.length + ". Сроки поставлены по типу продуктов."); close(); }}>Добавить</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
