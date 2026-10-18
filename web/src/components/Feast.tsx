// «Праздничный стол»: three short steps — how many guests and when to serve, the dishes (one tap to swap), and the
// result: one shopping list for everybody and a plan of when to start each dish so all is ready on time.
import { useMemo, useState } from "react";
import { BellRing, ChevronLeft, RefreshCw, ShoppingCart, X } from "lucide-react";
import {
  CATALOG_SECTIONS, addToShopping, clampServings, courseOf, formatMinutes, freshConditions, ingredientsToBuy, plural, rankRecipes, recipes,
  type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions, haveIds } from "../app/actions";
import { startTimer } from "../app/timers";
import { cue } from "../app/feedback";
import { RecipeImage } from "./RecipeCard";
import { Chip, Sheet, Stepper } from "./ui";
import { Mascot } from "./Mascot";

const SLOTS: { key: string; label: string; courses: string[] }[] = [
  { key: "salad1", label: "Салат", courses: ["salad"] },
  { key: "salad2", label: "Ещё салат", courses: ["salad"] },
  { key: "snack", label: "Закуска", courses: ["snack"] },
  { key: "main", label: "Горячее", courses: ["main"] },
  { key: "dessert", label: "Сладкое", courses: ["dessert", "baking"] },
];
const hhmm = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

// December: the table for the night of the 31st — the classic dishes first, a choice of how the table should be,
// and a plan that says what to make the day before.
const STYLES = [
  { key: "classic", label: "Классика", hint: "оливье, шуба, горячее" },
  { key: "nomayo", label: "Без майонеза", hint: "полегче" },
  { key: "simple", label: "Попроще", hint: "до 2 часов на блюдо" },
] as const;
type Style = (typeof STYLES)[number]["key"];
const isNewYear = (d = new Date()) => d.getMonth() === 11;

export function FeastSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update, toast } = useStore();
  const { openRecipe } = useActions();
  const ny = isNewYear();
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState(6);
  const [hour, setHour] = useState(() => (ny ? 21 : Math.min(20, Math.max(new Date().getHours() + 3, 15))));
  const [style, setStyle] = useState<Style>("classic");
  const [pick, setPick] = useState<Record<string, number>>({});
  const [off, setOff] = useState<string[]>([]);

  // Candidates per slot: dishes for guests first, then any suitable ones.
  const pools = useMemo(() => {
    if (!open) return {} as Record<string, Recipe[]>;
    const c = { ...freshConditions({ servings: 4, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian }), occasion: "guests" as const };
    const ranked = rankRecipes(recipes(), c, s.preferences, 500).map((m) => m.recipe);
    const forGuests = CATALOG_SECTIONS.find((x) => x.key === "guests")?.test ?? (() => false);
    const out: Record<string, Recipe[]> = {};
    const mayo = (r: Recipe) => r.ingredients.some((i) => i.id === "mayonnaise");
    for (const sl of SLOTS) {
      // Not for a festive table: memorial and fasting-day dishes.
      let fit = ranked.filter((r) => sl.courses.includes(courseOf(r)) && !/кутья|кутью|канун/i.test(r.title));
      if (ny && style === "nomayo") fit = fit.filter((r) => !mayo(r));
      if (ny && style === "simple") { const easy = fit.filter((r) => r.totalMinutes <= 120 && r.difficulty !== "hard"); if (easy.length) fit = easy; }
      const newYear = (r: Recipe) => !!r.occasions?.includes("new-year");
      out[sl.key] = ny
        ? [...fit.filter(newYear), ...fit.filter((r) => !newYear(r) && forGuests(r)), ...fit.filter((r) => !newYear(r) && !forGuests(r))]
        : [...fit.filter(forGuests), ...fit.filter((r) => !forGuests(r))];
    }
    // The two salads differ.
    out.salad2 = out.salad2.slice(1).concat(out.salad2.slice(0, 1));
    return out;
  }, [open, s.preferences, ny, style]);
  const dishes = SLOTS.filter((sl) => !off.includes(sl.key) && pools[sl.key]?.length)
    .map((sl) => ({ slot: sl, r: pools[sl.key][(pick[sl.key] ?? 0) % pools[sl.key].length] }));

  const serve = ny ? new Date(new Date().getFullYear(), 11, 31, hour) : new Date(); if (!ny) serve.setHours(hour, 0, 0, 0);
  const onTheDay = !ny || new Date().getDate() === 31;
  const plan = dishes.map((d) => ({ ...d, start: new Date(serve.getTime() - d.r.totalMinutes * 60e3) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const first = plan[0]?.start;
  const close = () => { setStep(0); onClose(); };

  const toShopping = () => {
    const have = haveIds(s);
    update((st) => {
      let list = st.shopping;
      for (const { r } of dishes) {
        const per = clampServings(r, guests);
        // A dish whose recipe does not go up to the number of guests is bought twice (or more).
        for (let k = 0; k < Math.ceil(guests / per); k++) {
          const items = ingredientsToBuy(r, per, have).filter((i) => !i.optional);
          list = addToShopping(list, items, r.title);
        }
      }
      return { ...st, shopping: list };
    });
    cue("success");
    toast("Продукты на всех — в списке покупок");
  };
  const remind = () => {
    if (!first) return;
    const wait = Math.round((first.getTime() - Date.now()) / 1000);
    if (wait < 60) return toast("Пора начинать — первое блюдо уже сейчас");
    startTimer({ dish: "Праздничный стол", label: "Пора начинать: «" + plan[0].r.title + "»", seconds: wait });
    toast("Напомню в " + hhmm(first) + ". Не закрывайте сайт — сигнал прозвучит здесь.");
  };

  return (
    <Sheet open={open} title={[ny ? "Новогодний стол" : "Праздничный стол", "Что подать", "План готов"][step]} onClose={close} tall
      footer={step < 2
        ? <div className="flex gap-2">
            {step > 0 && <button className="btn-outline" onClick={() => setStep(step - 1)}><ChevronLeft size={18} />Назад</button>}
            <button className="btn-primary flex-1" disabled={step === 1 && !dishes.length} onClick={() => setStep(step + 1)}>Дальше</button>
          </div>
        : <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-primary" onClick={toShopping}><ShoppingCart size={18} />Всё в список покупок</button>
            {onTheDay && <button className="btn-outline" onClick={remind}><BellRing size={18} />Напомнить начать в {first ? hhmm(first) : "—"}</button>}
          </div>}>
      {step === 0 && (
        <div>
          <div className="flex items-center gap-4">
            <Mascot size={104} mood="feast" className="shrink-0" />
            <p className="text-body-sm text-ink-soft">{ny ? "Соберу стол на новогоднюю ночь: салаты, закуску, горячее и сладкое — и скажу, что сделать накануне." : "Соберу стол на всех: салаты, закуску, горячее и сладкое."}</p>
          </div>
          {ny && (
            <>
              <p className="label mb-2 mt-5">Какой стол</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {STYLES.map((x) => (
                  <button key={x.key} aria-pressed={style === x.key} onClick={() => { setStyle(x.key); setPick({}); }}
                    className={style === x.key ? "rounded-card border border-brand bg-brand-soft px-4 py-2.5 text-left" : "rounded-card border border-line bg-card px-4 py-2.5 text-left hover:border-line-strong"}>
                    <span className="block text-body-sm font-semibold">{x.label}</span><span className="block text-caption text-ink-soft">{x.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="mt-5 flex items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
            <span className="text-body-sm font-medium">Сколько человек</span>
            <Stepper value={guests} min={2} max={24} onChange={setGuests} label="Гостей" />
          </div>
          <p className="label mb-2 mt-5">К какому времени подать</p>
          <div className="flex flex-wrap gap-2">
            {(ny ? [18, 19, 20, 21, 22, 23] : [14, 15, 16, 17, 18, 19, 20]).map((h) => <Chip key={h} on={hour === h} onClick={() => setHour(h)}>{h}:00</Chip>)}
          </div>
        </div>
      )}
      {step === 1 && (
        <ul className="grid gap-2">
          {SLOTS.filter((sl) => pools[sl.key]?.length).map((sl) => {
            const on = !off.includes(sl.key);
            const r = pools[sl.key][(pick[sl.key] ?? 0) % pools[sl.key].length];
            return (
              <li key={sl.key} className={on ? "flex items-center gap-3 rounded-card border border-line bg-card p-2" : "flex items-center gap-3 rounded-card border border-dashed border-line p-2 opacity-60"}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <RecipeImage recipe={r} className="h-14 w-14 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-caption text-ink-soft">{sl.label} · {formatMinutes(r.totalMinutes)}</span>
                    <span className="line-clamp-2 block text-body-sm font-medium leading-snug">{r.title}</span>
                  </span>
                </div>
                {on && <button className="icon-btn shrink-0 text-ink-soft" onClick={() => setPick((p) => ({ ...p, [sl.key]: (p[sl.key] ?? 0) + 1 }))} aria-label={"Другое блюдо: " + sl.label}><RefreshCw size={18} /></button>}
                <button className="icon-btn shrink-0 text-ink-soft" onClick={() => setOff((o) => (on ? [...o, sl.key] : o.filter((x) => x !== sl.key)))} aria-label={on ? "Убрать: " + sl.label : "Вернуть: " + sl.label}>
                  {on ? <X size={18} /> : <RefreshCw size={18} />}
                </button>
              </li>
            );
          })}
          <li className="px-1 pt-1 text-caption text-ink-faint">↻ — другое блюдо, × — не нужно.</li>
        </ul>
      )}
      {step === 2 && (
        <div>
          <p className="text-body-sm text-ink-soft">{guests} {plural(guests, "человек", "человека", "человек")} · подать {ny ? "31 декабря " : ""}в {hour}:00. Начинайте с того, что готовится дольше:</p>
          <ol className="mt-4 grid gap-2">
            {plan.map(({ slot, r, start }) => {
              // In December the plan is for the 31st: long dishes (холодец, торт, буженина) — on the 30th.
              const early = ny ? r.totalMinutes > 240 : start.getTime() < Date.now() || r.totalMinutes > 240;
              return (
                <li key={slot.key}>
                  {/* Opens the recipe; the plan stays as it is when the sheet is opened again. */}
                  <button className="flex w-full items-center gap-3 rounded-input bg-sunken px-3 py-2.5 text-left hover:bg-line/60" onClick={() => { onClose(); openRecipe(r); }}>
                    <span className="w-16 shrink-0 text-body font-medium tabular-nums">{early ? (ny ? "30-го" : "Заранее") : hhmm(start)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm">{r.title}</span>
                      <span className="block text-caption text-ink-soft">{slot.label} · {formatMinutes(r.totalMinutes)}{clampServings(r, guests) < guests ? " · приготовьте ×" + Math.ceil(guests / clampServings(r, guests)) : ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            <li className="flex items-center gap-3 rounded-input border border-brand/30 bg-brand-soft px-3 py-2.5">
              <span className="w-16 shrink-0 text-body font-medium tabular-nums">{hour}:00</span>
              <span className="text-body-sm font-medium">Всё на столе — приятного аппетита!</span>
            </li>
          </ol>
          <p className="mt-3 text-caption text-ink-faint">{ny ? "«30-го» — то, что готовится долго или должно настояться: торт, холодец, буженина. Салаты лучше заправить за час-два до стола." : "«Заранее» — то, что готовится долго или настаивается: лучше сделать накануне."}</p>
        </div>
      )}
    </Sheet>
  );
}
