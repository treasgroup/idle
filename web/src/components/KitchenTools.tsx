// Two small helpers under the lessons of «Школа готовки», folded until opened: how long to roast something of a
// given weight, and how many grams are in a glass or a spoon.
import { useState } from "react";
import { ChevronDown, Flame, Scale } from "lucide-react";
import { ROAST, gramsHint, roastMinutes } from "../app/kitchenMath";
import { Chip, Stepper, cx } from "./ui";

function Fold({ icon, title, children }: { icon: JSX.Element; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card overflow-hidden">
      <button className="flex min-h-[60px] w-full items-center gap-3 px-4 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden>{icon}</span>
        <span className="flex-1 text-body-sm font-semibold">{title}</span>
        <ChevronDown size={20} className={cx("shrink-0 text-ink-soft transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="border-t border-line px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}

function Roast() {
  const [kind, setKind] = useState(ROAST[0].id);
  const [grams, setGrams] = useState(1500);
  const k = ROAST.find((x) => x.id === kind)!;
  const min = roastMinutes(k, grams / 1000);
  const h = Math.floor(min / 60), m = min % 60;
  return (
    <>
      <div className="flex flex-wrap gap-2">{ROAST.map((x) => <Chip key={x.id} on={kind === x.id} onClick={() => setKind(x.id)}>{x.label}</Chip>)}</div>
      {k.perKg > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-body-sm">Вес</span>
          <Stepper value={grams} min={300} max={6000} step={100} onChange={setGrams} label="Вес, граммов" suffix="г" />
        </div>
      )}
      <p className="mt-4 text-h2" aria-live="polite">{k.temp} °C · {h ? h + " ч" + (m ? " " + m + " мин" : "") : min + " мин"}</p>
      <p className="mt-1 text-body-sm text-ink-soft">{k.tip}</p>
    </>
  );
}

const WHAT = ["мука", "сахар", "соль", "рис", "гречка", "манка", "молоко", "вода", "сметана", "растительное масло", "мёд", "крахмал", "какао"];
const UNITS = [["стакан", "стакана"], ["ст. л.", "ст. л."], ["ч. л.", "ч. л."]] as const;

function Measures() {
  const [what, setWhat] = useState("мука");
  const [unit, setUnit] = useState(0);
  const [n, setN] = useState(1);
  const hint = gramsHint(n + " " + UNITS[unit][n > 1 ? 1 : 0] + " " + what);
  return (
    <>
      <div className="flex flex-wrap gap-2">{WHAT.map((w) => <Chip key={w} on={what === w} onClick={() => setWhat(w)}>{w}</Chip>)}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">{UNITS.map((u, i) => <Chip key={u[0]} on={unit === i} onClick={() => setUnit(i)}>{u[0]}</Chip>)}</div>
        <Stepper value={n} min={1} max={10} onChange={setN} label="Сколько" />
      </div>
      <p className="mt-4 text-h2" aria-live="polite">{hint ? hint.replace("≈ ", "≈ ") : "—"}</p>
      <p className="mt-1 text-body-sm text-ink-soft">Стакан — гранёный, 200 мл; ложки — с небольшой горкой.</p>
    </>
  );
}

export function KitchenTools() {
  return (
    <div className="mt-8">
      <h2 className="label mb-2">Помощники</h2>
      <div className="grid gap-2">
        <Fold icon={<Flame size={18} />} title="Сколько запекать — посчитаю по весу"><Roast /></Fold>
        <Fold icon={<Scale size={18} />} title="Стаканы и ложки в граммах"><Measures /></Fold>
      </div>
    </div>
  );
}
