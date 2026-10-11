import { useEffect, useMemo, useState } from "react";
import { Heart, Share2, ShoppingCart, CalendarPlus, ChefHat, Check, Snowflake, Refrigerator, Users, Leaf, Baby, Info } from "lucide-react";
import {
  basics, clampServings, dateKey, displayName, dayLabel, formatAmount, ingredient, ingredientMatches, isLenten, nutritionOf, recipeById, recipePageUrl,
  scaleIngredient, shareLink, similarRecipes, suggestSides, needsSide, withSide, yieldText, copyText, canShare, SHARE_TARGETS, weekDays,
  clampServings as clamp, LABELS, type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions, haveIds } from "../app/actions";
import { RecipeImage, RecipeMeta, RecipeTile } from "../components/RecipeCard";
import { Chip, Layer, Section, Sheet, Stepper, cx } from "../components/ui";
import { Reviews } from "./Reviews";

export function RecipeLayer({ id, onClose }: { id: string; onClose: () => void }) {
  const { catalog } = useStore();
  const base = recipeById(id);
  if (!base && catalog.version === 0) return <Layer title="Рецепт" onClose={onClose}><div className="p-6 text-center text-ink-faint">Загружаю рецепт…</div></Layer>;
  if (!base) return (
    <Layer title="Рецепт" onClose={onClose}>
      <div className="p-6 text-center text-ink-soft">Этого рецепта больше нет в каталоге.</div>
    </Layer>
  );
  return <RecipeView key={id} base={base} onClose={onClose} />;
}

function RecipeView({ base, onClose }: { base: Recipe; onClose: () => void }) {
  const { s, update, profile, toast } = useStore();
  const { isFavorite, toggleFavorite, addRecipeToShopping, startCooking, openRecipe } = useActions();
  const [servings, setServings] = useState(() => clampServings(base, s.conditions.servings || profile.eaters));
  const [sideId, setSideId] = useState<string | null>(null);
  const sides = useMemo(() => (needsSide(base) ? suggestSides(base, s.preferences.excluded) : []), [base, s.preferences.excluded]);
  const side = sides.find((x) => x.id === sideId) ?? null;
  const recipe = side ? withSide(base, side) : base;
  const [have, setHave] = useState<string[]>(() => haveIds(s));
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const nutrition = nutritionOf(base).perServing;
  const fav = isFavorite(base.id);
  const staples = basics(s.preferences);
  const related = useMemo(() => similarRecipes(base, (r) => !s.preferences.excluded.some((e) => r.allergens.includes(e)), 6), [base, s.preferences.excluded]);
  const note = s.notes[base.id] ?? "";

  const scaled = recipe.ingredients.map((i) => scaleIngredient(i, recipe, servings));
  const hasIt = (iid: string) => staples.has(iid) || have.some((h) => ingredientMatches(iid, h));
  const missing = scaled.filter((i) => !i.optional && i.id !== "water" && !hasIt(i.id));
  const toggleHave = (iid: string) => setHave((h) => (h.includes(iid) ? h.filter((x) => x !== iid) : [...h, iid]));

  useEffect(() => { document.title = base.title + " — Что приготовить?"; return () => { document.title = "Что приготовить?"; }; }, [base.title]);

  const flags = [
    base.tags.includes("vegetarian") && { icon: <Leaf size={14} />, label: "Без мяса" },
    isLenten(base) && { icon: <Leaf size={14} />, label: "Постное" },
    base.kids && { icon: <Baby size={14} />, label: "Можно детям" },
    base.storageDays ? { icon: <Refrigerator size={14} />, label: "Хранится " + base.storageDays + " дн." } : null,
    base.freezerDays ? { icon: <Snowflake size={14} />, label: "Можно заморозить" } : null,
    base.budget === "low" && { icon: <span>💰</span>, label: "Бюджетно" },
  ].filter(Boolean) as { icon: JSX.Element; label: string }[];

  return (
    <Layer title={base.title} onClose={onClose} actions={
      <>
        <button className="btn-ghost px-2" onClick={() => setShareOpen(true)} aria-label="Поделиться"><Share2 size={20} /></button>
        <button className="btn-ghost px-2" onClick={() => toggleFavorite(base)} aria-label={fav ? "Убрать из сохранённого" : "Сохранить"}>
          <Heart size={20} className={cx(fav && "fill-brand text-brand")} />
        </button>
      </>
    }>
      <div className="pb-28">
        <RecipeImage recipe={base} className="h-56 w-full sm:h-72" rounded="rounded-none" />
        <div className="px-4 pt-4">
          <h1 className="text-2xl font-semibold leading-tight">{base.title}</h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">{base.summary}</p>
          <div className="mt-2.5"><RecipeMeta recipe={base} /></div>
          {flags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{flags.map((f) => <span key={f.label} className="inline-flex items-center gap-1 rounded-full bg-herb-soft px-2.5 py-1 text-xs text-herb">{f.icon}{f.label}</span>)}</div>}
        </div>

        {/* Nutrition */}
        {nutrition.kcal > 0 && (
          <div className="mx-4 mt-4 grid grid-cols-4 gap-2 text-center">
            {[["ккал", nutrition.kcal], ["белки", nutrition.protein], ["жиры", nutrition.fat], ["углев.", nutrition.carbs]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-card px-1 py-2 shadow-card"><div className="text-lg font-semibold tabular-nums">{v}</div><div className="text-[11px] text-ink-faint">{l}{l !== "ккал" ? ", г" : ""}</div></div>
            ))}
            <div className="col-span-4 text-left text-[11px] text-ink-faint">На порцию, расчёт по составу. {base.allergens.length ? "Аллергены: " + base.allergens.map((a) => (LABELS[a === "milk" ? "dairy" : a === "egg" ? "eggs" : a] || a).toLowerCase()).join(", ") + "." : "Основных аллергенов нет."}</div>
          </div>
        )}

        {/* Ingredients */}
        <Section title="Продукты" action={<Stepper value={servings} min={base.minServings} max={base.maxServings} onChange={setServings} label="Порции" />}>
          <div className="px-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-ink-faint"><Users size={13} /> {servings} порц.{base.yields ? " · " + yieldText(base, servings) : ""} · отметьте, что есть дома</div>
            <ul className="card divide-y divide-line/60">
              {scaled.map((i) => {
                const own = hasIt(i.id);
                const swaps = (i.swap || []).map((x) => ingredient(x)?.name).filter(Boolean);
                return (
                  <li key={i.id + i.unit}>
                    <button className="flex w-full items-start gap-3 px-3 py-2.5 text-left" onClick={() => toggleHave(i.id)} aria-pressed={own}>
                      <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border", own ? "border-herb bg-herb text-white" : "border-line")}>{own && <Check size={13} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cx("text-[15px]", own && "text-ink-soft")}>{displayName(i.id, i.name)}{i.optional && <span className="text-ink-faint"> (по желанию)</span>}</span>
                        {i.name.toLowerCase() !== displayName(i.id, i.name).toLowerCase() && <span className="block text-xs text-ink-faint">{i.name}</span>}
                        {swaps.length > 0 && <span className="block text-xs text-ink-faint">можно заменить: {swaps.join(", ").toLowerCase()}</span>}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-ink-soft">{formatAmount(i.amount, i.unit)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {missing.length > 0 && (
              <button className="btn-soft mt-3 w-full" onClick={() => addRecipeToShopping(recipe, servings, have)}>
                <ShoppingCart size={17} className="shrink-0" /> Докупить недостающее · {missing.length}
              </button>
            )}
          </div>
        </Section>

        {sides.length > 0 && (
          <Section title="Гарнир">
            <div className="scroll-x px-4">
              <Chip on={!sideId} onClick={() => setSideId(null)}>Без гарнира</Chip>
              {sides.map((x) => <Chip key={x.id} on={sideId === x.id} onClick={() => setSideId(x.id)}>{x.title}</Chip>)}
            </div>
            {side && <p className="px-4 pt-2 text-xs text-ink-faint">Гарнир добавлен в продукты и шаги — приготовите всё вместе.</p>}
          </Section>
        )}

        {/* Steps */}
        <Section title={"Как готовить · " + recipe.steps.length + " шагов"}>
          <ol className="space-y-3 px-4">
            {recipe.steps.map((st, n) => (
              <li key={n} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">{n + 1}</span>
                <p className="pt-0.5 text-[15px] leading-relaxed">{st.text}{st.timerSeconds ? <span className="ml-1.5 whitespace-nowrap rounded-full bg-warn-soft px-2 py-0.5 text-xs text-warn">⏱ {Math.round(st.timerSeconds / 60)} мин</span> : null}</p>
              </li>
            ))}
          </ol>
        </Section>

        {base.tips.length > 0 && (
          <Section title="Советы">
            <ul className="mx-4 space-y-2 rounded-xl2 bg-herb-soft/60 p-4 text-[15px]">{base.tips.map((t) => <li key={t} className="flex gap-2"><Info size={16} className="mt-0.5 shrink-0 text-herb" />{t}</li>)}</ul>
          </Section>
        )}

        <Section title="Моя заметка">
          <div className="px-4">
            <textarea className="input min-h-[72px]" placeholder="Например: соли меньше, добавить чеснок" defaultValue={note} maxLength={500}
              onBlur={(e) => { const v = e.target.value.trim(); if (v !== note) update((st) => { const notes = { ...st.notes }; if (v) notes[base.id] = v; else delete notes[base.id]; return { ...st, notes }; }); }} />
          </div>
        </Section>

        <Reviews recipe={base} />

        {(related.variants.length > 0 || related.similar.length > 0) && (
          <Section title={related.variants.length ? "Другие варианты и похожие" : "Похожие блюда"}>
            <div className="scroll-x px-4">{[...related.variants, ...related.similar].slice(0, 8).map((r) => <RecipeTile key={r.id} recipe={r} onOpen={() => openRecipe(r)} />)}</div>
          </Section>
        )}

        {base.sources && base.sources.length > 0 && (
          <div className="px-4 pt-6 text-xs text-ink-faint">Источники: {base.sources.map((src, k) => <span key={k}>{k > 0 && "; "}{src.url ? <a className="underline" href={src.url} target="_blank" rel="noopener noreferrer nofollow">{src.title}</a> : src.title}</span>)}</div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl gap-2 border-t border-line/60 bg-paper/95 px-4 py-3 backdrop-blur">
        <button className="btn-outline" onClick={() => setMenuOpen(true)} aria-label="В меню"><CalendarPlus size={18} /></button>
        <button className="btn-primary flex-1 py-3 text-base" onClick={() => startCooking(recipe, servings)}><ChefHat size={19} /> Готовить</button>
      </div>

      <AddToMenu open={menuOpen} onClose={() => setMenuOpen(false)} recipe={base} servings={servings} />
      <Sheet open={shareOpen} title="Поделиться рецептом" onClose={() => setShareOpen(false)}>
        <ShareOptions text={"«" + base.title + "» — рецепт: " + recipePageUrl(base.id)} title={base.title} url={recipePageUrl(base.id)} onDone={() => { setShareOpen(false); toast("Ссылка готова"); }} />
      </Sheet>
    </Layer>
  );
}

function AddToMenu({ open, onClose, recipe, servings }: { open: boolean; onClose: () => void; recipe: Recipe; servings: number }) {
  const { s, update, toast } = useStore();
  const days = weekDays(s.menu);
  const add = (date: string) => {
    update((st) => {
      const menu = [...st.menu];
      const at = menu.findIndex((d) => d.date === date);
      const item = { recipeId: recipe.id, servings: clamp(recipe, servings) };
      if (at >= 0) menu[at] = { ...menu[at], items: [...menu[at].items, item].slice(0, 6) };
      else menu.push({ date, items: [item] });
      return { ...st, menu: menu.filter((d) => d.date >= dateKey(new Date())).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 31) };
    });
    toast("Добавлено в меню: " + dayLabel(date).toLowerCase());
    onClose();
  };
  return (
    <Sheet open={open} title="Добавить в меню" onClose={onClose}>
      <div className="grid gap-2">
        {days.map((d) => (
          <button key={d.date} className="card flex items-center justify-between px-4 py-3 text-left" onClick={() => add(d.date)}>
            <span className="font-medium">{dayLabel(d.date)}</span>
            <span className="text-xs text-ink-faint">{d.items.length ? d.items.length + " блюд" : "пусто"}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function ShareOptions({ text, title, url, onDone }: { text: string; title: string; url?: string; onDone: () => void }) {
  return (
    <div className="grid gap-2">
      {canShare() && <button className="btn-primary" onClick={() => navigator.share({ title, text, ...(url ? { url } : {}) }).then(onDone).catch(() => {})}>Отправить…</button>}
      {SHARE_TARGETS.map((t) => (
        <button key={t.id} className="btn-outline" onClick={async () => {
          const l = shareLink(t.id, text);
          if (l.copyFirst) await copyText(text);
          window.open(l.url, "_blank", "noopener");
          onDone();
        }}>{t.label}</button>
      ))}
      <button className="btn-ghost" onClick={async () => { await copyText(text); onDone(); }}>Скопировать текст</button>
    </div>
  );
}
