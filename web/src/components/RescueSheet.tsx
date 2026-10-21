// «Что-то не так?» in cooking (app/rescue): what went wrong with this dish, then 2–3 short actions and, where the
// answer has a wait, a timer button. Anything else goes to Шеф. The recipe's steps stay as they are.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChefHat, Clock } from "lucide-react";
import { track, type Recipe } from "../engine";
import { troublesFor, type Trouble } from "../app/rescue";
import { startTimer } from "../app/timers";
import { useStore } from "../app/store";
import { cue } from "../app/feedback";
import { Sheet } from "./ui";

export function RescueSheet({ open, recipe, onClose, onAsk }: { open: boolean; recipe: Recipe; onClose: () => void; onAsk: () => void }) {
  const { toast } = useStore();
  const list = useMemo(() => troublesFor(recipe), [recipe]);
  const [picked, setPicked] = useState<Trouble | null>(null);
  const close = () => { setPicked(null); onClose(); };
  const pick = (t: Trouble) => { cue("tap"); setPicked(t); track({ type: "rescue", recipeId: recipe.id, text: t.id }); };
  const timer = (t: Trouble) => {
    // Not tied to a step: it must not replace the step's own timer (a pilaf's hour of soaking).
    startTimer({ dish: recipe.title, recipeId: recipe.id, step: null, label: t.title, seconds: (t.minutes ?? 0) * 60 });
    toast("Таймер на " + t.minutes + " мин запущен");
    close();
  };
  return (
    <Sheet open={open} title={picked ? picked.title : "Что случилось?"} onClose={close}>
      {picked ? (
        <div className="pb-2">
          <ol className="space-y-3">
            {picked.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-body">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-warn-soft text-small font-semibold text-ink" aria-hidden>{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          {picked.minutes && <button className="btn-primary mt-5 h-13 w-full" onClick={() => timer(picked)}><Clock size={20} aria-hidden />Таймер на {picked.minutes} мин</button>}
          <button className="btn-ghost mt-2 w-full" onClick={() => setPicked(null)}><ChevronLeft size={18} aria-hidden />Другая беда</button>
        </div>
      ) : (
        <div className="pb-2">
          <ul className="grid gap-2">
            {list.map((t) => (
              <li key={t.id}>
                <button className="flex min-h-[52px] w-full items-center gap-3 rounded-input border border-line bg-card px-4 text-left text-body hover:border-line-strong" onClick={() => pick(t)}>
                  <span className="flex-1">{t.title}</span><ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button className="btn-ghost mt-2 w-full text-brand" onClick={() => { close(); onAsk(); }}><ChefHat size={18} aria-hidden />Другое — спросить Шефа</button>
        </div>
      )}
    </Sheet>
  );
}
