// «Ваш октябрь» on the home screen (first week of a month): a few calm lines about the month before, and ✕ to hide it.
import { useState } from "react";
import { CalendarHeart, X } from "lucide-react";
import { plural, recipeById } from "../engine";
import { useStore } from "../app/store";
import { useActions } from "../app/actions";
import { monthLook } from "../app/month";

const KEY = "cook-month-seen";

export function MonthCard() {
  const { s } = useStore();
  const { openRecipe } = useActions();
  const look = monthLook(s.book);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  if (!look || hidden === look.key) return null;
  const hide = () => { try { localStorage.setItem(KEY, look.key); } catch { /* ignore */ } setHidden(look.key); };
  const fav = look.favorite && recipeById(look.favorite.id);
  return (
    <section className="card mt-5 flex items-start gap-3 p-4" aria-label={"Ваш " + look.name}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden><CalendarHeart size={20} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-title">Ваш {look.name}</h2>
        <p className="mt-1 text-body-sm text-ink-soft">
          В {look.inName} вы приготовили {look.cooked} {plural(look.cooked, "блюдо", "блюда", "блюд")}
          {look.firstTime > 0 && <>, из них {look.firstTime} — впервые</>}.
          {look.course && <> Чаще всего — {look.course}.</>}
        </p>
        {fav && (
          <p className="mt-1 text-body-sm text-ink-soft">
            Любимое: <button className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:text-brand" onClick={() => openRecipe(fav)}>{fav.title}</button>
            {" — "}{look.favorite!.times} {plural(look.favorite!.times, "раз", "раза", "раз")}
          </p>
        )}
      </div>
      <button className="icon-btn -mr-2 -mt-2 shrink-0" onClick={hide} aria-label="Скрыть"><X size={18} /></button>
    </section>
  );
}
