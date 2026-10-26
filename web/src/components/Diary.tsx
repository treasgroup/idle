// «Дневник еды»: the day's calories against the person's own goal, БЖУ, what was eaten by meal, and «Добавить» —
// a dish from our recipes (a portion of ½–2), a packaged product by barcode, or anything typed by hand.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, PenLine, Plus, RotateCcw, ScanBarcode, Search, Target, X } from "lucide-react";
import { searchRecipes, type Recipe } from "../engine";
import { useStore } from "../app/store";
import {
  MEALS, PORTIONS, addEntry, again, dateKeyOf, frequent, week, entriesOn, goalOf, lookupBarcode, mealByHour, portionText, recipeEntry, removeEntry, setGoal, totals, useDiary,
  type DiaryEntry, type DiaryMeal, type Packaged,
} from "../app/diary";
import { BarcodeScan, canScan } from "./BarcodeScan";
import { RecipeImage } from "./RecipeCard";
import { Chip, Layer, Sheet, Stepper, cx } from "./ui";

const kcal = (n: number) => Math.round(n).toLocaleString("ru-RU") + " ккал";
const dayTitle = (date: string) => {
  const today = dateKeyOf(new Date()), y = dateKeyOf(new Date(Date.now() - 86400000));
  if (date === today) return "Сегодня";
  if (date === y) return "Вчера";
  return new Date(date + "T12:00").toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
};
const shift = (date: string, n: number) => { const d = new Date(date + "T12:00"); d.setDate(d.getDate() + n); return dateKeyOf(d); };

export function DiaryLayer({ onClose }: { onClose: () => void }) {
  const { profile, toast } = useStore();
  const diary = useDiary();
  const [date, setDate] = useState(() => dateKeyOf(new Date()));
  const [add, setAdd] = useState<null | "dish" | "barcode" | "manual">(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const list = entriesOn(diary, date);
  const sum = totals(list);
  const goal = goalOf(diary, profile);
  const share = Math.min(1, sum.kcal / goal);
  const isToday = date === dateKeyOf(new Date());
  // One tap: «Часто ем» and «Как вчера» write into the meal of this hour.
  const meal = mealByHour();
  const mealName = MEALS.find((m) => m.id === meal)!.label.toLowerCase();
  const fav = isToday ? frequent(diary) : [];
  const yesterday = isToday && !list.some((e) => e.meal === meal) ? entriesOn(diary, shift(date, -1)).filter((e) => e.meal === meal) : [];
  const undo = (added: DiaryEntry[]) => ({ label: "Отменить", run: () => added.forEach((e) => removeEntry(e.id)) });
  const quick = (e: DiaryEntry) => { const n = again(e, date, meal); toast("Записано на " + mealName + ": " + e.title, undo([n])); };
  const repeat = () => { const n = yesterday.map((e) => again(e, date, meal)); toast("Записано, как вчера: " + kcal(totals(n).kcal), undo(n)); };
  const remove = (e: DiaryEntry) => {
    removeEntry(e.id);
    toast("Убрано: " + e.title, { label: "Вернуть", run: () => addEntry({ ...e, date: e.date }) });
  };

  return (
    <Layer title="Дневник еды" onClose={onClose} width="max-w-xl">
      <div className="px-4 pb-12 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <button className="icon-btn -ml-2" onClick={() => setDate(shift(date, -1))} aria-label="Предыдущий день"><ChevronLeft size={22} /></button>
          <h1 className="text-h2 first-letter:uppercase">{dayTitle(date)}</h1>
          <button className="icon-btn -mr-2" disabled={isToday} onClick={() => setDate(shift(date, 1))} aria-label="Следующий день"><ChevronRight size={22} /></button>
        </div>

        <div className="card mt-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-display tabular-nums">{Math.round(sum.kcal).toLocaleString("ru-RU")}</p>
            <span className="text-body-sm text-ink-soft">из {kcal(goal)}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.round(sum.kcal)} aria-label="Калории за день">
            <div className={cx("h-full rounded-full transition-[width]", sum.kcal > goal ? "bg-warn" : "bg-herb")} style={{ width: share * 100 + "%" }} />
          </div>
          {/* The goal decides the whole bar: its own button, not a small word beside the number. */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-body-sm text-ink-soft">{sum.kcal > goal ? "Больше цели на " + kcal(sum.kcal - goal) : "Осталось " + kcal(goal - sum.kcal)}</p>
            <button className="btn-outline h-10 px-3 text-small" onClick={() => setGoalOpen(true)}><Target size={16} aria-hidden />Цель: {kcal(goal)}</button>
          </div>
          <Week diary={diary} date={date} goal={goal} onPick={setDate} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {([["Белки", sum.protein], ["Жиры", sum.fat], ["Углеводы", sum.carbs]] as const).map(([l, v]) => (
              <div key={l} className="rounded-input bg-sunken py-2"><p className="text-body font-semibold tabular-nums">{Math.round(v)} г</p><p className="text-caption text-ink-soft">{l}</p></div>
            ))}
          </div>
        </div>

        {yesterday.length > 0 && (
          <button className="card mt-3 flex w-full items-center gap-3 px-4 py-3 text-left" onClick={repeat}>
            <RotateCcw size={18} className="shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-semibold first-letter:uppercase">{mealName} как вчера</span>
              <span className="block truncate text-caption text-ink-soft">{yesterday.slice(0, 2).map((e) => e.title).join(", ")}{yesterday.length > 2 ? " и ещё " + (yesterday.length - 2) : ""} · {kcal(totals(yesterday).kcal)}</span>
            </span>
            <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-small font-semibold text-brand-ink">Повторить</span>
          </button>
        )}
        {fav.length > 0 && <>
          <p className="label mb-2 mt-5">Часто ем</p>
          <div className="flex flex-wrap gap-1.5">
            {fav.map((e) => (
              <Chip key={e.id} onClick={() => quick(e)} label={"Записать ещё: " + e.title + ", " + kcal(e.kcal)}>
                {e.title}<span className="text-ink-faint">· {Math.round(e.kcal)}</span>
              </Chip>
            ))}
          </div>
        </>}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button className="btn-primary h-auto min-h-11 px-1 py-2 text-[min(0.875rem,4.2vw)] max-[359px]:flex-col max-[359px]:gap-1 [.xl-text_&]:flex-col [.xl-text_&]:gap-1" onClick={() => setAdd("dish")}><Search size={18} aria-hidden />Блюдо</button>
          <button className="btn-outline h-auto min-h-11 px-1 py-2 text-[min(0.875rem,4.2vw)] max-[359px]:flex-col max-[359px]:gap-1 [.xl-text_&]:flex-col [.xl-text_&]:gap-1" onClick={() => setAdd("barcode")}><ScanBarcode size={18} aria-hidden />Штрихкод</button>
          <button className="btn-outline h-auto min-h-11 px-1 py-2 text-[min(0.875rem,4.2vw)] max-[359px]:flex-col max-[359px]:gap-1 [.xl-text_&]:flex-col [.xl-text_&]:gap-1" onClick={() => setAdd("manual")}><PenLine size={18} aria-hidden />Вручную</button>
        </div>

        {!list.length && <p className="mt-6 text-center text-body-sm text-ink-soft">{isToday ? "Пока ничего не записано. Блюдо из рецептов — в одно касание, а после готовки я сам предложу записать порцию." : "В этот день ничего не записано."}</p>}
        {MEALS.map((m) => {
          const items = list.filter((e) => e.meal === m.id);
          if (!items.length) return null;
          return (
            <section key={m.id} className="mt-5" aria-label={m.label}>
              <p className="label mb-2 flex justify-between"><span>{m.label}</span><span className="normal-case tracking-normal">{kcal(totals(items).kcal)}</span></p>
              <div className="card divide-y divide-line overflow-hidden">
                {items.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-sm font-semibold">{e.title}</span>
                      <span className="block text-caption text-ink-soft">{e.portion ? portionText(e.portion) + " · " : e.grams ? e.grams + " г · " : ""}{kcal(e.kcal)} · Б {e.protein} · Ж {e.fat} · У {e.carbs}</span>
                    </span>
                    <button className="icon-btn -mr-2 h-10 w-10" onClick={() => remove(e)} aria-label={"Убрать " + e.title}><X size={16} /></button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <p className="mt-6 text-caption text-ink-faint">Калории блюд — по нашим рецептам, покупных продуктов — с этикетки (база Open Food Facts). Дневник хранится в вашем аккаунте — он есть на всех ваших устройствах, семья его не видит.</p>
      </div>

      <AddDish open={add === "dish"} date={date} onClose={() => setAdd(null)} />
      <AddBarcode open={add === "barcode"} date={date} onClose={() => setAdd(null)} onManual={() => setAdd("manual")} />
      <AddManual open={add === "manual"} date={date} onClose={() => setAdd(null)} />
      <GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} />
    </Layer>
  );
}

/** The week up to the chosen day, in the day's card: a bar a day, pink when over the goal; a tap opens that day. */
function Week({ diary, date, goal, onPick }: { diary: ReturnType<typeof useDiary>; date: string; goal: number; onPick: (d: string) => void }) {
  const today = dateKeyOf(new Date());
  const days = week(diary, shift(date, 3) > today ? today : shift(date, 3));
  const filled = days.filter((d) => d.any);
  if (filled.length < 2) return null;
  const top = Math.max(goal * 1.15, ...days.map((d) => d.kcal));
  const avg = filled.reduce((t, d) => t + d.kcal, 0) / filled.length;
  const long = (d: string) => new Date(d + "T12:00").toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex h-20 items-end gap-1.5">
        {days.map((d) => {
          const over = d.kcal > goal, on = d.date === date;
          return (
            <button key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" disabled={d.date > today} onClick={() => onPick(d.date)}
              aria-label={long(d.date) + ": " + (d.any ? kcal(d.kcal) + (over ? ", больше цели" : "") : "ничего не записано")} aria-current={on ? "date" : undefined}>
              <span className={cx("block w-full rounded-[6px]", !d.any ? "bg-sunken" : over ? (on ? "bg-over-strong" : "bg-over") : on ? "bg-herb" : "bg-herb/35")}
                style={{ height: d.any ? Math.max(6, (d.kcal / top) * 100) + "%" : "6px" }} />
              <span className={cx("text-micro leading-none", on ? "font-semibold text-ink" : "text-ink-faint")} aria-hidden>{new Date(d.date + "T12:00").toLocaleDateString("ru-RU", { weekday: "short" })}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-ink-soft">Розовым — дни сверх цели · в среднем {kcal(avg)}</p>
    </div>
  );
}

function MealChips({ meal, onChange }: { meal: DiaryMeal; onChange: (m: DiaryMeal) => void }) {
  return <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Приём пищи">{MEALS.map((m) => <Chip key={m.id} on={meal === m.id} onClick={() => onChange(m.id)}>{m.label}</Chip>)}</div>;
}

function AddDish({ open, date, onClose }: { open: boolean; date: string; onClose: () => void }) {
  const { toast } = useStore();
  const [q, setQ] = useState("");
  const [r, setR] = useState<Recipe | null>(null);
  const [portion, setPortion] = useState(1);
  const [meal, setMeal] = useState<DiaryMeal>(mealByHour);
  const found = useMemo(() => (q.trim().length >= 2 ? searchRecipes(q.trim()).slice(0, 8) : []), [q]);
  const close = () => { setQ(""); setR(null); setPortion(1); onClose(); };
  const entry = r ? recipeEntry(r, portion, "recipe", meal) : null;
  const save = () => { if (!entry) return; addEntry({ ...entry, date }); toast("Записано: " + entry.title + " — " + kcal(entry.kcal)); close(); };
  return (
    <Sheet open={open} title={r ? "Сколько съели" : "Блюдо из рецептов"} onClose={close} tall
      footer={r ? <button className="btn-primary w-full" disabled={!entry} onClick={save}>Записать{entry ? " — " + kcal(entry.kcal) : ""}</button> : undefined}>
      {!r ? <>
        <input className="input" autoFocus value={q} placeholder="Например, борщ" onChange={(e) => setQ(e.target.value)} aria-label="Найти блюдо" />
        <div className="mt-2 grid gap-1">
          {found.map((x) => (
            <button key={x.id} className="flex min-h-[56px] items-center gap-3 rounded-input px-1 text-left hover:bg-sunken" onClick={() => setR(x)}>
              <RecipeImage recipe={x} className="h-11 w-11 shrink-0" rounded="rounded-[12px]" /><span className="text-body-sm">{x.title}</span>
            </button>
          ))}
          {q.trim().length >= 2 && !found.length && <p className="py-3 text-body-sm text-ink-soft">Такого блюда нет в рецептах — запишите его вручную.</p>}
        </div>
      </> : <>
        <div className="flex items-center gap-3">
          <RecipeImage recipe={r} className="h-14 w-14 shrink-0" rounded="rounded-[14px]" />
          <span className="min-w-0 flex-1"><span className="block text-body font-semibold">{r.title}</span>
            <button className="text-body-sm text-brand" onClick={() => setR(null)}>Другое блюдо</button></span>
        </div>
        {!entry && <p className="mt-3 text-body-sm text-warn">У этого рецепта калории не посчитаны — запишите его вручную.</p>}
        <p className="label mb-2 mt-5">Порция</p>
        <div className="grid grid-cols-4 gap-2">{PORTIONS.map((n) => <button key={n} onClick={() => setPortion(n)} aria-pressed={portion === n}
          className={cx("h-11 rounded-input border text-body-sm", portion === n ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-card")}>{n === 0.5 ? "½" : String(n).replace(".", ",")}</button>)}</div>
        <p className="label mb-2 mt-5">Когда</p>
        <MealChips meal={meal} onChange={setMeal} />
        {entry && <p className="mt-4 text-body-sm text-ink-soft">{portionText(portion)}: {kcal(entry.kcal)} · белки {Math.round(entry.protein)} г · жиры {Math.round(entry.fat)} г · углеводы {Math.round(entry.carbs)} г</p>}
      </>}
    </Sheet>
  );
}

function AddBarcode({ open, date, onClose, onManual }: { open: boolean; date: string; onClose: () => void; onManual: () => void }) {
  const { toast } = useStore();
  const [scan, setScan] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Packaged | null>(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<DiaryMeal>(mealByHour);
  const close = () => { setCode(""); setFound(null); setScan(false); onClose(); };
  const look = async (c: string) => {
    setScan(false); setCode(c); setBusy(true);
    try {
      const p = await lookupBarcode(c);
      if (!p.name && !p.per100) { toast("Такого продукта нет в базе — запишите вручную"); close(); onManual(); return; }
      setFound(p); setGrams(Math.round(p.serving ?? (p.pack && p.pack <= 250 ? p.pack : 100)));
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };
  const k = found?.per100 ? grams / 100 : 0;
  const save = () => {
    if (!found?.per100) return;
    const p = found.per100;
    addEntry({ date, meal, title: found.name ?? "Продукт " + code, from: "barcode", grams, kcal: p.kcal * k, protein: p.protein * k, fat: p.fat * k, carbs: p.carbs * k });
    toast("Записано: " + kcal(p.kcal * k));
    close();
  };
  return (
    <Sheet open={open} title="По штрихкоду" onClose={close}
      footer={found?.per100 ? <button className="btn-primary w-full" onClick={save}>Записать — {kcal(found.per100.kcal * k)}</button> : undefined}>
      {!found ? <>
        {canScan() && <button className="btn-primary btn-bar w-full" onClick={() => setScan(true)}><ScanBarcode size={20} aria-hidden />Сканировать камерой</button>}
        <form className={cx("flex gap-2", canScan() && "mt-3")} onSubmit={(e) => { e.preventDefault(); if (/^\d{8,14}$/.test(code)) void look(code); }}>
          <input className="input" inputMode="numeric" value={code} placeholder="Цифры под штрихкодом" onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 14))} aria-label="Штрихкод" />
          <button className="btn-outline h-12" disabled={busy || !/^\d{8,14}$/.test(code)}>{busy ? "…" : "Найти"}</button>
        </form>
        <p className="mt-3 text-caption text-ink-faint">Калории берём с этикетки из открытой базы Open Food Facts.</p>
      </> : <>
        <p className="text-body font-semibold">{found.name ?? "Продукт " + code}</p>
        {found.per100 ? <>
          <p className="mt-1 text-body-sm text-ink-soft">На 100 г: {kcal(found.per100.kcal)} · Б {found.per100.protein} · Ж {found.per100.fat} · У {found.per100.carbs}</p>
          <div className="mt-4 flex items-center justify-between gap-3"><span className="text-body-sm">Сколько граммов</span><Stepper value={grams} min={5} max={2000} step={grams < 50 ? 5 : 25} onChange={setGrams} label="Граммы" suffix=" г" /></div>
          {(found.serving || found.pack) && <div className="mt-2 flex flex-wrap gap-1.5">
            {found.serving && <Chip on={grams === Math.round(found.serving)} onClick={() => setGrams(Math.round(found.serving!))}>Порция — {Math.round(found.serving)} г</Chip>}
            {found.pack && <Chip on={grams === Math.round(found.pack)} onClick={() => setGrams(Math.round(found.pack!))}>Вся упаковка — {Math.round(found.pack)} г</Chip>}
          </div>}
          <p className="label mb-2 mt-5">Когда</p>
          <MealChips meal={meal} onChange={setMeal} />
        </> : <>
          <p className="mt-2 text-body-sm text-ink-soft">Продукт нашёлся, но калорий в базе нет. Перепишите их с этикетки.</p>
          <button className="btn-outline mt-3 w-full" onClick={() => { close(); onManual(); }}><PenLine size={18} aria-hidden />Записать вручную</button>
        </>}
      </>}
      {scan && createPortal(<BarcodeScan onClose={() => setScan(false)} onCode={(c) => void look(c)} />, document.body)}
    </Sheet>
  );
}

function AddManual({ open, date, onClose }: { open: boolean; date: string; onClose: () => void }) {
  const { toast } = useStore();
  const [title, setTitle] = useState("");
  const [cal, setCal] = useState("");
  const [p, setP] = useState(""), [f, setF] = useState(""), [c, setC] = useState("");
  const [meal, setMeal] = useState<DiaryMeal>(mealByHour);
  const num = (v: string) => Math.max(0, Math.min(9999, parseInt(v.replace(/\D/g, ""), 10) || 0));
  const close = () => { setTitle(""); setCal(""); setP(""); setF(""); setC(""); onClose(); };
  const ok = title.trim() && num(cal) > 0;
  const save = () => {
    addEntry({ date, meal, title: title.trim().slice(0, 80), from: "manual", kcal: num(cal), protein: num(p), fat: num(f), carbs: num(c) });
    toast("Записано: " + kcal(num(cal)));
    close();
  };
  const field = (label: string, v: string, set: (s: string) => void) => (
    <label className="min-w-0"><span className="mb-1 block text-caption text-ink-soft">{label}</span>
      <input className="input px-2.5 text-center" inputMode="numeric" value={v} placeholder="—" onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 4))} /></label>
  );
  return (
    <Sheet open={open} title="Записать вручную" onClose={close} footer={<button className="btn-primary w-full" disabled={!ok} onClick={save}><Plus size={18} aria-hidden />Записать</button>}>
      <label className="block"><span className="mb-1.5 block text-body-sm">Что съели</span>
        <input className="input" autoFocus value={title} maxLength={80} placeholder="Например, бизнес-ланч в кафе" onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {field("Ккал", cal, setCal)}{field("Белки, г", p, setP)}{field("Жиры, г", f, setF)}{field("Углев., г", c, setC)}
      </div>
      <p className="label mb-2 mt-5">Когда</p>
      <MealChips meal={meal} onChange={setMeal} />
    </Sheet>
  );
}

function GoalSheet({ open, goal, onClose }: { open: boolean; goal: number; onClose: () => void }) {
  const [v, setV] = useState(goal);
  return (
    <Sheet open={open} title="Цель на день" onClose={onClose} footer={<button className="btn-primary w-full" onClick={() => { setGoal(v); onClose(); }}>Сохранить</button>}>
      <p className="text-body-sm text-ink-soft">Сколько калорий в день вы хотите — своё число. Не знаете — оставьте 2 000; с целью «Полегче» в профиле я ставлю 1 500.</p>
      <div className="mt-4 flex items-center justify-between gap-3"><span className="text-body">{v.toLocaleString("ru-RU")} ккал</span><Stepper value={v} min={800} max={5000} step={100} onChange={setV} label="Цель в калориях" /></div>
      <p className="mt-3 text-caption text-ink-faint">Это ориентир, не медицинская норма.</p>
    </Sheet>
  );
}
