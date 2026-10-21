// «Покупки»: the list by shop aisle. A tap on the row marks it bought; bought items move into «Мои продукты» in one go.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlaceHint } from "../components/PlaceHint";
import { hintDone } from "../app/hints";
import { Check, ChevronDown, Mic, MoreHorizontal, Plus, Square, Share2, ShoppingBag, ShoppingBasket, Refrigerator, Truck, Trash2, CalendarDays } from "lucide-react";
import {
  addToFridge, apiUrl, copyText, formatAmount, groupShopping, ingredientOptions, plural, searchIngredients, shoppingText,
  shortName, useVoiceInput, type ShoppingItem,
} from "../engine";
import { useStore } from "../app/store";
import { shopLine } from "../app/amounts";
import { replace, routeHash } from "../app/router";
import { Empty, Sheet, cx, haptic } from "../components/ui";
import { ShareOptions } from "../components/ShareOptions";
import { printText } from "../app/print";
import { cue } from "../app/feedback";
import { StoreMode } from "../components/StoreMode";

interface Partner { id: string; label: string; note?: string }

/** Spices and other pinches: most homes have them, so they are checked at home rather than bought. */
const isPinch = (i: ShoppingItem) => (i.unit === "г" || i.unit === "мл") && i.amount > 0 && i.amount < 5;
const products = (n: number) => n + " " + plural(n, "продукт", "продукта", "продуктов");

export function Shopping() {
  const { s, update, toast, online, clearToast } = useStore();
  // «Продукты на неделю — в списке покупок · Открыть» has done its job once the list is open: it must not cover it.
  useEffect(() => clearToast(), [clearToast]);
  const [adding, setAdding] = useState(false);
  const [share, setShare] = useState(false);
  const [clear, setClear] = useState(false);
  const [more, setMore] = useState<ShoppingItem | null>(null);
  const [showPinch, setShowPinch] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [store, setStore] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!online) return;
    fetch(apiUrl("partners")).then((r) => (r.ok ? r.json() : { partners: [] })).then((j) => setPartners(Array.isArray(j.partners) ? j.partners : [])).catch(() => {});
  }, [online]);

  const toBuy = s.shopping.filter((i) => !i.checked);
  const groups = useMemo(() => groupShopping(toBuy.filter((i) => !isPinch(i))), [s.shopping]); // eslint-disable-line react-hooks/exhaustive-deps
  const pinches = toBuy.filter(isPinch);
  const bought = s.shopping.filter((i) => i.checked);
  const set = (fn: (l: ShoppingItem[]) => ShoppingItem[]) => update((st) => ({ ...st, shopping: fn(st.shopping) }));
  const toggle = (key: string) => {
    const item = s.shopping.find((x) => x.key === key);
    const last = !!item && !item.checked && s.shopping.filter((x) => !x.checked).length === 1;
    if (last) cue("bought"); else haptic();
    hintDone("place-shopping"); // the hint explains exactly this tap
    set((l) => l.map((x) => (x.key === key ? { ...x, checked: !x.checked } : x)));
  };
  const withUndo = (text: string, fn: (l: ShoppingItem[]) => ShoppingItem[]) => {
    const before = s.shopping;
    set(fn);
    toast(text, { label: "Отменить", run: () => update((st) => ({ ...st, shopping: before })) });
  };

  // --dock: the bar with «Перенести в Дома» sits above the nav; toasts float above it.
  useLayoutEffect(() => {
    const el = bar.current;
    const root = document.documentElement.style;
    if (!el) { root.setProperty("--dock", "0px"); return; }
    const on = () => root.setProperty("--dock", el.offsetHeight + "px");
    on();
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => { ro.disconnect(); root.setProperty("--dock", "0px"); };
  }, [s.shopping.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const toPantry = () => {
    const ids = bought.map((i) => i.ingredientId).filter((id) => !id.startsWith("custom-"));
    const before = s;
    update((st) => ({ ...st, fridge: addToFridge(st.fridge, ids), shopping: st.shopping.filter((i) => !i.checked) }));
    toast("Перенесено в «Мои продукты» — напомню, что пора использовать", { label: "Отменить", run: () => update((st) => ({ ...st, fridge: before.fridge, shopping: before.shopping })) });
  };

  const order = async (p: Partner) => {
    await copyText(shoppingText(s.shopping));
    toast("Список скопирован — вставьте его в поиск или корзину магазина");
    window.open(apiUrl("go") + "&to=" + encodeURIComponent(p.id), "_blank", "noopener");
  };

  const row = (i: ShoppingItem) => {
    const line = shopLine(i);
    const name = line.name;
    return (
      <li key={i.key} className="flex items-center">
        <button className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 py-2 pl-3 text-left" onClick={() => toggle(i.key)} aria-pressed={i.checked}
          aria-label={(i.checked ? "Куплено: " : "Купить: ") + name}>
          <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors", i.checked ? "border-herb bg-herb text-white" : "border-line-strong")}>
            {i.checked && <Check size={14} strokeWidth={3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm">
              <span className={cx(i.checked && "text-ink-faint line-through")}>{name}</span>
              {!i.checked && <span className="whitespace-nowrap text-ink-soft"> · {line.text}</span>}
            </span>
            {/* Under the name only how much is really needed when a whole pack is bought; which dishes — in «…». */}
            {!i.checked && line.need && <span className="block truncate text-caption text-ink-soft">{line.need}</span>}
          </span>
        </button>
        <button className="icon-btn mr-1 shrink-0 text-ink-soft" onClick={() => setMore(i)} aria-label={"Ещё: " + name}><MoreHorizontal size={18} /></button>
      </li>
    );
  };

  return (
    <div className="pt-4 sm:pt-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-h1">Покупки</h1>
          <p className="mt-1 text-body-sm text-ink-soft">{s.shopping.length ? (toBuy.length ? "Осталось купить: " + products(toBuy.length) : "Всё куплено") : "Список пуст"}</p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {s.shopping.length > 0 && <button className="icon-btn" onClick={() => setShare(true)} aria-label="Отправить список"><Share2 size={20} /></button>}
          <button className="btn-soft px-4" onClick={() => setAdding(true)}><Plus size={18} />Добавить</button>
        </div>
      </div>

      {toBuy.length > 0 && <PlaceHint id="shopping" className="mt-4" text="Нажимайте на продукт, когда положили его в корзину. В магазине удобнее крупный список — кнопка ниже." />}
      {toBuy.length > 0 && (
        <button className="btn-outline mt-4 w-full sm:w-auto" onClick={() => setStore(true)}>
          <ShoppingBasket size={20} className="text-brand" />Я в магазине — крупный список
        </button>
      )}
      {store && <StoreMode items={s.shopping} onToggle={toggle} onToPantry={toPantry} onClose={() => setStore(false)} />}

      {s.shopping.length === 0 ? (
        <div className="mt-6">
          <Empty icon={<ShoppingBag size={48} />} title="Список покупок пуст" mood="shopping"
            actions={<>
              <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={18} />Добавить продукт</button>
              <button className="btn-outline" onClick={() => replace(routeHash({ tab: "menu" }))}><CalendarDays size={18} />Составить план</button>
            </>}>
            Добавляйте продукты из рецепта или из плана на неделю — они сложатся по отделам магазина, с подсказкой, сколько упаковок брать.
          </Empty>
        </div>
      ) : (
        <>
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h2 className="label mb-2">{g.label}</h2>
                <ul className="card divide-y divide-line">{g.items.map(row)}</ul>
              </section>
            ))}
          </div>

          {pinches.length > 0 && (
            <Collapsible title={"Проверьте дома · " + pinches.length} hint="Специи и другое по щепотке — обычно уже есть" open={showPinch} onToggle={() => setShowPinch((v) => !v)}>
              <ul className="divide-y divide-line">{pinches.map(row)}</ul>
            </Collapsible>
          )}
          {bought.length > 0 && (
            <Collapsible title={"Уже куплено (" + bought.length + ")"} open={showBought} onToggle={() => setShowBought((v) => !v)}>
              <ul className="divide-y divide-line">{bought.map(row)}</ul>
            </Collapsible>
          )}

          {partners.length > 0 && toBuy.length > 0 && (
            <section className="mt-8">
              <h2 className="label mb-2 flex items-center gap-1.5"><Truck size={14} aria-hidden />Заказать с доставкой</h2>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {partners.map((p) => <button key={p.id} className="btn-outline" onClick={() => order(p)}>{p.label}</button>)}
              </div>
              <p className="mt-2 text-caption text-ink-soft">Список скопируется — останется вставить его в магазине. Реклама.</p>
            </section>
          )}
          <div className="h-24" aria-hidden />

          <div ref={bar} className="fixed inset-x-0 z-20 border-t border-line bg-paper/95 backdrop-blur sm:left-20 lg:left-64" style={{ bottom: "var(--nav-h)" }}>
            <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 sm:px-6 lg:max-w-[1200px] lg:px-8">
              {bought.length > 0 ? (
                <button className="btn-primary min-w-0 flex-1 sm:flex-none" onClick={toPantry}><Refrigerator size={18} /><span className="truncate"><span className="hidden sm:inline">Куплено {bought.length} · </span>В мои продукты<span className="sm:hidden"> · {bought.length}</span></span></button>
              ) : (
                <span className="flex-1 text-small text-ink-soft">Отмечайте купленное — потом перенесу его в «Мои продукты»</span>
              )}
              <button className="btn-ghost shrink-0 px-3 sm:px-5" onClick={() => (bought.length ? setClear(true) : withUndo("Список очищен", () => []))} aria-label="Очистить список"><Trash2 size={18} /><span className="hidden sm:inline">Очистить</span></button>
            </div>
          </div>
        </>
      )}

      <AddItem open={adding} onClose={() => setAdding(false)} onAdd={(item) => set((l) => [...l, item])} />
      <Sheet open={share} title="Отправить список" onClose={() => setShare(false)}>
        <ShareOptions title="Список покупок" text={shoppingText(s.shopping)} onDone={() => setShare(false)} onPrint={() => printText("Список покупок", shoppingText(s.shopping))} />
      </Sheet>
      <Sheet open={clear} title="Очистить список?" onClose={() => setClear(false)}>
        <div className="grid gap-2">
          {bought.length > 0 && <button className="btn-outline" onClick={() => { withUndo("Купленное убрано", (l) => l.filter((x) => !x.checked)); setClear(false); }}>Убрать только купленное · {bought.length}</button>}
          <button className="btn-outline border-brand text-brand" onClick={() => { withUndo("Список очищен", () => []); setClear(false); }}>Очистить весь список</button>
          <button className="btn-ghost" onClick={() => setClear(false)}>Отмена</button>
        </div>
      </Sheet>
      <Sheet open={!!more} title={more ? shopLine(more).name : ""} onClose={() => setMore(null)}>
        {more && (
          <div className="grid gap-2">
            {!!more.recipes?.length && <p className="mb-1 text-small text-ink-soft">{formatAmount(more.amount, more.unit)} · для: {more.recipes.join(", ")}</p>}
            <button className="btn-outline justify-start" onClick={() => { toggle(more.key); setMore(null); }}><Check size={18} />{more.checked ? "Вернуть в список" : "Отметить купленным"}</button>
            <button className="btn-outline justify-start text-brand" onClick={() => { const k = more.key; withUndo("Удалено из списка", (l) => l.filter((x) => x.key !== k)); setMore(null); }}><Trash2 size={18} />Удалить</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Collapsible({ title, hint, open, onToggle, children }: { title: string; hint?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="card mt-5 overflow-hidden">
      <button className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" onClick={onToggle} aria-expanded={open}>
        <span className="flex-1">
          <span className="block text-body-sm font-semibold">{title}</span>
          {hint && <span className="block text-caption text-ink-soft">{hint}</span>}
        </span>
        <ChevronDown size={20} className={cx("shrink-0 text-ink-soft transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </section>
  );
}

const LIQUID = /молок|кефир|сливк|сок|вод|масло растит|ряженк|йогурт питьев|бульон|квас|морс/i;

/** «Молоко, хлеб, десяток яиц и сметана» → four rows; each name is matched to a known product when it is clearly one. */
function splitList(text: string, ids: string[]): { ingredientId: string; name: string; amount: number; unit: string }[] {
  const UNIT: Record<string, string> = { кг: "кг", кило: "кг", килограмм: "кг", г: "г", грамм: "г", л: "л", литр: "л", литра: "л", литров: "л", мл: "мл", шт: "шт.", штук: "шт.", штуки: "шт.", пачка: "пачка", пачки: "пачка", банка: "банка", банки: "банка", бутылка: "бутылка", бутылки: "бутылка" };
  return text.split(/\s*(?:,|;|\n|\s+и\s+|\s+а ещё\s+|\s+еще\s+|\s+ещё\s+)\s*/i).map((p) => p.trim().replace(/[.!?]+$/, "")).filter((p) => p.length > 1).slice(0, 20).map((part) => {
    let amount = 1, unit = "", name = part;
    const ten = name.match(/^десяток\s+(.+)$/i);
    const lead = name.match(/^(\d+(?:[.,]\d+)?)\s*([а-яё.]+)?\s+(.+)$/i);
    const tail = name.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*([а-яё.]+)?$/i);
    if (ten) { amount = 10; unit = "шт."; name = ten[1]; }
    else if (lead) { amount = Number(lead[1].replace(",", ".")) || 1; const u = UNIT[(lead[2] ?? "").replace(/\.$/, "").toLowerCase()]; unit = u ?? ""; name = u ? lead[3] : ((lead[2] ? lead[2] + " " : "") + lead[3]); }
    else if (tail) { amount = Number(tail[2].replace(",", ".")) || 1; unit = UNIT[(tail[3] ?? "").replace(/\.$/, "").toLowerCase()] ?? ""; name = tail[1]; }
    // Said in the genitive after a number («десяток яиц», «2 пачки масла»): the usual words back to the product.
    const ALIAS: Record<string, string> = { "яиц": "яйца", "яйца": "яйца", "картошки": "картофель", "картошку": "картофель", "картошка": "картофель", "молока": "молоко", "хлеба": "хлеб", "масла": "масло", "сметаны": "сметана", "муки": "мука", "сахара": "сахар", "сыра": "сыр", "лука": "лук", "кефира": "кефир" };
    name = ALIAS[name.toLowerCase()] ?? name;
    const word = name.toLowerCase();
    const stem = word.slice(0, Math.max(3, word.length - 2));
    const hit = searchIngredients(word, ids, 5).find((id) => shortName(id).toLowerCase().startsWith(stem) || word.startsWith(shortName(id).toLowerCase().slice(0, Math.max(3, shortName(id).length - 2))));
    const label = hit ? shortName(hit) : name.charAt(0).toUpperCase() + name.slice(1);
    return { ingredientId: hit ?? "custom-" + Math.random().toString(36).slice(2, 9), name: label.slice(0, 120), amount, unit: unit || (LIQUID.test(label) ? "л" : "шт.") };
  });
}

function AddItem({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (i: ShoppingItem) => void }) {
  const { server, online, ensureSession, toast } = useStore();
  const [q, setQ] = useState("");
  const [amount, setAmount] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const ids = useMemo(() => ingredientOptions().map((o) => o.id).filter((id) => id !== "water"), []);
  const query = q.trim().toLowerCase();
  // Names that start with what was typed come first; weak fuzzy matches are dropped.
  const found = useMemo(() => {
    if (!query) return [];
    const hits = searchIngredients(query, ids, 12);
    const starts = hits.filter((id) => shortName(id).toLowerCase().startsWith(query));
    const contains = hits.filter((id) => !starts.includes(id) && shortName(id).toLowerCase().includes(query.slice(0, Math.max(3, query.length - 2))));
    return [...starts, ...contains].slice(0, 8);
  }, [query, ids]);
  const add = (ingredientId: string, name: string) => {
    const m = amount.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    const unit = m ? m[2].trim().slice(0, 40) || "шт." : LIQUID.test(name) ? "л" : "шт.";
    onAdd({ key: crypto.randomUUID(), ingredientId, name: name.slice(0, 120), amount: m ? Number(m[1].replace(",", ".")) || 1 : 1, unit, checked: false });
    setLast(name); setQ(""); setAmount("");
  };
  // A whole list at once: said aloud or typed with commas.
  const addMany = (text: string) => {
    const rows = splitList(text, ids);
    if (!rows.length) return;
    for (const r of rows) onAdd({ key: crypto.randomUUID(), checked: false, ...r });
    setLast(rows.map((r) => r.name).join(", ")); setQ(""); setAmount("");
  };
  const voice = useVoiceInput(addMany, toast, ensureSession, server.voiceReady && online);
  const listening = voice.state === "recording" || voice.state === "transcribing";
  const many = /,|\s и\s/.test(q.trim()) ? splitList(q, ids).length : 0;
  return (
    <Sheet open={open} title="Добавить в список" onClose={() => { setLast(null); onClose(); }} tall
      footer={<button className="btn-primary w-full" onClick={() => { setLast(null); onClose(); }}>Готово</button>}>
      {last && <p className="mb-3 flex items-center gap-1.5 text-small font-semibold text-herb" role="status"><Check size={16} aria-hidden />Добавлено: {last}</p>}
      <div className="flex gap-2">
        <input className="input min-w-0 flex-1" placeholder="Что купить? Например, кефир" value={listening ? voice.interim || "Слушаю… скажите списком" : q} maxLength={300} onChange={(e) => setQ(e.target.value)} readOnly={listening} autoFocus />
        <button type="button" className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-full", listening ? "listening bg-brand-fill text-white" : "bg-brand-soft text-brand")}
          onClick={() => (listening ? voice.stop() : voice.available ? voice.start() : toast("В этом браузере голосовой ввод не работает — напишите через запятую."))}
          aria-label={listening ? "Остановить" : "Сказать списком: молоко, хлеб, яйца"}>{listening ? <Square size={18} /> : <Mic size={20} />}</button>
      </div>
      {!q && !listening && <p className="mt-1.5 text-small text-ink-soft">Можно сразу списком: «молоко, хлеб, десяток яиц» — голосом или через запятую.</p>}
      <input className="input mt-2" placeholder="Сколько? Например, 1 л или 2 шт." value={amount} maxLength={40} onChange={(e) => setAmount(e.target.value)} />
      <div className="mt-3 grid gap-1.5">
        {found.map((id) => <button key={id} className="flex min-h-[48px] items-center rounded-input border border-line bg-card px-4 text-left text-body-sm hover:border-line-strong" onClick={() => add(id, shortName(id))}>{shortName(id)}</button>)}
        {many > 1 ? <button className="btn-primary" onClick={() => addMany(q)}><Plus size={18} />Добавить списком · {many}</button>
          : q.trim() && <button className="btn-soft" onClick={() => add("custom-" + Date.now().toString(36), q.trim())}><Plus size={18} />Добавить «{q.trim().slice(0, 40)}»</button>}
      </div>
    </Sheet>
  );
}
