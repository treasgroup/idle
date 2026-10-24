// The person's round picture: their own photo from «Фото и имя», or the plain figure.
import { UserRound } from "lucide-react";
import { useStore } from "../app/store";
import { cx } from "./ui";

export function Avatar({ size, on, className }: { size: number; on?: boolean; className?: string }) {
  const { profile } = useStore();
  if (profile.photo)
    return <img src={profile.photo} alt="" width={size} height={size} draggable={false} className={cx("shrink-0 rounded-full object-cover", on && "ring-2 ring-brand ring-offset-2 ring-offset-paper", className)} style={{ width: size, height: size }} />;
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-full", on ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink-soft", className)} style={{ width: size, height: size }} aria-hidden>
      <UserRound size={Math.round(size * 0.52)} />
    </span>
  );
}
