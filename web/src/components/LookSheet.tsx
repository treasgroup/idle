// Профиль → «Оформление»: the colours, the theme, the four places around Шеф in the bottom bar, the screen the app
// opens on, the blocks of Главная. All of it stays on this device, like the rest of the profile; «Вернуть как было»
// puts every choice back.
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, ChefHat, RotateCcw } from "lucide-react";
import { useStore } from "../app/store";
import { DEFAULT_PROFILE, HOME_BLOCKS, NAV_CHOICES, PALETTES, START_CHOICES, TODAY_TILES, type Profile } from "../app/profile";
import { NAV_ITEMS } from "../app/navItems";
import { feature } from "../app/feature";
import type { Tab } from "../app/router";
import { Sheet, cx } from "./ui";

const THEMES = [["light", "Светлая"], ["dark", "Тёмная"], ["contrast", "Контрастная"], ["system", "Как в телефоне"]] as const;

/** The line under «Оформление» in Профиль: the colour set and the theme. */
export function lookHint(p: Profile): string {
  const theme = THEMES.find(([id]) => id === p.theme)?.[1] ?? "Светлая";
  return (PALETTES.find((x) => x.id === p.palette)?.label ?? "Шефли") + " · " + theme.toLowerCase();
}

export function LookSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile, toast } = useStore();
  // The place of the bar being changed: tap it, then tap what goes there.
  const [slot, setSlot] = useState<number | null>(null);
  const set = (patch: Partial<Profile>) => { setProfile((p) => ({ ...p, ...patch })); feature("look_change"); };
  const changed = profile.palette !== DEFAULT_PROFILE.palette || profile.theme !== DEFAULT_PROFILE.theme || profile.start !== DEFAULT_PROFILE.start
    || profile.nav.join() !== DEFAULT_PROFILE.nav.join() || profile.homeHidden.length > 0
    || profile.homeOrder.join() !== DEFAULT_PROFILE.homeOrder.join() || profile.todayTiles.join() !== DEFAULT_PROFILE.todayTiles.join();
  const put = (t: Tab) => {
    if (slot == null) return;
    const nav = [...profile.nav];
    const was = nav.indexOf(t);
    // Already in the bar: the two swap places, so nothing is ever there twice.
    if (was >= 0) nav[was] = nav[slot];
    nav[slot] = t;
    set({ nav });
    setSlot(null);
  };
  const reset = () => {
    set({ palette: DEFAULT_PROFILE.palette, theme: DEFAULT_PROFILE.theme, nav: DEFAULT_PROFILE.nav, start: DEFAULT_PROFILE.start, homeHidden: [], homeOrder: DEFAULT_PROFILE.homeOrder, todayTiles: DEFAULT_PROFILE.todayTiles });
    setSlot(null);
    toast("Вернул оформление как было");
  };
  const bar: (Tab | null)[] = [profile.nav[0], profile.nav[1], null, profile.nav[2], profile.nav[3]];
  const contrast = profile.theme === "contrast";

  return (
    <Sheet open={open} title="Оформление" onClose={() => { setSlot(null); onClose(); }} tall
      footer={changed ? <button className="btn-ghost w-full" onClick={reset}><RotateCcw size={18} aria-hidden />Вернуть как было</button> : undefined}>
      <p className="label mb-2">Цвет</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Цвет">
        {PALETTES.map((x) => {
          const on = profile.palette === x.id;
          return (
            <button key={x.id} role="radio" aria-checked={on} onClick={() => set({ palette: x.id })}
              className={cx("flex h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-input border text-small", on ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-card")}>
              <span className="relative grid h-7 w-7 place-items-center rounded-full border border-line" style={{ background: "linear-gradient(135deg, " + x.paper + " 50%, " + x.brand + " 50%)" }} aria-hidden>
                {on && <Check size={14} strokeWidth={3} className="rounded-full bg-card text-brand" />}
              </span>
              {x.label}
            </button>
          );
        })}
      </div>
      {contrast && <p className="mt-2 text-caption text-ink-soft">В контрастной теме цвет всегда свой — чёрный на белом. Выбранный цвет вернётся в других темах.</p>}

      <p className="label mb-2 mt-5">Тема</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Тема">
        {THEMES.map(([id, label]) => (
          <button key={id} role="radio" aria-checked={profile.theme === id} onClick={() => set({ theme: id })}
            className={cx("h-11 rounded-input border px-2 text-small", profile.theme === id ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card")}>{label}</button>
        ))}
      </div>
      {contrast && <p className="mt-2 text-caption text-ink-soft">Чёрный текст на белом и чёткие рамки — легче читать при слабом зрении.</p>}

      <p className="label mb-1 mt-5">Нижнее меню</p>
      {profile.simple
        ? <p className="text-body-sm text-ink-soft">В простом режиме в меню только Главная, Шеф и Избранное. Выключите простой режим, чтобы расставить своё.</p>
        : <>
          <p className="mb-2 text-caption text-ink-soft">{slot == null ? "Нажмите на место, потом — что туда поставить. Шеф всегда в центре." : "Что поставить на это место?"}</p>
          <div className="flex rounded-card border border-line bg-paper py-1.5">
            {bar.map((t, i) => {
              const place = i > 2 ? i - 1 : i;
              if (t == null) return (
                <span key="chef" className="flex flex-1 flex-col items-center gap-1 py-1 text-micro font-semibold text-brand">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-fill text-white" aria-hidden><ChefHat size={18} strokeWidth={2.25} /></span>Шеф
                </span>
              );
              const { icon: Icon, label } = NAV_ITEMS[t];
              const on = slot === place;
              return (
                <button key={i} onClick={() => setSlot(on ? null : place)} aria-pressed={on} aria-label={"Место " + (place + 1) + ": " + label}
                  className={cx("mx-0.5 flex flex-1 flex-col items-center gap-1 rounded-input py-1 text-micro", on ? "bg-brand-soft font-semibold text-brand-ink ring-2 ring-brand" : "text-ink-soft")}>
                  <span className="grid h-8 place-items-center" aria-hidden><Icon size={22} /></span>{label}
                </button>
              );
            })}
          </div>
          {slot != null && (
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {NAV_CHOICES.map((t) => {
                const { icon: Icon, label } = NAV_ITEMS[t];
                const here = profile.nav[slot] === t;
                return (
                  <button key={t} onClick={() => put(t)} aria-pressed={here}
                    className={cx("flex h-16 flex-col items-center justify-center gap-1 rounded-input border text-micro", here ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card")}>
                    <Icon size={20} aria-hidden />{label}
                  </button>
                );
              })}
            </div>
          )}
        </>}

      <p className="label mb-2 mt-5">Открывать при запуске</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Открывать при запуске">
        {START_CHOICES.map((t) => (
          <button key={t} role="radio" aria-checked={profile.start === t} onClick={() => set({ start: t })}
            className={cx("h-11 rounded-input border px-2 text-small", profile.start === t ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card")}>{NAV_ITEMS[t].label}</button>
        ))}
      </div>

      <p className="label mb-2 mt-5">Плитки в «На сегодня»</p>
      <div className="grid grid-cols-2 gap-1.5">
        {TODAY_TILES.map((t) => {
          const on = profile.todayTiles.includes(t.id);
          return (
            <button key={t.id} role="checkbox" aria-checked={on} onClick={() => { setProfile((p) => ({ ...p, todayTiles: p.todayTiles.includes(t.id) ? p.todayTiles.filter((x) => x !== t.id) : [...p.todayTiles, t.id] })); feature("look_change"); }}
              className="flex min-h-[48px] items-center gap-2.5 rounded-input border border-line bg-card px-3 text-left text-body-sm">
              <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-2", on ? "border-brand bg-brand-fill text-white" : "border-line-strong")} aria-hidden>{on && <Check size={13} strokeWidth={3} />}</span>
              <span className="min-w-0">{t.label}{t.isNew && <span className="ml-1.5 rounded-full bg-herb-soft px-1.5 py-0.5 align-middle text-micro font-semibold text-herb">новое</span>}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-caption text-ink-faint">Подсказки по дню — пост, новости стола, что разморозить — появляются сами.</p>

      <p className="label mb-0 mt-5">Что и в каком порядке на главной</p>
      <div className="divide-y divide-line">
        {profile.homeOrder.map((id, i) => {
          const b = HOME_BLOCKS.find((x) => x.id === id)!;
          const move = (d: number) => { setProfile((p) => { const o = [...p.homeOrder]; const k = o.indexOf(id); [o[k], o[k + d]] = [o[k + d], o[k]]; return { ...p, homeOrder: o }; }); feature("look_change"); };
          const shown = !profile.homeHidden.includes(id);
          return (
            <div key={id} className="flex min-h-[56px] items-center gap-2">
              <span className="min-w-0 flex-1 text-body-sm">{b.label}</span>
              <button className="icon-btn h-10 w-10 disabled:opacity-30" disabled={i === 0} onClick={() => move(-1)} aria-label={"Выше: " + b.label}><ArrowUp size={18} /></button>
              <button className="icon-btn h-10 w-10 disabled:opacity-30" disabled={i === profile.homeOrder.length - 1} onClick={() => move(1)} aria-label={"Ниже: " + b.label}><ArrowDown size={18} /></button>
              <label className="ml-1 flex items-center" aria-label={(shown ? "Скрыть: " : "Показать: ") + b.label}>
                <input type="checkbox" className="peer sr-only" checked={shown} onChange={(e) => { const show = e.target.checked; setProfile((p) => ({ ...p, homeHidden: show ? p.homeHidden.filter((x) => x !== id) : [...new Set([...p.homeHidden, id])] })); }} />
                <span className="relative h-7 w-12 rounded-full bg-line-strong/50 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-brand-fill peer-checked:after:translate-x-5" aria-hidden />
              </label>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-ink-faint">Цвет, меню и главная переносятся на другие ваши устройства; тема и размер текста у каждого устройства свои.</p>
    </Sheet>
  );
}
