// «Морозилка» in «Мои продукты»: what is frozen, how many portions, how long it has been there; take a dish out
// for tomorrow (it goes into the plan), a portion now, or mark it eaten. «В морозилку» adds a dish or a product.
// The family sees the same freezer (it is synced like the plan and the list).
import { useMemo, useState } from "react";
import { Plus, Snowflake } from "lucide-react";
import { ingredientOptions, recipeById, searchIngredients, searchRecipes, shortName, type Recipe } from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { ageText, keepsText, overdue, overdueList, portionsText, useFreezer, type Frozen } from "../app/freezer";
import { RecipeImage } from "./RecipeCard";
import { Section, Sheet, Stepper, cx } from "./ui";

export function FreezerSection() {
  const { list } = useFreezer();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Frozen | null>(null);
  return (
    <Section title="Морозилка" icon={<Snowflake size={20} className="text-ink-soft" aria-hidden />} action="Добавить" onAction={() => setAdding(true)}>
      <EatSoon list={list} />
      {!list.length
        ? <button className="flex w-full items-center gap-3 rounded-card border border-dashed border-line-strong/50 p-4 text-left" onClick={() => setAdding(true)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-soft" aria-hidden><Snowflake size={20} /></span>
            <span className="text-body-sm text-ink-soft">Котлеты впрок, остаток супа, фарш — запишите, и вечером подскажу достать на завтра.</span>
          </button>
        : <div className="card divide-y divide-line overflow-hidden">
            {list.map((f) => {
              const r = f.recipeId ? recipeById(f.recipeId) : undefined;
              const old = overdue(f);
              return (
                <button key={f.id} className="flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-sunken/60" onClick={() => setOpen(f)}>
                  {r ? <RecipeImage recipe={r} className="h-11 w-11 shrink-0" rounded="rounded-[12px]" />
                    : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-sunken text-ink-soft" aria-hidden><Snowflake size={18} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-semibold">{f.title}</span>
                    <span className={cx("block text-caption", old ? "text-warn" : "text-ink-soft")}>{f.portions != null ? portionsText(f.portions) + " · " : ""}{ageText(f)}{old ? " — пора съесть" : ""}</span>
                  </span>
                </button>
              );
            })}
          </div>}
      <FreezeSheet open={adding} onClose={() => setAdding(false)} />
      <FrozenSheet item={open} onClose={() => setOpen(null)} />
    </Section>
  );
}

/** «Пора съесть»: what lies longer than it keeps, on top — take it out for tomorrow or mark it eaten. */
function EatSoon({ list }: { list: Frozen[] }) {
  const { profile, toast } = useStore();
  const fz = useFreezer();
  const old = overdueList(list);
  const f = old[0];
  if (!f) return null;
  const r = f.recipeId ? recipeById(f.recipeId) : undefined;
  const thaw = () => {
    const before = fz.snapshot;
    if (r) { fz.thaw(f, profile.eaters); toast("Переложите в холодильник — к завтрашнему ужину разморозится. В плане: «Разогреть»", { label: "Отменить", run: () => fz.restore(before) }); }
    else { fz.remove(f.id); toast("Переложите в холодильник — к завтра разморозится", { label: "Отменить", run: () => fz.restore(before) }); }
  };
  const gone = () => { const before = fz.snapshot; fz.remove(f.id); toast("Убрал из морозилки: " + f.title, { label: "Вернуть", run: () => fz.restore(before) }); };
  return (
    <div className="mb-3 rounded-card border border-warn/25 bg-warn-soft p-4">
      <p className="text-body font-semibold text-warn">Пора съесть</p>
      <p className="mt-1 text-body-sm">{f.title}{f.portions != null ? ", " + portionsText(f.portions) : ""} — {ageText(f)}, хранится {keepsText(f)}</p>
      {old.length > 1 && <p className="mt-0.5 text-caption text-ink-soft">И ещё: {old.slice(1, 4).map((x) => x.title).join(", ")}{old.length > 4 ? " и другое" : ""}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary h-10 px-4 text-small" onClick={thaw}><Snowflake size={16} aria-hidden />{r ? "Достать на завтра" : "Достать"}</button>
        <button className="btn-outline h-10 bg-card px-4 text-small" onClick={gone}>Закончились</button>
      </div>
    </div>
  );
}

/** What to do with one frozen thing. */
function FrozenSheet({ item, onClose }: { item: Frozen | null; onClose: () => void }) {
  const { profile, toast } = useStore();
  const { openRecipe } = useActions();
  const fz = useFreezer();
  const r = item?.recipeId ? recipeById(item.recipeId) : undefined;
  const gone = (f: Frozen) => { const before = fz.snapshot; fz.remove(f.id); toast("Убрал из морозилки: " + f.title, { label: "Вернуть", run: () => fz.restore(before) }); onClose(); };
  return (
    <Sheet open={!!item} title={item?.title ?? ""} onClose={onClose}>
      {item && <>
        <p className="text-body-sm text-ink-soft">{item.portions != null ? portionsText(item.portions) + " · " : ""}{ageText(item)}{overdue(item) ? " — лучше съесть в ближайшие дни" : ""}.</p>
        <div className="mt-4 grid gap-2">
          {r && <button className="btn-primary justify-start" onClick={() => {
            const before = fz.snapshot;
            fz.thaw(item, profile.eaters);
            toast("Переложите в холодильник — к завтрашнему ужину разморозится. В плане: «Разогреть»", { label: "Отменить", run: () => fz.restore(before) });
            onClose();
          }}><Snowflake size={18} aria-hidden />Достать на завтра — в план</button>}
          {item.portions != null && item.portions > 1 && <button className="btn-outline justify-start" onClick={() => { fz.take(item.id, 1); toast("Достали 1 порцию"); onClose(); }}>Достать 1 порцию сейчас</button>}
          {r && <button className="btn-outline justify-start" onClick={() => { onClose(); openRecipe(r); }}>Открыть рецепт</button>}
          <button className="btn-ghost justify-start" onClick={() => gone(item)}>Закончилось</button>
        </div>
      </>}
    </Sheet>
  );
}

/** «В морозилку»: a dish (ours or one's own) or a product, with portions for the dishes. */
export function FreezeSheet({ open, onClose, recipe }: { open: boolean; onClose: () => void; recipe?: Recipe }) {
  const { toast } = useStore();
  const fz = useFreezer();
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<{ title: string; recipeId?: string; productId?: string } | null>(null);
  const [portions, setPortions] = useState(2);
  const chosen = recipe ? { title: recipe.title, recipeId: recipe.id } : pick;
  const ids = useMemo(() => (open ? ingredientOptions().map((o) => o.id) : []), [open]);
  const dishes = q.trim().length >= 2 ? searchRecipes(q.trim()).slice(0, 4) : [];
  const products = q.trim().length >= 2 ? searchIngredients(q.trim(), ids, 4) : [];
  const close = () => { setQ(""); setPick(null); setPortions(2); onClose(); };
  const save = () => {
    if (!chosen) return;
    fz.add({ ...chosen, portions: chosen.productId ? null : portions });
    toast("В морозилке: " + chosen.title);
    close();
  };
  return (
    <Sheet open={open} title="В морозилку" onClose={close} footer={chosen ? <button className="btn-primary w-full" onClick={save}><Snowflake size={18} aria-hidden />Положить в морозилку</button> : undefined}>
      {!chosen ? <>
        <input className="input" autoFocus value={q} placeholder="Котлеты, борщ, фарш…" onChange={(e) => setQ(e.target.value)} aria-label="Что замораживаете" />
        <div className="mt-2 grid gap-1">
          {dishes.map((r) => <button key={r.id} className="flex min-h-[52px] items-center gap-3 rounded-input px-1 text-left hover:bg-sunken" onClick={() => setPick({ title: r.title, recipeId: r.id })}>
            <RecipeImage recipe={r} className="h-10 w-10 shrink-0" rounded="rounded-[10px]" /><span className="text-body-sm">{r.title}</span></button>)}
          {products.map((id) => <button key={id} className="flex min-h-[48px] items-center gap-3 rounded-input px-2 text-left text-body-sm hover:bg-sunken" onClick={() => setPick({ title: shortName(id), productId: id })}>
            <Snowflake size={18} className="shrink-0 text-ink-soft" aria-hidden />{shortName(id)}</button>)}
          {q.trim() && <button className="flex min-h-[44px] items-center gap-2 rounded-input px-2 text-left text-body-sm text-brand hover:bg-sunken" onClick={() => setPick({ title: q.trim().slice(0, 60) })}>
            <Plus size={16} aria-hidden />Записать «{q.trim()}»</button>}
        </div>
      </> : <>
        <p className="text-body font-semibold">{chosen.title}</p>
        {!recipe && <button className="text-body-sm text-brand" onClick={() => setPick(null)}>Другое</button>}
        {!chosen.productId && <div className="mt-4 flex items-center justify-between gap-3"><span className="text-body-sm">Сколько порций</span><Stepper value={portions} min={1} max={30} onChange={setPortions} label="Порций" /></div>}
        <p className="mt-3 text-caption text-ink-faint">Вечером, когда на завтра нет ужина, подскажу достать. Морозилку видит вся семья.</p>
      </>}
    </Sheet>
  );
}
