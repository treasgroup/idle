// A one-line «what is here» bubble on the first visits to a screen (План, Покупки, Школа). Once closed — never again,
// and after three app starts it goes away by itself, so it never sits above the list for good (app/hints). One per screen, no more: the screens themselves must stay quiet.
import { Lightbulb, X } from "lucide-react";
import { useHint } from "../app/hints";
import { cx } from "./ui";

export function PlaceHint({ id, text, className }: { id: string; text: string; className?: string }) {
  const [show, done] = useHint("place-" + id, 3);
  if (!show) return null;
  return (
    <div className={cx("anim-rise flex items-start gap-3 rounded-card border border-line bg-card py-3 pl-4 pr-2", className)} role="note">
      <Lightbulb size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
      <p className="min-w-0 flex-1 text-body-sm">{text}</p>
      <button className="icon-btn -my-1.5 h-9 w-9 shrink-0" onClick={done} aria-label="Понятно, скрыть подсказку"><X size={18} /></button>
    </div>
  );
}
