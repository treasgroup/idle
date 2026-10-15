// «Успеть к сроку»: pick when the dish should be on the table — the sheet says when to start and can remind.
import { useMemo, useState } from "react";
import { BellRing, ChefHat } from "lucide-react";
import { formatMinutes } from "../engine";
import { startTimer } from "../app/timers";
import { useStore } from "../app/store";
import { Chip, Sheet } from "./ui";

const hhmm = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

/** Times worth offering: the nearest half-hour you can still make, then every half-hour for three hours. */
function choices(minutes: number, now = new Date()): Date[] {
  const first = new Date(now.getTime() + minutes * 60e3);
  first.setSeconds(0, 0);
  first.setMinutes(Math.ceil(first.getMinutes() / 30) * 30);
  return Array.from({ length: 6 }, (_, i) => new Date(first.getTime() + i * 30 * 60e3));
}

export function ServeBySheet({ open, onClose, title, recipeId, minutes, onCook }: {
  open: boolean; onClose: () => void; title: string; recipeId: string; minutes: number; onCook: () => void;
}) {
  const { toast } = useStore();
  const options = useMemo(() => (open ? choices(minutes) : []), [open, minutes]);
  const [at, setAt] = useState<Date | null>(null);
  const serve = at ?? options[1] ?? null;
  if (!open || !serve) return null;
  const start = new Date(serve.getTime() - minutes * 60e3);
  const wait = Math.round((start.getTime() - Date.now()) / 60e3);
  const remind = () => {
    startTimer({ dish: title, recipeId, label: "Пора начинать — к " + hhmm(serve), seconds: wait * 60 });
    toast("Напомню в " + hhmm(start) + ". Не закрывайте сайт — сигнал прозвучит здесь.");
    onClose();
  };
  return (
    <Sheet open title="К какому времени подать?" onClose={onClose}
      footer={wait > 1
        ? <button className="btn-primary h-13 w-full" onClick={remind}><BellRing size={18} />Напомнить в {hhmm(start)}</button>
        : <button className="btn-primary h-13 w-full" onClick={() => { onClose(); onCook(); }}><ChefHat size={18} />Начать готовить</button>}>
      <div className="flex flex-wrap gap-2">
        {options.map((d) => <Chip key={d.getTime()} on={d.getTime() === serve.getTime()} onClick={() => setAt(d)}>{hhmm(d)}</Chip>)}
      </div>
      <div className="mt-5 rounded-card bg-sunken p-4 text-center">
        <p className="text-small text-ink-soft">Готовится {formatMinutes(minutes)}. Начните в</p>
        <p className="mt-1 text-display tabular-nums">{hhmm(start)}</p>
        <p className="mt-1 text-small text-ink-soft">{wait > 1 ? "через " + formatMinutes(wait) : "то есть прямо сейчас"} — и всё будет готово к {hhmm(serve)}</p>
      </div>
    </Sheet>
  );
}
