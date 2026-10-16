// Simple drawn schemes for «Школа готовки»: what is hard to explain in words is shown — how to hold the knife,
// the usual cuts, eggs by the minute, how much water for grains, a pan that browns, oven levels, soup order.
// Plain SVG in the site's colours (light, dark and contrast themes alike).
import type { ReactNode } from "react";

const T = ({ x, y, children, size = 12, anchor = "middle", soft }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; soft?: boolean }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} className={soft ? "fill-ink-soft" : "fill-ink"} style={{ fontFamily: "inherit" }}>{children}</text>
);

function Knife() {
  return (
    <svg viewBox="0 0 320 250" className="w-full" role="img" aria-label="Кошачья лапка и виды нарезки">
      {/* Cat's paw: fingertips tucked, the blade leans on the knuckles */}
      <rect x="18" y="12" width="284" height="108" rx="12" className="fill-sunken" />
      <rect x="40" y="96" width="150" height="10" rx="3" className="fill-warn-soft stroke-line-strong" strokeWidth="1" />
      <path d="M186 22 L198 22 L198 104 L186 104 Z" className="fill-card stroke-line-strong" strokeWidth="1.5" />
      <rect x="183" y="12" width="18" height="14" rx="3" className="fill-ink-soft" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${118 + i * 20} ${38 + i * 3})`}>
          <path d="M0 0 h18 v34 a9 9 0 0 1 -18 0 z" fill="#F7D3B7" stroke="#C99A7C" strokeWidth="1.5" />
          <path d="M18 30 q-8 4 -14 -2" fill="none" stroke="#C99A7C" strokeWidth="1.5" />
        </g>
      ))}
      <circle cx="176" cy="74" r="4" className="fill-herb" />
      <T x={110} y={30} anchor="end" size={12}>Пальцы подогнуты</T>
      <T x={250} y={60} anchor="middle" size={12}>Нож касается</T>
      <T x={250} y={75} anchor="middle" size={12}>костяшек</T>
      <path d="M215 68 L182 73" className="stroke-herb" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" className="fill-herb" /></marker></defs>
      {/* Cuts */}
      <g transform="translate(18 140)">
        <g>{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={r + "" + c} x={14 + c * 14} y={8 + r * 14} width="11" height="11" rx="2" fill="#F2B880" />))}</g>
        <T x={35} y={74}>Кубик</T>
        <g transform="translate(76 0)">{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={6 + i * 9} y="6" width="5" height="44" rx="2" fill="#F2B880" />)}</g>
        <T x={102} y={74}>Соломка</T>
        <g transform="translate(146 0)"><circle cx="18" cy="28" r="18" fill="none" stroke="#C9A0D6" strokeWidth="5" /><circle cx="44" cy="28" r="12" fill="none" stroke="#C9A0D6" strokeWidth="5" /></g>
        <T x={176} y={74}>Кольца</T>
        <g transform="translate(222 0)"><path d="M6 40 a20 20 0 0 1 40 0" fill="none" stroke="#C9A0D6" strokeWidth="5" /><path d="M14 44 a12 12 0 0 1 24 0" fill="none" stroke="#C9A0D6" strokeWidth="5" /></g>
        <T x={249} y={74}>Полукольца</T>
      </g>
      <T x={160} y={242} soft size={11}>Полукольца — режьте половинку луковицы</T>
    </svg>
  );
}

function Eggs() {
  const items: [string, string, ReactNode][] = [
    ["3 мин", "всмятку", <g key="y"><circle cx="0" cy="2" r="13" fill="#FBD36B" /><path d="M-4 12 q4 14 8 0 z" fill="#FBD36B" /></g>],
    ["6 мин", "в мешочек", <circle key="y" cx="0" cy="2" r="13" fill="#F6A623" />],
    ["9 мин", "вкрутую", <circle key="y" cx="0" cy="2" r="13" fill="#F3C969" />],
  ];
  return (
    <svg viewBox="0 0 320 178" className="w-full" role="img" aria-label="Сколько варить яйца">
      {items.map(([t, l, y], i) => (
        <g key={t} transform={`translate(${56 + i * 104} 52)`}>
          <ellipse cx="0" cy="0" rx="30" ry="38" className="fill-card stroke-line-strong" strokeWidth="1.5" />
          {y}
          <text x="0" y="62" textAnchor="middle" fontSize="15" className="fill-ink" style={{ fontWeight: 600 }}>{t}</text>
          <T x={0} y={80} soft>{l}</T>
        </g>
      ))}
      <T x={160} y={168} soft size={11}>Время — от закипания, потом в холодную воду</T>
    </svg>
  );
}

function Cup({ x, label, fill, water }: { x: number; label: string; fill: string; water: number }) {
  return (
    <g transform={`translate(${x} 34)`}>
      <path d="M0 0 h40 l-5 58 h-30 z" className="fill-card stroke-line-strong" strokeWidth="1.5" />
      <path d={`M${2 + (1 - water) * 2} ${58 - water * 54} h${36 - (1 - water) * 4} l-${3 + (1 - water) * 2} ${water * 54} h-30 z`} fill={fill} opacity=".85" />
      <T x={20} y={76} soft size={11}>{label}</T>
    </g>
  );
}
function Grains() {
  return (
    <svg viewBox="0 0 320 156" className="w-full" role="img" aria-label="Сколько воды для круп">
      <T x={78} y={20} size={13}>Рис 1 : 1½–2</T>
      <T x={242} y={20} size={13}>Гречка 1 : 2</T>
      <Cup x={20} label="рис" fill="#EDE6D6" water={0.8} />
      <T x={78} y={70} size={18}>+</T>
      <Cup x={96} label="вода" fill="#9CCBE8" water={0.95} />
      <line x1="160" y1="30" x2="160" y2="110" className="stroke-line" strokeWidth="1" />
      <Cup x={184} label="гречка" fill="#B98A5E" water={0.8} />
      <T x={242} y={70} size={18}>+</T>
      <Cup x={260} label="вода ×2" fill="#9CCBE8" water={0.95} />
      <T x={160} y={146} soft size={11}>Под крышкой, на слабом огне, не мешать</T>
    </svg>
  );
}

function Pan() {
  const crowd = [[30, 40], [48, 34], [62, 46], [40, 58], [58, 62], [74, 54], [34, 74], [52, 80], [70, 72], [86, 64], [46, 48], [64, 30]];
  const spaced = [[22, 36], [50, 30], [78, 40], [30, 64], [60, 60], [86, 70], [44, 88]];
  return (
    <svg viewBox="0 0 320 172" className="w-full" role="img" aria-label="Сковорода: жарить, а не тушить">
      {[{ x: 20, pts: crowd, ok: false }, { x: 180, pts: spaced, ok: true }].map(({ x, pts, ok }) => (
        <g key={x} transform={`translate(${x} 10)`}>
          <circle cx="58" cy="58" r="56" className="fill-ink-soft" opacity=".85" />
          <circle cx="58" cy="58" r="48" className="fill-ink" opacity=".75" />
          <rect x="112" y="52" width="34" height="12" rx="6" className="fill-ink-soft" />
          {pts.map(([a, b], i) => <rect key={i} x={a} y={b} width="16" height="12" rx="3" fill={ok ? "#C8803F" : "#E8C9A0"} />)}
          <text x="58" y="136" textAnchor="middle" fontSize="13" className={ok ? "fill-herb" : "fill-brand"} style={{ fontWeight: 600 }}>{ok ? "✓ Румянится" : "✗ Тушится"}</text>
          <T x={58} y={152} soft size={11}>{ok ? "свободно, по частям" : "тесно, всё сразу"}</T>
        </g>
      ))}
    </svg>
  );
}

function Oven() {
  return (
    <svg viewBox="0 0 320 172" className="w-full" role="img" aria-label="Уровни духовки">
      <rect x="14" y="10" width="136" height="136" rx="10" className="fill-sunken stroke-line-strong" strokeWidth="1.5" />
      <rect x="26" y="22" width="112" height="112" rx="6" className="fill-card" />
      {[46, 78, 110].map((y, i) => <rect key={y} x="34" y={y} width="96" height={i === 1 ? 8 : 5} rx="2" className={i === 1 ? "fill-brand" : "fill-line-strong"} />)}
      <path d="M38 128 q7 -7 14 0 q7 7 14 0 q7 -7 14 0 q7 7 14 0 q7 -7 14 0 q7 7 14 0" fill="none" stroke="#F08C5A" strokeWidth="2" />
      <T x={162} y={51} anchor="start" size={12}>Верх — подрумянить</T>
      <T x={162} y={80} anchor="start" size={12}>Середина — почти всё:</T>
      <T x={162} y={95} anchor="start" size={11} soft>пироги, мясо, запеканки</T>
      <T x={162} y={115} anchor="start" size={12}>Низ — пропечь дно</T>
      <T x={160} y={166} soft size={11}>Разогрейте 10–15 минут, прежде чем ставить</T>
    </svg>
  );
}

function Soup() {
  const rows: [string, number, string][] = [["Мясо, кости", 60, "60+ мин"], ["Картофель", 20, "20 мин"], ["Морковь, лук", 12, "10–15"], ["Капуста", 10, "10"], ["Зелень", 2, "в конце"]];
  return (
    <svg viewBox="0 0 320 170" className="w-full" role="img" aria-label="Порядок закладки в суп">
      {rows.map(([n, m, t], i) => (
        <g key={n} transform={`translate(0 ${16 + i * 28})`}>
          <T x={110} y={14} anchor="end" size={12}>{n}</T>
          <rect x="120" y="2" width={Math.max(8, (m / 60) * 150)} height="16" rx="8" className={i === 0 ? "fill-brand" : "fill-herb"} opacity={1 - i * 0.12} />
          <T x={124 + Math.max(8, (m / 60) * 150)} y={14} anchor="start" size={11} soft>{t}</T>
        </g>
      ))}
      <T x={160} y={164} soft size={11}>Что варится дольше — то в кастрюлю раньше</T>
    </svg>
  );
}

const ART: Record<string, () => JSX.Element> = { knife: Knife, eggs: Eggs, grains: Grains, pan: Pan, oven: Oven, soup: Soup };

export function SchoolArt({ lesson }: { lesson: string }) {
  const Art = ART[lesson];
  return Art ? <figure className="mb-4 rounded-card border border-line bg-card p-3"><Art /></figure> : null;
}
