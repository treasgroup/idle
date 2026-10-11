import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Share2, Trash2, ShoppingBag, Refrigerator, Truck, X } from "lucide-react";
import {
  addToFridge, apiUrl, copyText, formatAmount, groupShopping, ingredientOptions, packageHint, searchIngredients, shoppingName, shoppingText,
  shortName, type ShoppingItem,
} from "../engine";
import { useStore } from "../app/store";
import { Empty, Sheet, cx } from "../components/ui";
import { ShareOptions } from "./RecipeLayer";

interface Partner { id: string; label: string; note?: string }

export function Shopping() {
  const { s, update, toast, online } = useStore();
  const [adding, setAdding] = useState(false);
  const [share, setShare] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => {
    if (!online) return;
    fetch(apiUrl("partners")).then((r) => (r.ok ? r.json() : { partners: [] })).then((j) => setPartners(Array.isArray(j.partners) ? j.partners : [])).catch(() => {});
  }, [online]);

  const groups = useMemo(() => groupShopping(s.shopping), [s.shopping]);
  const left = s.shopping.filter((i) => !i.checked).length;
  const bought = s.shopping.filter((i) => i.checked);
  const set = (fn: (l: ShoppingItem[]) => ShoppingItem[]) => update((st) => ({ ...st, shopping: fn(st.shopping) }));

  const toPantry = () => {
    const ids = bought.map((i) => i.ingredientId).filter((id) => !id.startsWith("custom-"));
    update((st) => ({ ...st, fridge: addToFridge(st.fridge, ids), shopping: st.shopping.filter((i) => !i.checked) }));
    toast("Купленное — в «Дома», сроки проставлены. Напомню, что пора использовать.");
  };

  const order = async (p: Partner) => {
    await copyText(shoppingText(s.shopping));
    toast("Список скопирован — вставьте его в поиск или корзину магазина");
    window.open(apiUrl("go") + "&to=" + encodeURIComponent(p.id), "_blank", "noopener");
  };

  return (
    <div className="pb-8">
      <div className="flex items-end justify-between gap-3 px-4 pt-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Покупки</h1>
          <p className="text-sm text-ink-soft">{s.shopping.length ? (left ? "Осталось купить: " + left : "Всё куплено 🎉") : "Список пуст"}</p>
        </div>
        <div className="flex">
          {s.shopping.length > 0 && <button className="btn-ghost px-2" onClick={() => setShare(true)} aria-label="Отправить список"><Share2 size={20} /></button>}
          <button className="btn-ghost px-2" onClick={() => setAdding(true)} aria-label="Добавить продукт"><Plus size={22} /></button>
        </div>
      </div>

      {s.shopping.length === 0 ? (
        <Empty icon={<ShoppingBag size={32} />} title="Список покупок пуст">
          Нажмите «Докупить» в рецепте или «В покупки» в меню на неделю — продукты сложатся по отделам магазина, с подсказкой, сколько упаковок брать.
        </Empty>
      ) : (
        <>
          {bought.length > 0 && (
            <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl2 bg-herb-soft p-3">
              <Refrigerator className="shrink-0 text-herb" />
              <span className="min-w-0 flex-1 text-sm">Куплено {bought.length}. Перенести в «Дома»? Подскажу, что приготовить, и напомню о сроках.</span>
              <button className="btn-primary bg-herb px-3 py-2" onClick={toPantry}>Перенести</button>
            </div>
          )}
          <div className="mt-4 space-y-5 px-4">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="label mb-1.5">{g.label}</h2>
                <ul className="card divide-y divide-line/60">
                  {g.items.map((i) => {
                    const hint = !i.checked ? packageHint(i.ingredientId, i.amount, i.unit) : null;
                    return (
                      <li key={i.key} className="flex items-center gap-3 px-3 py-2.5">
                        <button className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border", i.checked ? "border-herb bg-herb text-white" : "border-line")}
                          onClick={() => set((l) => l.map((x) => (x.key === i.key ? { ...x, checked: !x.checked } : x)))} aria-label={i.checked ? "Вернуть в список" : "Куплено"} aria-pressed={i.checked}>
                          {i.checked && <Check size={14} />}
                        </button>
                        <div className={cx("min-w-0 flex-1", i.checked && "text-ink-faint line-through")}>
                          <div className="text-[15px]">{shoppingName(i.ingredientId, i.name)} <span className="text-ink-soft">— {formatAmount(i.amount, i.unit)}</span></div>
                          {(hint || i.recipes?.length) && <div className="truncate text-xs text-ink-faint">{hint ? "🛒 " + hint : ""}{hint && i.recipes?.length ? " · " : ""}{i.recipes?.slice(0, 2).join(", ")}</div>}
                        </div>
                        <button className="p-1.5 text-ink-faint" onClick={() => set((l) => l.filter((x) => x.key !== i.key))} aria-label="Удалить"><X size={16} /></button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2 px-4">
            {bought.length > 0 && <button className="btn-ghost text-sm" onClick={() => set((l) => l.filter((x) => !x.checked))}><Trash2 size={15} /> Убрать купленное</button>}
            <button className="btn-ghost text-sm" onClick={() => { if (confirm("Очистить весь список?")) set(() => []); }}><Trash2 size={15} /> Очистить всё</button>
          </div>
          {partners.length > 0 && left > 0 && (
            <div className="mx-4 mt-6">
              <div className="label mb-2 flex items-center gap-1.5"><Truck size={14} /> Заказать с доставкой</div>
              <div className="grid grid-cols-2 gap-2">
                {partners.map((p) => <button key={p.id} className="btn-outline justify-start" onClick={() => order(p)}>{p.label}</button>)}
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">Список скопируется — останется вставить его в магазине. Реклама.</p>
            </div>
          )}
        </>
      )}

      <AddItem open={adding} onClose={() => setAdding(false)} onAdd={(item) => set((l) => [...l, item])} />
      <Sheet open={share} title="Отправить список" onClose={() => setShare(false)}>
        <ShareOptions title="Список покупок" text={shoppingText(s.shopping)} onDone={() => setShare(false)} />
      </Sheet>
    </div>
  );
}

function AddItem({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (i: ShoppingItem) => void }) {
  const [q, setQ] = useState("");
  const [amount, setAmount] = useState("");
  const ids = useMemo(() => ingredientOptions().map((o) => o.id).filter((id) => id !== "water"), []);
  const found = q.trim() ? searchIngredients(q, ids, 8) : [];
  const add = (ingredientId: string, name: string) => {
    const m = amount.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    onAdd({ key: crypto.randomUUID(), ingredientId, name, amount: m ? Number(m[1].replace(",", ".")) || 1 : 1, unit: m ? m[2].trim() || "шт." : "шт.", checked: false });
    setQ(""); setAmount(""); onClose();
  };
  return (
    <Sheet open={open} title="Добавить в список" onClose={onClose}>
      <input className="input" placeholder="Что купить? Например, кефир" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <input className="input mt-2" placeholder="Сколько? Например, 1 л или 2 шт." value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div className="mt-3 space-y-1.5">
        {found.map((id) => <button key={id} className="card w-full px-3.5 py-2.5 text-left" onClick={() => add(id, shortName(id))}>{shortName(id)}</button>)}
        {q.trim() && <button className="btn-soft w-full" onClick={() => add("custom-" + Date.now().toString(36), q.trim())}>Добавить «{q.trim()}»</button>}
      </div>
    </Sheet>
  );
}
