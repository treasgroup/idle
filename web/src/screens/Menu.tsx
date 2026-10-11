import { useMemo, useState } from "react";
import { CalendarDays, RefreshCw, Trash2, Settings2, ShoppingCart, Share2, Vote, Leaf, Sparkles, Recycle } from "lucide-react";
import {
  MEAL_LABELS, dateKey, dayLabel, generateMenu, menuPlanSummary, menuShopping, menuText, recipeById, regenerateDay, removeMenuItem,
  replaceMenuItem, sharedPerishables, siteBase, weekDays, rankRecipes, freshConditions, recipes, apiUrl, type MenuDay, type MenuPlan,
} from "../engine";
import { useStore } from "../app/store";
import { useActions, haveIds } from "../app/actions";
import { weekLeftovers, amountText } from "../app/nowaste";
import { courseOf, nutritionOf, type Recipe } from "../engine";
import type { Profile } from "../app/profile";

/** The person's goals narrow the dishes a menu is made of. */
function goalFilter(p: Profile, cheaper = false): ((r: Recipe) => boolean) | undefined {
  const tests: ((r: Recipe) => boolean)[] = [];
  if (cheaper) tests.push((r) => r.budget === "low");
  else if (p.goals.includes("budget")) tests.push((r) => r.budget !== "high");
  if (p.goals.includes("light")) tests.push((r) => { const k = nutritionOf(r).perServing.kcal; return k > 0 && k <= 600; });
  if (p.goals.includes("protein")) tests.push((r) => courseOf(r) === "breakfast" || nutritionOf(r).perServing.protein >= 20);
  if (p.level === "beginner") tests.push((r) => r.difficulty !== "hard");
  if (p.kids || p.goals.includes("family")) tests.push((r) => r.kids !== false);
  return tests.length ? (r) => tests.every((t) => t(r)) : undefined;
}
import { RecipeImage, RecipeMeta } from "../components/RecipeCard";
import { Chip, Empty, Section, Sheet, Stepper, Toggle, cx } from "../components/ui";
import { ShareOptions } from "./RecipeLayer";

export function Menu() {
  const { s, update, profile, setProfile, toast } = useStore();
  const { openRecipe } = useActions();
  const [settings, setSettings] = useState(false);
  const [share, setShare] = useState(false);
  const [poll, setPoll] = useState<{ token: string; date: string } | null>(null);
  const servings = profile.eaters;
  const today = dateKey(new Date());
  const days = weekDays(s.menu);
  const filled = days.some((d) => d.items.length);
  const plan = { ...s.menuPlan, only: goalFilter(profile) } as typeof s.menuPlan;
  const save = (menu: MenuDay[]) => update((st) => ({ ...st, menu: menu.filter((d) => d.date >= today && d.items.length).slice(0, 31) }));

  const shared = useMemo(() => (filled ? sharedPerishables(days) : []), [days, filled]);
  const leftovers = useMemo(() => (filled ? weekLeftovers(s, days) : []), [s, days, filled]);

  const make = (cheaper = false) => {
    const empty = days.map((d) => ({ date: d.date, items: [] }));
    save(generateMenu(empty, s.preferences, servings, Date.now(), cheaper ? ({ ...plan, only: goalFilter(profile, true) } as typeof plan) : plan));
    toast(cheaper ? "Собрал меню из бюджетных блюд." : "Меню готово. Любое блюдо можно заменить.");
  };

  const fill = () => save(generateMenu(days, s.preferences, servings, Date.now(), plan));

  const toShopping = () => {
    const titles = new Set(days.flatMap((d) => d.items.map((i) => recipeById(i.recipeId)?.title).filter(Boolean) as string[]));
    update((st) => {
      // Items that came from this menu earlier are rebuilt, the rest of the list stays as it is.
      const kept = st.shopping.filter((x) => x.checked || !x.recipes?.length || !x.recipes.every((t) => titles.has(t)));
      return { ...st, shopping: menuShopping(days, kept, haveIds(st)) };
    });
    toast("Продукты на неделю — в списке покупок");
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

  return (
    <div className="pb-8">
      <div className="flex items-end justify-between gap-3 px-4 pt-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Меню на неделю</h1>
          <button className="mt-0.5 inline-flex items-center gap-1 text-sm text-ink-soft" onClick={() => setSettings(true)}><Settings2 size={14} />{menuPlanSummary(plan)} · {servings} порц.</button>
        </div>
        {filled && <button className="btn-ghost px-2" onClick={() => setShare(true)} aria-label="Поделиться меню"><Share2 size={20} /></button>}
      </div>

      {!filled ? (
        <>
          <Empty icon={<CalendarDays size={32} />} title="Составлю меню за секунду">
            Блюда без повторов, в будни — быстрые, с общими продуктами, чтобы ничего не пропадало. Список покупок соберётся сам.
          </Empty>
          <div className="mt-4 px-4"><button className="btn-primary w-full py-3 text-base" onClick={() => make()}><Sparkles size={18} /> Составить меню</button></div>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 px-4">
            <button className="btn-primary" onClick={toShopping}><ShoppingCart size={17} /> В покупки</button>
            <button className="btn-outline" onClick={() => make()}><RefreshCw size={16} /> Новое меню</button>
          </div>
          {profile.goals.includes("budget") && (
            <button className="mx-4 mt-2 text-sm font-semibold text-brand" onClick={() => make(true)}>Собрать из самых бюджетных блюд</button>
          )}

          {(shared.length > 0 || leftovers.length > 0) && (
            <Section title={<span className="flex items-center gap-2"><Recycle size={18} className="text-herb" /> Без остатков</span>}>
              <div className="mx-4 space-y-3 rounded-xl2 bg-herb-soft/70 p-4 text-sm">
                {shared.length > 0 && <p><Leaf size={14} className="mr-1 inline text-herb" />Одна покупка на несколько блюд: {shared.slice(0, 4).map((x) => x.name.toLowerCase() + " — в " + x.dishes).join(", ")}.</p>}
                {leftovers.map((l) => (
                  <div key={l.id}>
                    <p><b>{l.name}</b>: нужно {amountText(l.need, l.unit)}, купите {l.buy} — останется ≈ {amountText(l.left, l.unit)}.</p>
                    {l.ideas.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{l.ideas.map((r) => <button key={r.id} className="chip bg-card py-1 text-xs" onClick={() => openRecipe(r)}>{r.title}</button>)}</div>}
                  </div>
                ))}
                {leftovers.length > 0 && <p className="text-xs text-ink-soft">Добавьте одно из этих блюд в меню — остаток не пропадёт.</p>}
              </div>
            </Section>
          )}

          <div className="mt-5 space-y-3 px-4">
            {days.map((d) => (
              <div key={d.date} className="card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className={cx("font-serif text-lg font-semibold", d.date === today && "text-brand")}>{dayLabel(d.date)}</h3>
                  <div className="flex">
                    <button className="btn-ghost px-2 py-1.5" onClick={() => startPoll(d.date)} aria-label="Спросить семью"><Vote size={17} /></button>
                    <button className="btn-ghost px-2 py-1.5" onClick={() => save(regenerateDay(days, d.date, s.preferences, servings, Date.now(), plan))} aria-label="Другие блюда на этот день"><RefreshCw size={16} /></button>
                  </div>
                </div>
                {d.items.length === 0 ? (
                  <button className="w-full rounded-xl border border-dashed border-line py-3 text-sm text-ink-faint" onClick={fill}>Заполнить пустые дни</button>
                ) : d.items.map((it, n) => {
                  const r = recipeById(it.recipeId);
                  if (!r) return null;
                  return (
                    <div key={n} className="flex items-center gap-3 border-t border-line/50 py-2 first:border-0">
                      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => openRecipe(r)}>
                        <RecipeImage recipe={r} className="h-14 w-14 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{MEAL_LABELS[it.meal ?? "dinner"] ?? "Ужин"}{it.leftover ? " · разогреть" : " · " + it.servings + " порц."}</span>
                          <span className="line-clamp-2 font-medium leading-snug">{r.title}</span>
                          {!it.leftover && <RecipeMeta recipe={r} compact />}
                        </span>
                      </button>
                      {!it.leftover && <button className="btn-ghost px-2" onClick={() => save(replaceMenuItem(days, d.date, n, s.preferences, servings, Date.now(), plan))} aria-label="Заменить"><RefreshCw size={16} /></button>}
                      <button className="btn-ghost px-2" onClick={() => save(removeMenuItem(days, d.date, n, servings))} aria-label="Убрать"><Trash2 size={16} /></button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      <Sheet open={settings} title="Как планировать" onClose={() => setSettings(false)}>
        <PlanSettings plan={plan} servings={servings}
          onChange={(p, n) => { update((st) => ({ ...st, menuPlan: p })); setProfile((x) => ({ ...x, eaters: n })); }} />
      </Sheet>
      <Sheet open={share} title="Поделиться меню" onClose={() => setShare(false)}>
        <ShareOptions title="Меню на неделю" text={menuText(days)} onDone={() => setShare(false)} />
      </Sheet>
      <Sheet open={!!poll} title="Опрос «Что на ужин?»" onClose={() => setPoll(null)}>
        {poll && (
          <>
            <p className="mb-3 text-sm text-ink-soft">Отправьте ссылку семье: каждый выберет блюдо на {dayLabel(poll.date).toLowerCase()}, без установки и регистрации. Голосование открыто 3 дня.</p>
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
      <div className="label mb-2">Что планировать</div>
      <div className="flex flex-wrap gap-2">
        {meals.map((m) => (
          <Chip key={m} on={plan.meals.includes(m)} onClick={() => {
            const next = plan.meals.includes(m) ? plan.meals.filter((x) => x !== m) : meals.filter((x) => x === m || plan.meals.includes(x));
            if (next.length) onChange({ ...plan, meals: next }, servings);
          }}>{MEAL_LABELS[m]}</Chip>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between"><span>Сколько человек едят</span><Stepper value={servings} min={1} max={12} onChange={(n) => onChange(plan, n)} label="Едоков" /></div>
      <div className="mt-2 divide-y divide-line/60">
        <Toggle on={plan.quickWeekdays} onChange={(v) => onChange({ ...plan, quickWeekdays: v }, servings)} label="В будни — быстро" hint="Ужин до 40 минут с понедельника по пятницу" />
        <Toggle on={plan.cookAhead} onChange={(v) => onChange({ ...plan, cookAhead: v }, servings)} label="Готовить на два дня" hint="Вечером ужин, назавтра — обед без готовки" />
      </div>
    </div>
  );
}
