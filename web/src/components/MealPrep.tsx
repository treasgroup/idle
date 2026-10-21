// «Заготовить на неделю»: three short screens, one thing each — what you will get (five dinners, the first three
// from the fridge, the last two from the freezer), the shopping, and cooking it all in one go on the same timeline
// as «Ужин к сроку». The dinners go into the plan as «Из заготовки · 15 мин».
import { useMemo, useState } from "react";
import { ChefHat, RefreshCw, ShoppingCart, Snowflake, Refrigerator } from "lucide-react";
import { dateKey, dayLabel, freshConditions, menuShopping, rankRecipes, recipes, type MenuDay, type ShoppingItem } from "../engine";
import { useStore } from "../app/store";
import { haveIds } from "../app/actions";
import { pickPrep } from "../app/mealPrep";
import { saveDinner, schedule } from "../app/dinner";
import { push, routeHash } from "../app/router";
import { cue } from "../app/feedback";
import { RecipeImage } from "./RecipeCard";
import { Sheet } from "./ui";

const MIN = 60e3;
const span = (m: number) => (m >= 60 ? Math.floor(m / 60) + " ч" + (m % 60 ? " " + (m % 60) + " мин" : "") : m + " мин");

export function MealPrepSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update, toast, profile } = useStore();
  const [step, setStep] = useState(0);
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const servings = profile.eaters;
  const dates = useMemo(() => Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return dateKey(d); }), []);
  // The person's own limits (what they do not eat, vegetarian) through the usual ranking.
  const pool = useMemo(() => {
    if (!open) return [];
    const c = freshConditions({ servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian });
    return rankRecipes(recipes(), c, s.preferences, 400, { meal: "dinner" }).map((m) => m.recipe);
  }, [open, servings, s.preferences]);
  const days = useMemo(() => (open ? pickPrep(pool, dates, seed, keep) : []), [open, pool, dates, seed, keep]);
  const list = days.map((d) => d.recipe);
  const sched = useMemo(() => (list.length ? schedule(list, Date.now() + 24 * 60 * MIN) : null), [list]);
  const close = () => { setStep(0); setKeep({}); onClose(); };

  const reroll = (date: string) => {
    // Keep the other days, ask again for this one.
    setKeep(Object.fromEntries(days.filter((d) => d.date !== date).map((d) => [d.date, d.recipe.id])));
    setSeed((x) => x + 7);
  };
  const toPlan = () => {
    const before = s.menu;
    update((st) => {
      const menu: MenuDay[] = [...st.menu];
      for (const d of days) {
        const item = { recipeId: d.recipe.id, servings, meal: "dinner" as const, prepped: d.from };
        const at = menu.findIndex((x) => x.date === d.date);
        if (at >= 0) menu[at] = { ...menu[at], items: [...menu[at].items.filter((it) => (it.meal ?? "dinner") !== "dinner"), item] };
        else menu.push({ date: d.date, items: [item] });
      }
      return { ...st, menu: menu.sort((a, b) => a.date.localeCompare(b.date)) };
    });
    toast("Ужины на 5 дней — в плане", { label: "Отменить", run: () => update((st) => ({ ...st, menu: before })) });
    cue("tap");
    setStep(1);
  };
  const shopping: ShoppingItem[] = useMemo(() => (step === 1 ? menuShopping(days.map((d) => ({ date: d.date, items: [{ recipeId: d.recipe.id, servings }] })), [], haveIds(s)) : []), [step, days, servings, s]);
  const buy = () => {
    update((st) => ({ ...st, shopping: [...st.shopping, ...shopping.filter((x) => !st.shopping.some((k) => k.key === x.key))] }));
    toast("Продукты для заготовок — в покупках");
    setStep(2);
  };
  const cook = () => {
    if (!sched) return;
    const need = sched.serveAt - sched.start;
    saveDinner({ kind: "prep", serveAt: Date.now() + need + 5 * MIN, dishes: list.map((r) => ({ recipeId: r.id, servings })), done: [], at: Date.now() });
    close();
    push(routeHash({ dinner: true }));
  };

  const footer = step === 0
    ? (
      <div className="grid gap-2">
        <button className="btn-primary h-13 w-full" disabled={days.length < 3} onClick={toPlan}>Подходит — в план</button>
        <button className="btn-ghost w-full" onClick={() => { setKeep({}); setSeed((x) => x + 1); }}><RefreshCw size={18} aria-hidden />Другой набор</button>
      </div>
    )
    : step === 1
      ? (
        <div className="grid gap-2">
          {shopping.length > 0 && <button className="btn-primary h-13 w-full" onClick={buy}><ShoppingCart size={18} aria-hidden />Добавить в покупки</button>}
          <button className={shopping.length ? "btn-ghost w-full" : "btn-primary h-13 w-full"} onClick={() => setStep(2)}>{shopping.length ? "Всё уже есть — дальше" : "Дальше"}</button>
        </div>
      )
      : <button className="btn-primary h-13 w-full" onClick={cook}><ChefHat size={18} aria-hidden />Начать готовить</button>;

  return (
    <Sheet open={open} title={["Что получится", "Покупки", "Готовим вместе"][step]} onClose={close} footer={footer} tall>
      {step === 0 && (
        <>
          <p className="text-body-sm text-ink-soft">Готовите сегодня — ужины на 5 дней вперёд, в будни только разогреть. Первые три дня — из холодильника, последние два — из морозилки.</p>
          <ul className="mt-4 grid gap-2">
            {days.map((d) => (
              <li key={d.date} className="flex items-center gap-3 rounded-input border border-line bg-card p-1.5 pr-1">
                <RecipeImage recipe={d.recipe} className="h-12 w-12 shrink-0" rounded="rounded-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-caption text-ink-soft">{dayLabel(d.date)}</span>
                  <span className="block truncate text-body-sm font-semibold">{d.recipe.title}</span>
                  <span className="flex items-center gap-1 text-caption text-ink-soft">{d.from === "freezer" ? <><Snowflake size={12} aria-hidden />из морозилки</> : <><Refrigerator size={12} aria-hidden />из холодильника</>}</span>
                </span>
                <button className="icon-btn" onClick={() => reroll(d.date)} aria-label={"Заменить: " + d.recipe.title}><RefreshCw size={18} /></button>
              </li>
            ))}
          </ul>
          {days.length < 5 && <p className="mt-3 text-small text-ink-soft">Подходящих для хранения блюд под ваши ограничения нашлось меньше пяти — остальные дни можно заполнить в плане.</p>}
        </>
      )}
      {step === 1 && (
        <>
          <p className="text-body-sm text-ink-soft">{shopping.length ? "Всё для пяти ужинов — одной поездкой. Продукты, которые отмечены у вас дома, не добавляю." : "Похоже, всё нужное уже есть дома."}</p>
          <ul className="mt-3 grid gap-1">
            {shopping.slice(0, 40).map((x) => <li key={x.key} className="flex justify-between gap-3 border-b border-line py-1.5 text-body-sm"><span>{x.name}</span><span className="shrink-0 text-ink-soft">{x.amount ? x.amount + " " + (x.unit ?? "") : ""}</span></li>)}
          </ul>
        </>
      )}
      {step === 2 && sched && (
        <>
          <p className="text-body">Займёт около <b>{span(Math.round((sched.serveAt - sched.start) / MIN))}</b>, у плиты — около {span(sched.handsOn)}.</p>
          {(() => {
            // Started late, it ends at night: say so before the person begins.
            const end = new Date(Date.now() + (sched.serveAt - sched.start) + 5 * MIN);
            return end.getHours() >= 22 || end.getDate() !== new Date().getDate()
              ? <p className="mt-3 rounded-input bg-warn-soft px-4 py-3 text-body-sm">Если начать сейчас, закончите около {end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}. Удобнее начать днём — план уже сохранён, вернуться можно в «⋯ Ещё» → «Заготовить на неделю».</p>
              : null;
          })()}
          <p className="mt-3 text-body-sm text-ink-soft">Все шаги пяти блюд — в одной ленте, по времени: пока одно томится, режете другое. Перед каждым шагом прозвенит напоминание.</p>
          <p className="mt-3 rounded-input bg-sunken px-4 py-3 text-body-sm">В конце остудите, разложите по контейнерам и подпишите день. Ужины на 4-й и 5-й день — в морозилку, достать накануне вечером.</p>
        </>
      )}
    </Sheet>
  );
}
