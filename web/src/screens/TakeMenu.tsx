// «Взять это меню себе»: a VK post «Меню на неделю» links to shefly.ru/?m=<code>; the app (App.tsx) gets the
// dishes and opens the plan with this sheet — the week's dinners from today, and the products to the shopping list in
// the same tap. Dinners already planned on those days are replaced; «Отменить» in the toast brings them back.
import { useState } from "react";
import { recipeById, type MenuDay } from "../engine";
import { timeShort } from "../app/recipeTime";
import { Sheet, Toggle } from "../components/ui";

export const TAKE_MENU = "cook-take-menu";

export function readTakeMenu(): string[] | null {
  try { const v = JSON.parse(sessionStorage.getItem(TAKE_MENU) || "null"); return Array.isArray(v) && v.length ? v : null; } catch { return null; }
}
export function dropTakeMenu(): void { try { sessionStorage.removeItem(TAKE_MENU); } catch { /* private mode */ } }

export function TakeMenu({ ids, days, dayShort, onTake, onClose }: {
  ids: string[]; days: MenuDay[]; dayShort: (date: string) => string;
  onTake: (shopping: boolean) => void; onClose: () => void;
}) {
  const [shopping, setShopping] = useState(true);
  const rows = ids.map((id, i) => ({ day: days[i], r: recipeById(id) })).filter((x) => x.day && x.r);
  const replaces = rows.some(({ day }) => day.items.some((it) => (it.meal ?? "dinner") === "dinner"));
  return (
    <Sheet open title="Меню на неделю" onClose={onClose}>
      <p className="text-body-sm text-ink-soft">{rows.length} {rows.length === 1 ? "ужин" : rows.length < 5 ? "ужина" : "ужинов"} — с сегодняшнего дня, по одному на день.</p>
      <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-card">
        {rows.map(({ day, r }) => (
          <li key={day.date} className="flex items-center gap-3 px-3 py-2.5">
            <span className="w-16 shrink-0 text-caption font-semibold text-ink-soft">{dayShort(day.date)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-body-sm">{r!.title}</span><span className="block text-caption text-ink-soft">{timeShort(r!)}</span></span>
          </li>
        ))}
      </ul>
      <div className="mt-3"><Toggle on={shopping} onChange={() => setShopping((x) => !x)} label="Продукты — сразу в покупки" hint="Только то, чего нет дома" /></div>
      {replaces && <p className="mt-2 text-small text-ink-soft">Ужины, что уже стоят на эти дни, заменятся — вернуть можно кнопкой «Отменить».</p>}
      <div className="mt-4 grid gap-2">
        <button className="btn-primary h-13" disabled={!rows.length} onClick={() => onTake(shopping)}>Поставить в план</button>
        <button className="btn-ghost h-11" onClick={onClose}>Не сейчас</button>
      </div>
    </Sheet>
  );
}
