// Шеф as a character: the owner's illustrations in server/mascot/ (WebP, 10–40 KB each, loaded only where shown).
// A new pose only needs a file and a line here; a mood without its own picture falls back to the main one.
export type Mood = "smile" | "happy" | "think" | "oops" | "shopping" | "fridge" | "book" | "plan" | "feast";

const FILE: Record<Mood, string> = {
  smile: "chef-main", happy: "chef-happy", think: "chef-think", oops: "chef-oops",
  shopping: "chef-shopping", fridge: "chef-fridge", book: "chef-book", plan: "chef-plan", feast: "chef-feast",
};
/** width / height of each picture (all are 420 px tall). */
const RATIO: Record<string, number> = {
  "chef-main": 363 / 420, "chef-happy": 384 / 420, "chef-think": 293 / 420, "chef-oops": 375 / 420,
  "chef-shopping": 338 / 420, "chef-fridge": 404 / 420, "chef-book": 362 / 420, "chef-plan": 389 / 420, "chef-feast": 397 / 420,
};

export function Mascot({ size = 96, mood = "smile", className }: { size?: number; mood?: Mood; className?: string }) {
  const f = FILE[mood] ?? "chef-main";
  return <img src={"./mascot/" + f + ".webp"} alt="" aria-hidden width={Math.round(size * (RATIO[f] ?? 1))} height={size} decoding="async" draggable={false} className={className} />;
}

/** Шеф's face for the avatar (chat, cards, hints). */
export const AVATAR = "./mascot/chef-avatar.webp";
