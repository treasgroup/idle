// Шеф as a character: the owner's illustrations in server/mascot/ (WebP, 10–35 KB each). Moods without their own
// picture yet show the main one; new ones (chef-think, chef-oops…) only need a file and a line here.
export type Mood = "smile" | "happy" | "think" | "oops";

const FILE: Record<Mood, string> = { smile: "chef-main", happy: "chef-happy", think: "chef-main", oops: "chef-main" };
const RATIO: Record<string, number> = { "chef-main": 363 / 420, "chef-happy": 384 / 420 };

export function Mascot({ size = 96, mood = "smile", className }: { size?: number; mood?: Mood; className?: string }) {
  const f = FILE[mood];
  return <img src={"./mascot/" + f + ".webp"} alt="" aria-hidden width={Math.round(size * (RATIO[f] ?? 1))} height={size} decoding="async" draggable={false} className={className} />;
}

/** Шеф's face for the avatar (chat, cards, the site's name in the menu). */
export const AVATAR = "./mascot/chef-avatar.webp";
