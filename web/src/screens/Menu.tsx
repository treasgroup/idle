// «Меню»: the week of dishes, the plan it is built from, and one tap to the shopping list.
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronDown, Clock, MoreHorizontal, Package, Pencil, ArrowRightLeft, Eraser, RefreshCw, Settings2, Share2, ShoppingCart, Sparkles, Recycle, Plus, Vote, Trash2, CalendarPlus, Repeat2, Bookmark, X,
} from "lucide-react";
import {
  MEAL_LABELS, apiUrl, courseOf, dateKey, dayLabel, freshConditions, generateMenu, menuPlanSummary, menuText, nutritionOf, plural,
  rankRecipes, recipeById, recipes, regenerateDay, removeMenuItem, replaceMenuItem, sharedPerishables, siteBase, weekDays,
  type MenuDay, type MenuPlan, type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { withWeek } from "../app/planShopping";
import { weekLeftovers, amountText } from "../app/nowaste";
import { replace, routeHash } from "../app/router";
import { DinnerSetup } from "../components/DinnerPlan";
import { AddToDaySheet } from "../components/AddToDay";
import { MealPrepSheet } from "../components/MealPrep";
import { PlaceHint } from "../components/PlaceHint";
import { downloadIcs, planIcs } from "../app/calendar";
import { applyWeek, removeWeek, saveWeek, savedWeeks } from "../app/savedWeeks";
import type { Profile } from "../app/profile";
import { RecipeImage } from "../components/RecipeCard";
import { Chip, Empty, Sheet, Stepper, Toggle, cx } from "../components/ui";
import { ShareOptions } from "../components/ShareOptions";
import { printText } from "../app/print";
import { timeShort } from "../app/recipeTime";
import { TAKE_MENU, TakeMenu, dropTakeMenu, readTakeMenu } from "./TakeMenu";

/** The person's goals narrow the dishes a menu is made of (passed to the engine only, never stored). */
function goalFilter(p: Profile): ((r: Recipe) => boolean) | undefined {
  const tests: ((r: Recipe) => boolean)[] = [];
  if (p.goals.includes("budget")) tests.push((r) => r.budget !== "high");
  if (p.goals.includes("light")) tests.push((r) => { const k = nutritionOf(r).perServing.kcal; return k > 0 && k <= 600; });
  if (p.goals.includes("protein")) tests.push((r) => courseOf(r) === "breakfast" || nutritionOf(r).perServing.protein >= 20);
  if (p.level === "beginner") tests.push((r) => r.difficulty !== "hard");
  if (p.kids || p.goals.includes("family")) tests.push((r) => r.kids !== false);
  return tests.length ? (r) => tests.every((t) => t(r)) : undefined;
}

export function Menu() {
  const { s, update, profile, setProfile, toast } = useStore();
  const { openRecipe } = useActions();
  const [settings, setSettings] = useState(false);
  const [share, setShare] = useState(false);
  const [itemMenu, setItemMenu] = useState<{ date: string; index: number } | null>(null);
  // «Ужин к сроку» for a day with two or three dishes (components/DinnerPlan).
  const [dinnerDay, setDinnerDay] = useState<string | null>(null);
  const dinnerDishes = (date: string) => (days.find((x) => x.date === date)?.items ?? []).filter((it) => !it.leftover && (it.meal ?? "dinner") === "dinner")
    .map((it) => recipeById(it.recipeId)).filter((r): r is NonNullable<typeof r> => !!r).sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 3);
  const [poll, setPoll] = useState<{ token: string; date: string } | null>(null);
  const [noWaste, setNoWaste] = useState(false);
  const [again, setAgain] = useState(false);
  // «+» beside a day, «⋯ Ещё», «Заполню сам» (an empty week to fill by hand), moving a dish to another day.
  const [addDay, setAddDay] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [manual, setManual] = useState(false);
  const [moving, setMoving] = useState(false);
  const [prep, setPrep] = useState(false);
  const [weeks, setWeeks] = useState(savedWeeks);
  // «Взять это меню себе» from a VK post (App.tsx keeps the dishes for this screen).
  const [take, setTake] = useState<string[] | null>(readTakeMenu);
  useEffect(() => {
    const on = () => setTake(readTakeMenu());
    window.addEventListener(TAKE_MENU, on);
    return () => window.removeEventListener(TAKE_MENU, on);
  }, []);
  const servings = profile.eaters;
  const today = dateKey(new Date());
  // «Пт, 23» for the chips that move a dish to another day.
  const dayShort = (date: string) => {
    if (date === today) return "Сегодня";
    const t = new Date(date + "T12:00").toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const days = weekDays(s.menu);
  const filled = days.some((d) => d.items.length);
  const plan: MenuPlan = s.menuPlan;
  const enginePlan = { ...plan, only: goalFilter(profile), light: profile.goals.includes("light") } as MenuPlan;
  const save = (menu: MenuDay[]) => update((st) => ({ ...st, menu: menu.filter((d) => d.date >= today && d.items.length).slice(0, 31) }));
  const withUndo = (text: string) => {
    const before = s.menu;
    toast(text, { label: "Отменить", run: () => update((st) => ({ ...st, menu: before })) });
  };

  const shared = useMemo(() => (filled ? sharedPerishables(days) : []), [days, filled]);
  const leftovers = useMemo(() => (filled ? weekLeftovers(s, days) : []), [s, days, filled]);

  const make = () => {
    const had = filled;
    save(generateMenu(days.map((d) => ({ date: d.date, items: [] })), s.preferences, servings, Date.now(), enginePlan));
    if (had) withUndo("План собран заново");
    else toast("План готов. Любое блюдо можно заменить.");
  };
  const fill = () => save(generateMenu(days, s.preferences, servings, Date.now(), enginePlan));
  // The whole week empty in one tap; «Отменить» brings it back.
  const clear = () => { withUndo("План очищен"); save([]); setManual(false); };
  const addTo = (date: string, r: Recipe) => {
    save(days.map((d) => (d.date === date ? { ...d, items: [...d.items, { recipeId: r.id, servings, meal: "dinner" as const }].slice(0, 6) } : d)));
    toast("«" + r.title + "» — " + dayLabel(date).toLowerCase());
  };
  const moveTo = (from: string, index: number, to: string) => {
    const item = days.find((d) => d.date === from)?.items[index];
    if (!item) return;
    save(days.map((d) => (d.date === from ? { ...d, items: d.items.filter((_, i) => i !== index) } : d.date === to ? { ...d, items: [...d.items, item] } : d)));
    withUndo("Перенесено: " + dayLabel(to).toLowerCase());
  };
  const clearDay = (date: string) => { save(days.map((d) => (d.date === date ? { ...d, items: [] } : d))); withUndo("День очищен"); };

  const toShopping = (week: MenuDay[] = days, text = "Продукты на неделю — в списке покупок") => {
    update((st) => ({ ...st, shopping: withWeek(st, week) }));
    toast(text, { label: "Открыть", run: () => replace(routeHash({ tab: "shopping" })) });
  };
  // The week's dinners from a VK menu, one a day from today; other meals of those days stay.
  const takeMenu = (ids: string[], shopping: boolean) => {
    const week = days.map((d, i) => (ids[i] && recipeById(ids[i])
      ? { ...d, items: [...d.items.filter((it) => (it.meal ?? "dinner") !== "dinner"), { recipeId: ids[i], servings, meal: "dinner" as const }] }
      : d));
    const before = s.menu;
    save(week);
    dropTakeMenu(); setTake(null);
    if (shopping) toShopping(week, "Меню в плане, продукты — в покупках");
    else toast("Меню в плане", { label: "Отменить", run: () => update((st) => ({ ...st, menu: before })) });
  };

  const addToNearestFree = (r: Recipe) => {
    const free = days.find((d) => d.date >= today && !d.items.length) ?? days[days.length - 1];
    const menu = days.map((d) => (d.date === free.date ? { ...d, items: [...d.items, { recipeId: r.id, servings, meal: "dinner" as const }] } : d));
    save(menu);
    toast("«" + r.title + "» — " + dayLabel(free.date).toLowerCase());
  };

  const startPoll = async (date: string) => {
    const current = days.find((d) => d.date === date)?.items.find((i) => (i.meal ?? "dinner") === "dinner" && !i.leftover);
    const first = current ? recipeById(current.recipeId) : null;
    const c = freshConditions({ servings, appliances: s.preferences.appliances, vegetarian: s.preferences.vegetarian });
    const alts = rankRecipes(recipes(), c, s.preferences, 30, { meal: "dinner" }).map((m) => m.recipe).filter((r) => r.id !== first?.id && ["main", "soup"].includes(r.course ?? "main"));
    const pick = [first, ...alts.sort(() => Math.random() - 0.5).slice(0, first ? 2 : 3)].filter(Boolean).map((r) => ({ id: r!.id, title: r!.title }));
    try {
      const r = await fetch(apiUrl("poll.create"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: date, options: pick }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Не удалось создать опрос.");
      update((st) => ({ ...st, polls: [...st.polls, { token: j.token, day: date, at: Date.now() }].slice(-5) }));
      setPoll({ token: j.token, date });
    } catch (e) { toast(e instanceof Error ? e.message : "Не удалось создать опрос."); }
  };

  // Only the meal and how many people; the rest of the settings («в будни быстро», «на 2 дня») is behind «Настроить».
  const planChips = [menuPlanSummary(plan).split(" · ")[0], servings + " " + plural(servings, "человек", "человека", "человек")];

  return (
    <div className="pt-4 sm:pt-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-h1">План на неделю</h1>
        {filled && <button className="icon-btn -mr-2" onClick={() => setShare(true)} aria-label="Поделиться планом"><Share2 size={20} /></button>}
      </div>
      {/* One quiet line: what the plan is for, and where to change it. */}
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="min-w-0 text-body-sm text-ink-soft">{planChips.join(" · ")}</p>
        <button className="-mr-2 inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-small font-semibold text-brand hover:bg-brand-soft" onClick={() => setSettings(true)}><Settings2 size={16} aria-hidden />Настроить</button>
      </div>
      {filled && <PlaceHint id="menu" className="mt-3" text="Любое блюдо можно заменить — карандаш рядом с ним. «В покупки» соберёт продукты на всю неделю." />}

      {!filled && !manual ? (
        <div className="mt-6">
          <Empty icon={<CalendarDays size={48} />} title="Составлю план за секунду" mood="plan"
            actions={<>
              <button className="btn-primary h-13" onClick={make}><Sparkles size={18} />Составить план</button>
              <button className="btn-outline h-13" onClick={() => setManual(true)}><Pencil size={18} />Заполню сам</button>
              <button className="btn-outline h-13" onClick={() => setPrep(true)}><Package size={18} />Заготовить на неделю</button>
              {weeks.length > 0 && <button className="btn-outline h-13" onClick={() => setAgain(true)}><Repeat2 size={18} />Повторить свою неделю</button>}
            </>}>
            Блюда без повторов, в будни — быстрые, с общими продуктами, чтобы ничего не пропадало. Список покупок соберётся сам.
          </Empty>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary flex-1 sm:flex-none" onClick={() => toShopping()}><ShoppingCart size={18} />В покупки</button>
            <button className="btn-outline" onClick={() => setMore(true)} aria-label="Ещё действия с планом"><MoreHorizontal size={18} />Ещё</button>
          </div>

          {/* The week in one column, a block per day: the day as a heading, its dishes in a card under it. */}
          <div className="mt-6 grid gap-5">
            {days.map((d) => (
              <section key={d.date} aria-label={dayLabel(d.date)}>
                {/* «+» beside the day instead of a «Добавить в этот день» row under every day (seven of them on a phone). */}
                <div className="mb-1 flex items-center justify-between gap-2 px-1">
                  <h3 className={cx("text-body font-semibold", d.date === today && "text-brand")}>{dayLabel(d.date)}</h3>
                  {d.items.length > 0 && (
                    <button className="-my-1.5 inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-small text-brand hover:bg-brand-soft" onClick={() => setAddDay(d.date)} aria-label={"Добавить блюдо: " + dayLabel(d.date)}>
                      <span className="grid h-7 w-7 place-items-center rounded-full border border-line-strong"><Plus size={16} aria-hidden /></span><span className="hidden sm:inline">Добавить</span>
                    </button>
                  )}
                </div>
                {d.items.length === 0 ? (
                  <div className="card flex flex-wrap gap-2 p-3">
                    <button className="btn-soft h-11" onClick={() => save(regenerateDay(days, d.date, s.preferences, servings, Date.now(), enginePlan))}><Sparkles size={16} />Подобрать блюдо</button>
                    <button className="btn-outline h-11" onClick={() => setAddDay(d.date)}><Plus size={16} />Добавить</button>
                  </div>
                ) : (
                  <div className={cx("card divide-y divide-line overflow-hidden", d.date === today && "border-brand/40")}>
                    {d.items.map((it, n) => {
                      const r = recipeById(it.recipeId);
                      if (!r) return null;
                      const meal = (it.meal ?? "dinner") !== "dinner" ? MEAL_LABELS[it.meal!] : "";
                      return (
                        <div key={n} className="flex items-center gap-2 py-2 pl-2 pr-1">
                          <button className="flex min-w-0 flex-1 items-center gap-3 rounded-input text-left" onClick={() => openRecipe(r)}>
                            <RecipeImage recipe={r} className="h-14 w-14 shrink-0" />
                            <span className="min-w-0">
                              {meal && <span className="block text-caption text-ink-soft">{meal}</span>}
                              <span className="line-clamp-2 text-body-sm font-semibold leading-snug">{r.title}</span>
                              <span className="block text-caption text-ink-soft">{it.leftover ? "Разогреть вчерашнее" : it.prepped === "freezer" ? "Из заготовки · достать из морозилки накануне" : it.prepped ? "Из заготовки · 15 мин" : timeShort(r)}</span>
                            </span>
                          </button>
                          {/* One clear button per dish: replace, remove and the day's actions are inside. Phones: just the pencil. */}
                          <button className="inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-small text-ink-soft hover:bg-sunken" onClick={() => setItemMenu({ date: d.date, index: n })} aria-label={"Изменить: " + r.title}>
                            <Pencil size={18} aria-hidden /><span className="hidden sm:inline">Изменить</span>
                          </button>
                        </div>
                      );
                    })}
                    {d.date >= today && dinnerDishes(d.date).length >= 2 && (
                      <button className="flex min-h-[48px] w-full items-center gap-2 px-3 text-left text-body-sm font-semibold text-brand hover:bg-brand-soft" onClick={() => setDinnerDay(d.date)}>
                        <Clock size={18} aria-hidden />Ужин к сроку — все блюда к одному времени
                      </button>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>

          {(shared.length > 0 || leftovers.length > 0) && (
            <section className="card mt-6 overflow-hidden">
              <button className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" onClick={() => setNoWaste((v) => !v)} aria-expanded={noWaste}>
                <Recycle size={20} className="shrink-0 text-herb" aria-hidden />
                <span className="flex-1">
                  <span className="block text-title">Что останется от продуктов</span>
                  <span className="block text-caption text-ink-soft">{leftovers.length ? "Что останется в упаковках и куда это деть" : "Одни продукты на несколько блюд"}</span>
                </span>
                <ChevronDown size={20} className={cx("shrink-0 text-ink-soft transition-transform", noWaste && "rotate-180")} aria-hidden />
              </button>
              {noWaste && (
                <div className="space-y-4 border-t border-line px-4 py-4 text-body-sm">
                  {shared.length > 0 && <p>Одна покупка на несколько блюд: {shared.slice(0, 4).map((x) => x.name.toLowerCase() + " — в " + x.dishes + " " + plural(x.dishes, "блюде", "блюдах", "блюдах")).join(", ")}.</p>}
                  {leftovers.map((l) => (
                    <div key={l.id}>
                      <p><b className="font-semibold">{l.name}</b>: нужно {amountText(l.need, l.unit)}, купите {l.buy} — останется около {amountText(l.left, l.unit)}.</p>
                      {l.ideas.length > 0 && (
                        <ul className="mt-2 grid gap-1.5">
                          {l.ideas.map((r) => (
                            <li key={r.id} className="flex items-center gap-2">
                              <button className="link min-w-0 flex-1 truncate text-left" onClick={() => openRecipe(r)}>{r.title}</button>
                              <button className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-small font-semibold text-brand hover:bg-brand-soft" onClick={() => addToNearestFree(r)}><CalendarPlus size={16} aria-hidden />В план</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <Sheet open={settings} title="Как планировать" onClose={() => setSettings(false)}
        footer={filled ? <button className="btn-primary w-full" onClick={() => { setSettings(false); make(); }}>Применить к плану</button> : undefined}>
        <PlanSettings plan={plan} servings={servings}
          onChange={(p, n) => { update((st) => ({ ...st, menuPlan: p })); setProfile((x) => ({ ...x, eaters: n })); }} />
      </Sheet>
      <Sheet open={!!itemMenu} title={itemMenu ? recipeById(days.find((d) => d.date === itemMenu.date)?.items[itemMenu.index]?.recipeId ?? "")?.title ?? "Блюдо" : ""} onClose={() => { setItemMenu(null); setMoving(false); }}>
        {itemMenu && (
          <div className="grid gap-2">
            <button className="btn-primary justify-start" onClick={() => { save(replaceMenuItem(days, itemMenu.date, itemMenu.index, s.preferences, servings, Date.now(), enginePlan)); withUndo("Блюдо заменено"); setItemMenu(null); }}><RefreshCw size={18} />Заменить другим</button>
            <button className="btn-outline justify-start" onClick={() => setMoving((v) => !v)} aria-expanded={moving}><ArrowRightLeft size={18} />Перенести на другой день</button>
            {moving && (
              <div className="flex flex-wrap gap-2 pb-1">
                {days.filter((d) => d.date !== itemMenu.date).map((d) => (
                  <Chip key={d.date} onClick={() => { moveTo(itemMenu.date, itemMenu.index, d.date); setMoving(false); setItemMenu(null); }}>{dayShort(d.date)}</Chip>
                ))}
              </div>
            )}
            <button className="btn-outline justify-start" onClick={() => { save(removeMenuItem(days, itemMenu.date, itemMenu.index, servings)); withUndo("Блюдо убрано"); setItemMenu(null); }}><Trash2 size={18} />Убрать из плана</button>
            <p className="label mt-3">{dayLabel(itemMenu.date)}</p>
            <button className="btn-outline justify-start" onClick={() => { save(regenerateDay(days, itemMenu.date, s.preferences, servings, Date.now(), enginePlan)); withUndo("День пересобран"); setItemMenu(null); }}><Sparkles size={18} />Подобрать весь день заново</button>
            <button className="btn-outline justify-start" onClick={() => { const d = itemMenu.date; setItemMenu(null); setAddDay(d); }}><Plus size={18} />Добавить ещё блюдо в этот день</button>
            <button className="btn-outline justify-start" onClick={() => { clearDay(itemMenu.date); setItemMenu(null); }}><Eraser size={18} />Очистить весь день</button>
            <button className="btn-outline justify-start" onClick={() => { const d = itemMenu.date; setItemMenu(null); void startPoll(d); }}><Vote size={18} />Спросить семью, что приготовить</button>
          </div>
        )}
      </Sheet>
      <AddToDaySheet open={!!addDay} title={addDay ? "Добавить: " + dayLabel(addDay).toLowerCase() : ""} onClose={() => setAddDay(null)}
        onAdd={(r) => addDay && addTo(addDay, r)}
        onPick={addDay && !days.find((d) => d.date === addDay)?.items.length ? () => { save(regenerateDay(days, addDay, s.preferences, servings, Date.now(), enginePlan)); } : undefined} />
      <MealPrepSheet open={prep} onClose={() => setPrep(false)} />
      {take && <TakeMenu ids={take} days={days} dayShort={dayShort} onTake={(shop) => takeMenu(take, shop)} onClose={() => { dropTakeMenu(); setTake(null); }} />}
      <Sheet open={more} title="План на неделю" onClose={() => setMore(false)}>
        <div className="grid gap-2">
          <button className="btn-outline justify-start" onClick={() => { setMore(false); if (weeks.length) setAgain(true); else make(); }}><RefreshCw size={18} />Составить заново</button>
          {days.some((d) => !d.items.length) && <button className="btn-outline justify-start" onClick={() => { setMore(false); fill(); }}><Plus size={18} />Заполнить пустые дни</button>}
          <button className="btn-outline justify-start" onClick={() => { setMore(false); setPrep(true); }}><Package size={18} />Заготовить на неделю</button>
          <button className="btn-outline justify-start" onClick={() => { setMore(false); saveWeek(days); setWeeks(savedWeeks()); toast("Неделя сохранена — повторить можно в «Составить заново»"); }}><Bookmark size={18} />Сохранить эту неделю</button>
          <button className="btn-outline justify-start text-ink-soft" onClick={() => { setMore(false); clear(); }}><Trash2 size={18} />Очистить план</button>
        </div>
      </Sheet>
      <Sheet open={share} title="Поделиться планом" onClose={() => setShare(false)}>
        <ShareOptions title="План на неделю" text={menuText(days)} onDone={() => setShare(false)} onPrint={() => printText("План на неделю", menuText(days))} />
        <button className="btn-ghost mt-2 w-full" onClick={() => { downloadIcs(planIcs(days, siteBase())); setShare(false); toast("Откройте файл — блюда появятся в календаре с напоминанием"); }}><CalendarPlus size={18} />В календарь телефона</button>
      </Sheet>
      <Sheet open={again} title="Составить план" onClose={() => setAgain(false)}>
        <div className="grid gap-2">
          <button className="btn-primary justify-start" onClick={() => { setAgain(false); make(); }}><Sparkles size={18} />Новый план — подберу блюда</button>
          {weeks.map((w) => (
            <div key={w.id} className="flex items-center gap-1">
              <button className="btn-outline min-w-0 flex-1 justify-start" onClick={() => {
                const had = filled; setAgain(false); save(applyWeek(w, days, servings));
                if (had) withUndo("Повторяю «" + w.name + "»"); else toast("Повторяю «" + w.name + "»");
              }}><Repeat2 size={18} /><span className="truncate">Повторить: {w.name}</span></button>
              <button className="icon-btn" onClick={() => { removeWeek(w.id); setWeeks(savedWeeks()); }} aria-label={"Удалить: " + w.name}><X size={18} /></button>
            </div>
          ))}
        </div>
      </Sheet>
      <Sheet open={!!poll} title="Опрос «Что на ужин?»" onClose={() => setPoll(null)}>
        {poll && (
          <>
            <p className="mb-3 text-body-sm text-ink-soft">Отправьте ссылку семье: каждый выберет блюдо на {dayLabel(poll.date).toLowerCase()}, без установки и регистрации. Голосование открыто 3 дня.</p>
            <ShareOptions title="Что приготовить на ужин?" text={"Что приготовить на ужин? Проголосуй: " + siteBase() + "#poll=" + poll.token} onDone={() => setPoll(null)} />
          </>
        )}
      </Sheet>
      {dinnerDay && (() => { const list = dinnerDishes(dinnerDay); return list.length >= 2 ? <DinnerSetup open base={list[0]} preset={list} onClose={() => setDinnerDay(null)} /> : null; })()}
    </div>
  );
}

function PlanSettings({ plan, servings, onChange }: { plan: MenuPlan; servings: number; onChange: (p: MenuPlan, servings: number) => void }) {
  const meals = ["breakfast", "lunch", "dinner"] as const;
  return (
    <div>
      <p className="label mb-2">Что планировать</p>
      <div className="flex flex-wrap gap-2">
        {meals.map((m) => (
          <Chip key={m} on={plan.meals.includes(m)} onClick={() => {
            const next = plan.meals.includes(m) ? plan.meals.filter((x) => x !== m) : meals.filter((x) => x === m || plan.meals.includes(x));
            if (next.length) onChange({ ...plan, meals: next }, servings);
          }}>{MEAL_LABELS[m]}</Chip>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3"><span className="text-body-sm">Сколько человек едят</span><Stepper value={servings} min={1} max={12} onChange={(n) => onChange(plan, n)} label="Едоков" /></div>
      <div className="mt-3 divide-y divide-line">
        <Toggle on={plan.quickWeekdays} onChange={(v) => onChange({ ...plan, quickWeekdays: v }, servings)} label="В будни — быстро" hint="Ужин до 40 минут с понедельника по пятницу" />
        <Toggle on={plan.cookAhead} onChange={(v) => onChange({ ...plan, cookAhead: v }, servings)} label="Готовить на два дня" hint="Вечером ужин, назавтра — обед без готовки" />
      </div>
    </div>
  );
}
