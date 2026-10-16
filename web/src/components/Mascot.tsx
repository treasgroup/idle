// Шеф as a character: a kind cook in a tall hat, with rosy cheeks and a moustache. Drawn in SVG (a few hundred
// bytes, sharp at any size). Moods: «smile» (always), «happy» (something worked), «think» (nothing here yet, an
// unknown question), «oops» (an error).
export type Mood = "smile" | "happy" | "think" | "oops";

export function Mascot({ size = 96, mood = "smile", className }: { size?: number; mood?: Mood; className?: string }) {
  const eyes = {
    smile: <><ellipse cx="49" cy="70" rx="3.4" ry="4" fill="#3A2A22" /><ellipse cx="71" cy="70" rx="3.4" ry="4" fill="#3A2A22" /><circle cx="50.2" cy="68.6" r="1.1" fill="#fff" /><circle cx="72.2" cy="68.6" r="1.1" fill="#fff" /></>,
    happy: <><path d="M45 71 q4 -5 8 0" /><path d="M67 71 q4 -5 8 0" /></>,
    think: <><ellipse cx="51" cy="68" rx="3.2" ry="3.8" fill="#3A2A22" /><ellipse cx="73" cy="68" rx="3.2" ry="3.8" fill="#3A2A22" /><path d="M66 61 q6 -3 11 1" /></>,
    oops: <><path d="M46 67 l6 6 M52 67 l-6 6" /><path d="M68 67 l6 6 M74 67 l-6 6" /></>,
  }[mood];
  const mouth = {
    smile: <path d="M52 86 q8 7 16 0" />,
    happy: <path d="M51 84 q9 11 18 0 z" fill="#B7432F" stroke="#3A2A22" />,
    think: <path d="M54 88 q6 -2 12 0" />,
    oops: <ellipse cx="60" cy="88" rx="4.5" ry="3.6" fill="#3A2A22" stroke="none" />,
  }[mood];
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden>
      {/* Hat: three puffs and a band */}
      <g fill="#FFFFFF" stroke="#E2D7C6" strokeWidth="2">
        <circle cx="42" cy="30" r="15" />
        <circle cx="78" cy="30" r="15" />
        <circle cx="60" cy="22" r="18" />
        <rect x="36" y="30" width="48" height="20" rx="4" />
      </g>
      <rect x="38" y="31" width="44" height="14" fill="#FFFFFF" />
      <path d="M40 46 h40" stroke="#E2D7C6" strokeWidth="2" />
      {/* Face */}
      <circle cx="60" cy="76" r="28" fill="#F7D3B7" />
      <circle cx="43" cy="81" r="5.5" fill="#F09A8A" opacity=".55" />
      <circle cx="77" cy="81" r="5.5" fill="#F09A8A" opacity=".55" />
      <g fill="none" stroke="#3A2A22" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{eyes}{mouth}</g>
      {/* Moustache */}
      <path d="M60 80 c-5 -4 -13 -3 -15 2 c4 -1 8 1 15 1 c7 0 11 -2 15 -1 c-2 -5 -10 -6 -15 -2 z" fill="#8A5A3C" />
      {/* Scarf */}
      <path d="M44 101 q16 9 32 0 l-4 9 q-12 5 -24 0 z" fill="#B7432F" />
    </svg>
  );
}
