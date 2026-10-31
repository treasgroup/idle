// «Покупки»: the list by shop aisle. A tap on the row marks it bought; bought items move into «Мои продукты» in one go.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlaceHint } from "../components/PlaceHint";
import { hintDone } from "../app/hints";
import { BookOpen, Check, ChevronDown, ChevronRight, Mic, MoreHorizontal, Plus, Square, Share2, ShoppingBag, ShoppingBasket, Refrigerator, Truck, Trash2, CalendarDays } from "lucide-react";
import {
  addToFridge, apiUrl, copyText, formatAmount, groupShopping, ingredientOptions, plural, searchIngredients,
  recipes, shortName, useVoiceInput, weekDays, type ShoppingItem,
} from "../engine";
import { withWeek } from "../app/planShopping";
import { useStore } from "../app/store";
import { shopLine } from "../app/amounts";
import { listText } from "../app/shoppingShare";
import { LIQUID, splitList } from "../app/typedList";
import { dishesInList, removeDish, type ListDish } from "../app/shoppingDishes";
import { useActions } from "../app/actions";
import { replace, routeHash } from "../app/router";
import { Empty, Sheet, cx, haptic } from "../components/ui";
import { ShareOptions } from "../components/ShareOptions";
import { printText } from "../app/print";
import { cue } from "../app/feedback";
import { StoreMode } from "../components/StoreMode";

interface Partner { id: string; label: string; note?: string }

// What nearly every kitchen has: 25 г of flour or 30 г of sour cream is checked at home, not bought.
const STAPLES = new Set(["wheat-flour", "sugar", "salt", "vegetable-oil", "butter", "sour-cream", "potato-starch", "corn-starch", "breadcrumbs",
  "table-vinegar-9", "soy-sauce", "tomato-paste", "mayonnaise", "honey", "tomato-ketchup", "prepared-mustard", "baking-powder", "baking-soda",
  "vanilla-sugar", "cocoa-powder", "milk", "kefir", "semolina"]);
/** Spices and other pinches, and a little of the staples: most homes have them, so they are checked at home rather than bought. */
const isPinch = (i: ShoppingItem) => {
  const g = i.unit === "г" || i.unit === "мл";
  return (g && i.amount > 0 && i.amount < 5) || (STAPLES.has(i.ingredientId) && ((g && i.amount <= 50) || /^(ч|ст)\. л\.$/.test(i.unit)));
};
const products = (n: number) => n + " " + plural(n, "продукт", "продукта", "продуктов");

export function Shopping() {
  const { s, update, toast, online, clearToast, catalog } = useStore();
  // «Продукты на неделю — в списке покупок · Открыть» has done its job once the list is open: it must not cover it.
  useEffect(() => clearToast(), [clearToast]);
  const [adding, setAdding] = useState(false);
  const [share, setShare] = useState(false);
  const [clear, setClear] = useState(false);
  const [more, setMore] = useState<ShoppingItem | null>(null);
  const [dish, setDish] = useState<ListDish | null>(null);
  const [allDishes, setAllDishes] = useState(false);
  const { openRecipe } = useActions();
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
  // «Для блюд»: back to a recipe the list was filled from, by its name rather than from memory.
  // Recomputed when the catalog arrives: on a fresh start the list is there before the recipes are.
  const dishes = useMemo(() => dishesInList(s.shopping), [s.shopping, catalog.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const bought = s.shopping.filter((i) => i.checked);
  // The plan's days from today with at least one dish.
  const week = weekDays(s.menu);
  const planned = week.some((d) => d.items.length > 0);
  // Dishes of the week whose products are not in the list yet (bought ones count as there).
  const missingPlan = useMemo(() => {
    const inList = new Set(s.shopping.flatMap((i) => [...Object.keys(i.parts ?? {}), ...(i.recipes ?? []).map((t) => recipes().find((r) => r.title === t)?.id ?? "")]));
    return new Set(week.flatMap((d) => d.items.filter((it) => !it.leftover).map((it) => it.recipeId)).filter((id) => !inList.has(id))).size;
  }, [s.shopping, week]); // eslint-disable-line react-hooks/exhaustive-deps
  // A dish whose products are all at home adds no rows: once pressed, the row goes until the screen is opened again.
  const [taken, setTaken] = useState(false);
  const fromPlan = () => { update((st) => ({ ...st, shopping: withWeek(st, week) })); setTaken(true); toast("Продукты на неделю — в списке покупок"); };
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
  }, [bought.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const toPantry = () => {
    const ids = bought.map((i) => i.ingredientId).filter((id) => !id.startsWith("custom-"));
    const before = s;
    update((st) => ({ ...st, fridge: addToFridge(st.fridge, ids), shopping: st.shopping.filter((i) => !i.checked) }));
    toast("Перенесено в «Мои продукты» — напомню, что пора использовать", { label: "Отменить", run: () => update((st) => ({ ...st, fridge: before.fridge, shopping: before.shopping })) });
  };

  const order = async (p: Partner) => {
    await copyText(listText(s.shopping));
    toast("Список скопирован — вставьте его в поиск или корзину магазина");
    window.open(apiUrl("go") + "&to=" + encodeURIComponent(p.id), "_blank", "noopener");
  };

  const remove = (i: ShoppingItem) => withUndo("Удалено из списка", (l) => l.filter((x) => x.key !== i.key));
  // One line: the product on the left, how much to take on the right. «Нужно 250 г» under «Лук · 3 шт.» only
  // puzzled in the shop: it stays where a whole pack is bought for less. Remove: swipe left (or «…» with a mouse).
  const row = (i: ShoppingItem) => {
    const line = shopLine(i);
    const name = line.name;
    return (
      <SwipeRow key={i.key} label={name} onDelete={() => remove(i)}>
        <button className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 py-2 pl-3 pr-3 text-left" onClick={() => toggle(i.key)} aria-pressed={i.checked}
          aria-label={(i.checked ? "Куплено: " : "Купить: ") + name + " · " + line.text}>
          <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors", i.checked ? "border-herb bg-herb text-white" : "border-line-strong")}>
            {i.checked && <Check size={14} strokeWidth={3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cx("block text-body-sm", i.checked && "text-ink-faint line-through")}>{name}</span>
            {!i.checked && line.pack && line.need && <span className="block truncate text-caption text-ink-soft">{line.need}</span>}
          </span>
          <span className={cx("shrink-0 whitespace-nowrap text-body-sm", i.checked ? "text-ink-faint" : "text-ink-soft")}>{line.text}</span>
        </button>
        <span className="hidden shrink-0 [@media(hover:hover)]:block">
          <button className="icon-btn mr-1 text-ink-soft" onClick={() => setMore(i)} aria-label={"Ещё: " + name}><MoreHorizontal size={18} /></button>
        </span>
      </SwipeRow>
    );
  };

  return (
    <div className="pt-4 sm:pt-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 whitespace-nowrap text-h1">Покупки{toBuy.length - pinches.length > 0 && <span className="font-medium text-ink-soft"><span className="sr-only">, осталось купить</span> · {toBuy.length - pinches.length}</span>}</h1>
        <div className="flex shrink-0 items-center gap-0.5">
          {s.shopping.length > 0 && <button className="icon-btn" onClick={() => setShare(true)} aria-label="Отправить список"><Share2 size={20} /></button>}
          <button className="btn-soft px-4" onClick={() => setAdding(true)}><Plus size={18} />Добавить</button>
        </div>
      </div>
      {s.shopping.length > 0 && !toBuy.length && <p className="mt-1 text-body-sm text-ink-soft">Всё куплено</p>}

      {toBuy.length > 0 && <PlaceHint id="shopping" className="mt-3" text="Нажмите на продукт, когда положили его в корзину. Смахните влево — удалить." />}
      {/* The shop mode and «Для блюд» side by side: the list itself starts on the first screen. */}
      {(toBuy.length > 0 || dishes.length > 0) && (
        <div className="mt-3 flex gap-2">
          {toBuy.length > 0 && <button className="chip chip-on" onClick={() => setStore(true)}><ShoppingBasket size={18} aria-hidden />Я в магазине</button>}
          {dishes.length > 0 && (
            <button className="chip min-w-0" onClick={() => (dishes.length === 1 ? setDish(dishes[0]) : setAllDishes(true))}>
              <span className="truncate">{dishes.length === 1 ? "Для: " + dishes[0].title : "Для " + dishes.length + " " + plural(dishes.length, "блюда", "блюд", "блюд")}</span>
              <ChevronRight size={16} className="shrink-0 text-ink-soft" aria-hidden />
            </button>
          )}
        </div>
      )}
      {/* The plan's products when the list already has bread and milk: the button was only in an empty list. */}
      {s.shopping.length > 0 && missingPlan > 0 && !taken && (
        <button className="mt-3 flex min-h-[48px] w-full items-center gap-2 rounded-card border border-dashed border-line-strong/60 px-3 py-2 text-left text-body-sm hover:border-line-strong" onClick={fromPlan}>
          <CalendarDays size={18} className="shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1">Добавить продукты из плана на неделю <span className="text-ink-soft">· {missingPlan} {plural(missingPlan, "блюдо", "блюда", "блюд")}</span></span>
          <Plus size={18} className="shrink-0 text-ink-soft" aria-hidden />
        </button>
      )}
      {store && <StoreMode items={s.shopping} onToggle={toggle} onToPantry={toPantry} onClose={() => setStore(false)} />}

      {s.shopping.length === 0 ? (
        <div className="mt-6">
          <Empty icon={<ShoppingBag size={48} />} title="Список покупок пуст" mood="shopping"
            actions={planned ? <>
              {/* A plan is there already: its products in one tap, not a trip to the plan for its «В покупки». */}
              <button className="btn-primary" onClick={fromPlan}><CalendarDays size={18} />Взять продукты из плана</button>
              <button className="btn-outline" onClick={() => setAdding(true)}><Plus size={18} />Добавить продукт</button>
            </> : <>
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
                <ul className="card divide-y divide-line overflow-hidden">{g.items.map(row)}</ul>
              </section>
            ))}
          </div>

          {pinches.length > 0 && (
            <Collapsible title={"Скорее всего, есть дома · " + pinches.length} open={showPinch} onToggle={() => setShowPinch((v) => !v)}
              hint={[...new Set(pinches.map((i) => shopLine(i).name))].slice(0, 3).join(", ") + (pinches.length > 3 ? "…" : "") + " Проверьте перед выходом"}>
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
          <button className="btn-ghost mt-6 text-ink-soft" onClick={() => (bought.length ? setClear(true) : withUndo("Список очищен", () => []))}><Trash2 size={18} />Очистить список</button>
          <div className={bought.length ? "h-24" : "h-6"} aria-hidden />

          {/* Only when something is ticked: what to do with it. No standing explanation at the bottom. */}
          {bought.length > 0 && (
            <div ref={bar} className="fixed inset-x-0 z-20 border-t border-line bg-paper/95 backdrop-blur sm:left-20 lg:left-64" style={{ bottom: "var(--nav-h)" }}>
              <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 sm:px-6 lg:max-w-[1200px] lg:px-8">
                <button className="btn-primary min-w-0 flex-1 sm:flex-none" onClick={toPantry}><Refrigerator size={18} /><span className="truncate">Куплено {bought.length} · в «Мои продукты»</span></button>
              </div>
            </div>
          )}
        </>
      )}

      <AddItem open={adding} onClose={() => setAdding(false)} onAdd={(item) => set((l) => [...l, item])} />
      <Sheet open={share} title="Отправить список" onClose={() => setShare(false)}>
        <ShareOptions title="Список покупок" text={listText(s.shopping)} onDone={() => setShare(false)} onPrint={() => printText("Список покупок", listText(s.shopping))} />
      </Sheet>
      <Sheet open={clear} title="Очистить список?" onClose={() => setClear(false)}>
        <div className="grid gap-2">
          {bought.length > 0 && <button className="btn-outline" onClick={() => { withUndo("Купленное убрано", (l) => l.filter((x) => !x.checked)); setClear(false); }}>Убрать только купленное · {bought.length}</button>}
          <button className="btn-outline border-brand text-brand" onClick={() => { withUndo("Список очищен", () => []); setClear(false); }}>Очистить весь список</button>
          <button className="btn-ghost" onClick={() => setClear(false)}>Отмена</button>
        </div>
      </Sheet>
      <Sheet open={allDishes && !dish} title={"Для блюд · " + dishes.length} onClose={() => setAllDishes(false)}>
        <ul className="card divide-y divide-line">
          {dishes.map((d) => (
            <li key={d.id}>
              <button className="flex min-h-[52px] w-full items-center gap-2 px-4 py-2 text-left" onClick={() => setDish(d)}>
                <span className="min-w-0 flex-1 text-body-sm">{d.title}</span>
                <span className="shrink-0 text-caption text-ink-soft">{products(d.rows)}</span>
                <ChevronRight size={16} className="shrink-0 text-ink-soft" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      <Sheet open={!!dish} title={dish?.title ?? ""} onClose={() => setDish(null)}>
        {dish && (
          <div className="grid gap-2">
            <p className="mb-1 text-small text-ink-soft">В списке {products(dish.rows)} для этого блюда.</p>
            <button className="btn-outline justify-start" onClick={() => { const id = dish.id; setDish(null); setAllDishes(false); openRecipe(id); }}><BookOpen size={18} />Открыть рецепт</button>
            <button className="btn-outline justify-start text-brand" onClick={() => { const d = dish; withUndo("Продукты блюда убраны из списка", (l) => removeDish(l, d)); setDish(null); }}><Trash2 size={18} />Убрать его продукты из списка</button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!more} title={more ? shopLine(more).name : ""} onClose={() => setMore(null)}>
        {more && (
          <div className="grid gap-2">
            {!!more.recipes?.length && <p className="mb-1 text-small text-ink-soft">{formatAmount(more.amount, more.unit)} · для: {more.recipes.join(", ")}</p>}
            <button className="btn-outline justify-start" onClick={() => { toggle(more.key); setMore(null); }}><Check size={18} />{more.checked ? "Вернуть в список" : "Отметить купленным"}</button>
            <button className="btn-outline justify-start text-brand" onClick={() => { remove(more); setMore(null); }}><Trash2 size={18} />Удалить</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** A list row that moves left under the finger and shows «Удалить», like a phone's mail. A mouse never swipes: it has «…». */
function SwipeRow({ label, onDelete, children }: { label: string; onDelete: () => void; children: React.ReactNode }) {
  const W = 96;
  const [dx, setDxState] = useState(0);
  // The latest offset for pointerup: moves can come faster than renders.
  const at = useRef(0);
  const setDx = (v: number) => { at.current = v; setDxState(v); };
  const [open, setOpen] = useState(false);
  const drag = useRef<{ x: number; y: number; base: number; on: boolean } | null>(null);
  // A swipe ends with a click on the row: it must not tick the product.
  const swiped = useRef(false);
  const shut = () => { setOpen(false); setDx(0); };
  return (
    <li className="relative overflow-hidden">
      {/* Only while the row is moved: behind a still row its red edge would show at the corners. */}
      <button className={cx("absolute inset-y-0 right-0 place-items-center bg-brand-fill text-body-sm font-semibold text-white", dx < 0 ? "grid" : "hidden")} style={{ width: W }}
        tabIndex={open ? 0 : -1} aria-hidden={!open} onClick={() => { shut(); onDelete(); }} aria-label={"Удалить: " + label}>Удалить</button>
      <div className={cx("relative flex items-center bg-card", !drag.current?.on && "transition-transform duration-200")} style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        onPointerDown={(e) => { if (e.pointerType !== "mouse") drag.current = { x: e.clientX, y: e.clientY, base: open ? -W : 0, on: false }; swiped.current = false; }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const mx = e.clientX - d.x, my = e.clientY - d.y;
          if (!d.on) {
            if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { drag.current = null; return; }
            if (Math.abs(mx) < 10) return;
            d.on = swiped.current = true;
          }
          setDx(Math.min(0, Math.max(-W * 1.4, d.base + mx)));
        }}
        onPointerUp={() => { if (drag.current?.on) { const o = at.current < -W / 2; setOpen(o); setDx(o ? -W : 0); } drag.current = null; }}
        onPointerCancel={() => { drag.current = null; setDx(open ? -W : 0); }}
        onClickCapture={(e) => { if (swiped.current || open) { e.stopPropagation(); e.preventDefault(); swiped.current = false; if (open && !drag.current) shut(); } }}>
        {children}
      </div>
    </li>
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
