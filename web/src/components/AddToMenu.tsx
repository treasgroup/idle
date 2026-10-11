// "Add to menu": pick a day of the coming week for a recipe.
import { clampServings, dateKey, dayLabel, recipeById, weekDays } from "../engine";
import { useStore } from "../app/store";
import { Sheet } from "./ui";

/** Choose a day of the week menu for a recipe. */
export function AddToMenuSheet({ recipeId, servings, onClose }: { recipeId: string; servings?: number; onClose: () => void }) {
  const { s, update, toast, profile } = useStore();
  const recipe = recipeById(recipeId);
  if (!recipe) return null;
  const days = weekDays(s.menu);
  const add = (date: string) => {
    update((st) => {
      const menu = [...st.menu];
      const at = menu.findIndex((d) => d.date === date);
      const item = { recipeId: recipe.id, servings: clampServings(recipe, servings ?? profile.eaters) };
      if (at >= 0) menu[at] = { ...menu[at], items: [...menu[at].items, item].slice(0, 6) };
      else menu.push({ date, items: [item] });
      return { ...st, menu: menu.filter((d) => d.date >= dateKey(new Date())).sort((x, y) => x.date.localeCompare(y.date)).slice(0, 31) };
    });
    toast("Добавлено в меню: " + dayLabel(date).toLowerCase());
    onClose();
  };
  return (
    <Sheet open title="Добавить в меню" onClose={onClose}>
      <div className="grid gap-2">
        {days.map((d) => (
          <button key={d.date} className="flex min-h-[52px] items-center justify-between rounded-input border border-line bg-card px-4 text-left hover:border-line-strong/60" onClick={() => add(d.date)}>
            <span className="font-semibold">{dayLabel(d.date)}</span>
            <span className="text-caption text-ink-soft">{d.items.length ? d.items.map((i) => recipeById(i.recipeId)?.title).filter(Boolean).join(", ").slice(0, 40) : "пусто"}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
