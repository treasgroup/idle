// «Меню»: the week of dishes, the plan it is built from, and one tap to the shopping list.
import { useMemo, useState } from "react";
import {
  CalendarDays, ChevronDown, MoreHorizontal, RefreshCw, Settings2, Share2, ShoppingCart, Sparkles, Recycle, Plus, Vote, Trash2, BookOpen, CalendarPlus,
} from "lucide-react";
import {
  MEAL_LABELS, apiUrl, courseOf, dateKey, dayLabel, freshConditions, generateMenu, menuPlanSummary, menuShopping, menuText, nutritionOf, plural,
  rankRecipes, recipeById, recipes, regenerateDay, removeMenuItem, replaceMenuItem, sharedPerishables, siteBase, weekDays,
  type MenuDay, type MenuPlan, type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions, haveIds } from "../app/actions";
import { weekLeftovers, amountText } from "../app/nowaste";
import { replace, routeHash } from "../app/router";
import type { Profile } from "../app/profile";
import { RecipeImage, RecipeMeta } from "../components/RecipeCard";
import { Chip, Empty, Sheet, Stepper, Toggle, cx } from "../components/ui";
import { ShareOptions } from "./RecipeLayer";
import { printText } from "../app/print";

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

// Shopping rows the last «В покупки» created, so pressing it again rebuilds them instead of adding twice.
const MENU_ROWS = "cook-menu-shopping-v1";
const loadRows = (): string[] => { try { const v = JSON.parse(localStorage.getItem(MENU_ROWS) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveRows = (keys: string[]) => { try { localStorage.setItem(MENU_ROWS, JSON.stringify(keys)); } catch { /* ignore */ } };

export function Menu() {
  const { s, update, profile, setProfile, toast } = useStore();
  const { openRecipe } = useActions();
  const [settings, setSettings] = useState(false);
  const [share, setShare] = useState(false);
  const [dayMenu, setDayMenu] = useState<string | null>(null);
  const [itemMenu, setItemMenu] = useState<{ date: string; index: number } | null>(null);
  const [poll, setPoll] = useState<{ token: string; date: string } | null>(null);
  const [noWaste, setNoWaste] = useState(false);
  const servings = profile.eaters;
  const today = dateKey(new Date());
  const days = weekDays(s.menu);
  const filled = days.some((d) => d.items.length);
  const plan: MenuPlan = s.menuPlan;
  const enginePlan = { ...plan, only: goalFilter(profile) } as MenuPlan;
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

  const toShopping = () => {
    const prev = loadRows();
    const kept = s.shopping.filter((x) => x.checked || !prev.includes(x.key));
    const fresh = menuShopping(days, [], haveIds(s)).filter((f) => !kept.some((k) => k.key === f.key));
    saveRows(fresh.map((f) => f.key));
    update((st) => {
      const rest = st.shopping.filter((x) => x.checked || !prev.includes(x.key));
      return { ...st, shopping: [...rest, ...fresh.filter((f) => !rest.some((k) => k.key === f.key))] };
    });
    toast("Продукты на неделю — в списке покупок", { label: "Открыть", run: () => replace(routeHash({ tab: "shopping" })) });
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

  const planChips = [menuPlanSummary(plan), servings + " " + plural(servings, "человек", "человека", "человек")];

  return (
    <div className="pt-4 sm:pt-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-h1">План на неделю</h1>
        {filled && <button className="icon-btn -mr-2" onClick={() => setShare(true)} aria-label="Поделиться планом"><Share2 size={20} /></button>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {planChips.map((c) => <span key={c} className="inline-flex h-9 items-center rounded-full bg-sunken px-3 text-small text-ink-soft">{c}</span>)}
        <button className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-small font-semibold text-brand hover:bg-brand-soft" onClick={() => setSettings(true)}><Settings2 size={16} aria-hidden />Настроить</button>
      </div>

      {!filled ? (
        <div className="mt-6">
          <Empty icon={<CalendarDays size={48} />} title="Составлю план за секунду"
            actions={<button className="btn-primary h-13" onClick={make}><Sparkles size={18} />Составить план</button>}>
            Блюда без повторов, в будни — быстрые, с общими продуктами, чтобы ничего не пропадало. Список покупок соберётся сам.
          </Empty>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary flex-1 sm:flex-none" onClick={toShopping}><ShoppingCart size={18} />В покупки</button>
            <button className="btn-outline" onClick={make}><RefreshCw size={18} />Заново</button>
          </div>

          <div className="mt-6 grid gap-3 xl:grid-cols-2">
            {days.map((d) => (
              <section key={d.date} className="card p-3" aria-label={dayLabel(d.date)}>
                <div className="flex items-center justify-between gap-2 pl-1">
                  <h2 className={cx("text-title", d.date === today && "text-brand")}>{dayLabel(d.date)}</h2>
                  <button className="icon-btn -mr-1" onClick={() => setDayMenu(d.date)} aria-label={"Действия: " + dayLabel(d.date)}><MoreHorizontal size={20} /></button>
                </div>
                {d.items.length === 0 ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <button className="btn-soft" onClick={() => save(regenerateDay(days, d.date, s.preferences, servings, Date.now(), enginePlan))}><Sparkles size={16} />Подобрать блюдо</button>
                    <button className="btn-outline" onClick={() => replace(routeHash({ tab: "recipes" }))}><BookOpen size={16} />Выбрать из рецептов</button>
                  </div>
                ) : d.items.map((it, n) => {
                  const r = recipeById(it.recipeId);
                  if (!r) return null;
                  return (
                    <div key={n} className="flex items-center gap-2 border-t border-line py-2 first-of-type:border-0">
                      <button className="flex min-w-0 flex-1 items-center gap-3 rounded-input text-left" onClick={() => openRecipe(r)}>
                        <RecipeImage recipe={r} className="h-14 w-14 shrink-0" />
                        <span className="min-w-0">
                          <span className="label block">{MEAL_LABELS[it.meal ?? "dinner"] ?? "Ужин"}{it.leftover ? " · разогреть" : " · " + it.servings + " порц."}</span>
                          <span className="line-clamp-2 text-body-sm font-semibold leading-snug">{r.title}</span>
                          {!it.leftover && <RecipeMeta recipe={r} size="caption" showDifficulty={false} />}
                        </span>
                      </button>
                      {!it.leftover && <button className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-2 text-small text-ink-soft hover:bg-sunken" onClick={() => { save(replaceMenuItem(days, d.date, n, s.preferences, servings, Date.now(), enginePlan)); withUndo("Блюдо заменено"); }}><RefreshCw size={16} aria-hidden />Заменить</button>}
                      <button className="icon-btn -mr-1 shrink-0" onClick={() => setItemMenu({ date: d.date, index: n })} aria-label={"Ещё: " + r.title}><MoreHorizontal size={18} /></button>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
          {days.some((d) => !d.items.length) && <button className="btn-ghost mt-3" onClick={fill}><Plus size={18} />Заполнить пустые дни</button>}

          {(shared.length > 0 || leftovers.length > 0) && (
            <section className="card mt-6 overflow-hidden">
              <button className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" onClick={() => setNoWaste((v) => !v)} aria-expanded={noWaste}>
                <Recycle size={20} className="shrink-0 text-herb" aria-hidden />
                <span className="flex-1">
                  <span className="block text-title">Без остатков</span>
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
      <Sheet open={!!dayMenu} title={dayMenu ? dayLabel(dayMenu) : ""} onClose={() => setDayMenu(null)}>
        {dayMenu && (
          <div className="grid gap-2">
            <button className="btn-outline justify-start" onClick={() => { save(regenerateDay(days, dayMenu, s.preferences, servings, Date.now(), enginePlan)); withUndo("День пересобран"); setDayMenu(null); }}><RefreshCw size={18} />Пересобрать день</button>
            <button className="btn-outline justify-start" onClick={() => { setDayMenu(null); replace(routeHash({ tab: "recipes" })); }}><Plus size={18} />Добавить блюдо из рецептов</button>
            <button className="btn-outline justify-start" onClick={() => { const d = dayMenu; setDayMenu(null); void startPoll(d); }}><Vote size={18} />Спросить семью</button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!itemMenu} title={itemMenu ? recipeById(days.find((d) => d.date === itemMenu.date)?.items[itemMenu.index]?.recipeId ?? "")?.title ?? "Блюдо" : ""} onClose={() => setItemMenu(null)}>
        {itemMenu && (
          <div className="grid gap-2">
            <button className="btn-outline justify-start" onClick={() => { save(replaceMenuItem(days, itemMenu.date, itemMenu.index, s.preferences, servings, Date.now(), enginePlan)); setItemMenu(null); }}><RefreshCw size={18} />Заменить другим</button>
            <button className="btn-outline justify-start text-brand" onClick={() => { save(removeMenuItem(days, itemMenu.date, itemMenu.index, servings)); withUndo("Блюдо убрано"); setItemMenu(null); }}><Trash2 size={18} />Убрать из плана</button>
          </div>
        )}
      </Sheet>
      <Sheet open={share} title="Поделиться планом" onClose={() => setShare(false)}>
        <ShareOptions title="План на неделю" text={menuText(days)} onDone={() => setShare(false)} onPrint={() => printText("План на неделю", menuText(days))} />
      </Sheet>
      <Sheet open={!!poll} title="Опрос «Что на ужин?»" onClose={() => setPoll(null)}>
        {poll && (
          <>
            <p className="mb-3 text-body-sm text-ink-soft">Отправьте ссылку семье: каждый выберет блюдо на {dayLabel(poll.date).toLowerCase()}, без установки и регистрации. Голосование открыто 3 дня.</p>
            <ShareOptions title="Что приготовить на ужин?" text={"Что приготовить на ужин? Проголосуй: " + siteBase() + "#poll=" + poll.token} onDone={() => setPoll(null)} />
          </>
        )}
      </Sheet>
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
