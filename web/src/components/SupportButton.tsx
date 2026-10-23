// «Поддержать автора»: a small heart beside the profile button on Главная, the same size, leading to the page /avtor
// (server/api/_private/support.php). Only on the site: the RuStore app has none (the store's rules on payments).
import { Heart } from "lucide-react";
import { isNativeApp, siteBase } from "../engine";
import { cx } from "./ui";

export const supportUrl = () => siteBase() + "avtor";

export function SupportButton({ className }: { className?: string }) {
  if (isNativeApp()) return null;
  return (
    <a href={supportUrl()} className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full", className)} aria-label="Поддержать автора" title="Поддержать автора">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-brand/20 bg-brand-soft text-brand"><Heart size={18} fill="currentColor" /></span>
    </a>
  );
}
