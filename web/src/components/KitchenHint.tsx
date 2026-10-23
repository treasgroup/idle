// «Под вашу кухню» in a step: last time's correction (app/kitchenFit) as a quiet green note. «Понятно» folds it for
// now; «Это было разово» forgets the mark, with «Вернуть».
import { useState } from "react";
import type { StepHint } from "../app/kitchenFit";
import { removeFix } from "../app/kitchenFit";
import { useStore } from "../app/store";
import { cx } from "./ui";

export function KitchenHint({ hint, className }: { hint: StepHint; className?: string }) {
  const { profile, setProfile, toast } = useStore();
  const [folded, setFolded] = useState(false);
  if (folded) return null;
  const once = () => {
    const before = profile.kitchen;
    setProfile((p) => ({ ...p, kitchen: removeFix(p.kitchen, hint.fix) }));
    toast("Убрал поправку — больше не подскажу", { label: "Вернуть", run: () => setProfile((p) => ({ ...p, kitchen: before })) });
  };
  return (
    <div className={cx("rounded-input border border-herb/30 bg-herb-soft px-3.5 py-3", className)} role="note">
      <p className="text-caption font-semibold uppercase tracking-wide text-herb"><span aria-hidden>🌿 </span>Под вашу кухню</p>
      <p className="mt-1 text-body-sm text-ink">{hint.text}</p>
      <div className="mt-1 flex gap-1">
        <button className="-ml-2 min-h-11 rounded-full px-2 text-body-sm font-semibold text-herb hover:bg-card/60" onClick={() => setFolded(true)}>Понятно</button>
        <button className="min-h-11 rounded-full px-2 text-body-sm text-ink-soft hover:bg-card/60" onClick={once}>Это было разово</button>
      </div>
    </div>
  );
}

/** Under a product: «🌿 в прошлый раз вода ушла раньше — налейте 500 мл». */
export function KitchenLine({ text, className }: { text: string; className?: string }) {
  return <p className={cx("flex gap-1.5 text-caption text-herb", className)}><span aria-hidden>🌿</span><span><span className="sr-only">Под вашу кухню: </span>{text[0].toUpperCase() + text.slice(1)}</span></p>;
}
