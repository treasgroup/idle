// «Секрет шефа»: a short kitchen tip under a recipe step.
import { Lightbulb } from "lucide-react";
import { cx } from "./ui";

export function ChefSecret({ text, className, large }: { text: string; className?: string; large?: boolean }) {
  return (
    <aside className={cx("flex gap-2.5 rounded-input bg-herb-soft px-3 py-2.5", className)} aria-label="Секрет шефа">
      <Lightbulb size={large ? 20 : 18} className="mt-0.5 shrink-0 text-herb" aria-hidden />
      <p className={cx("text-ink", large ? "text-body" : "text-body-sm")}>
        <b className="font-semibold text-herb">Секрет шефа. </b>{text}
      </p>
    </aside>
  );
}
