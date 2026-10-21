// «Как пользоваться»: four cards about the main things — Шеф, cooking by steps, the plan, saved recipes. Swiped with a
// finger (native scroll snapping: smooth on any phone) or «Дальше»; «Пропустить» always in sight. Each card shows a
// small piece of the real interface instead of a drawing: it shows what the buttons look like, and never gets stale.
// Shown once after «Для кого готовите?» on the first visit; again from Профиль → «Как пользоваться». Phones and tablets
// only: on a computer (a wide screen with a mouse) everything is in view, and the owner asked for no tour there.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChefHat, Clock, Mic, Sun, ArrowDown, ShoppingCart, Heart, WifiOff } from "lucide-react";
import { cx } from "./ui";

const Pill = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-small text-ink-soft">{icon}{children}</span>
);
const Box = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx("rounded-input bg-sunken px-3.5 py-2.5 text-body-sm", className)}>{children}</div>
);

const CARDS: { title: string; line: string; pic: ReactNode }[] = [
  {
    title: "Скажите Шефу, что есть дома, — он подберёт блюдо",
    line: "Текстом или голосом. Ещё он подскажет, сколько варить и чем заменить.",
    pic: (
      <>
        <p className="ml-auto w-fit rounded-[16px] rounded-br-md bg-brand-soft px-3.5 py-2 text-body-sm">есть курица и картошка</p>
        <div className="flex items-start gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden><ChefHat size={18} /></span>
          <Box className="flex-1 bg-card shadow-e1"><b className="font-semibold">Картошка с курицей в духовке</b><span className="block text-small text-ink-soft">50 мин · всё есть дома</span></Box>
        </div>
        <div className="text-center"><Pill icon={<Mic size={14} aria-hidden />}>можно голосом</Pill></div>
      </>
    ),
  },
  {
    title: "Готовьте по шагам — таймер в одно нажатие",
    line: "Экран не гаснет, а руки свободны: скажите «дальше», и Шеф прочитает следующий шаг.",
    pic: (
      <>
        <Box className="bg-card shadow-e1"><span className="block text-small text-ink-soft">Шаг 3 из 7</span>Обжарьте лук до золотистого цвета</Box>
        <div className="flex flex-wrap justify-center gap-2">
          <Pill icon={<Clock size={14} aria-hidden />}>5:00</Pill>
          <Pill icon={<Mic size={14} aria-hidden />}>«дальше»</Pill>
          <Pill icon={<Sun size={14} aria-hidden />}>экран не гаснет</Pill>
        </div>
      </>
    ),
  },
  {
    title: "План на неделю в одно нажатие — покупки соберутся сами",
    line: "Ужины без повторов, а в список попадёт только то, чего нет дома.",
    pic: (
      <>
        <Box className="bg-card shadow-e1 leading-relaxed">Пн · Плов<br />Вт · Борщ<br />Ср · Паста с курицей</Box>
        <ArrowDown size={18} className="mx-auto text-ink-soft" aria-hidden />
        <Box className="bg-card text-center shadow-e1"><ShoppingCart size={16} className="-mt-0.5 mr-1.5 inline text-brand" aria-hidden />Купить: 12 продуктов</Box>
      </>
    ),
  },
  {
    title: "Сохраняйте любимое — откроется даже без интернета",
    line: "Сердечко у рецепта — и он в «Избранном». А бабушкины рецепты — в «Семейной книге».",
    pic: (
      <>
        <Box className="bg-card shadow-e1"><Heart size={16} className="-mt-0.5 mr-1.5 inline fill-brand text-brand" aria-hidden />Сырники как у бабушки</Box>
        <div className="text-center"><Pill icon={<WifiOff size={14} aria-hidden />}>откроется без интернета</Pill></div>
      </>
    ),
  },
];

export const tourWanted = (): boolean =>
  typeof matchMedia === "undefined" || !matchMedia("(min-width: 1024px) and (pointer: fine)").matches;

export function Tour({ onDone, last = "Дальше" }: { onDone: () => void; /** The last card's button. */ last?: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  // The card in view follows the scroll (a swipe), and «Дальше» scrolls to the next one.
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const on = () => setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", on, { passive: true });
    el.addEventListener("scrollend", on);
    return () => { el.removeEventListener("scroll", on); el.removeEventListener("scrollend", on); };
  }, []);
  const go = (i: number) => {
    const el = rail.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setAt(i);
  };
  const end = at >= CARDS.length - 1;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-label={"Карточка " + (at + 1) + " из " + CARDS.length}>
          {CARDS.map((_, i) => (
            <button key={i} onClick={() => go(i)} aria-label={"Карточка " + (i + 1)}
              className={cx("h-2 rounded-full transition-all", i === at ? "w-6 bg-brand-fill" : "w-2 bg-line-strong/40")} />
          ))}
        </div>
        <button className="btn-ghost h-10 px-3" onClick={onDone}>Пропустить</button>
      </div>

      <div ref={rail} className="-mx-5 mt-4 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain" style={{ scrollbarWidth: "none" }}>
        {CARDS.map((c, i) => (
          <section key={i} className="flex w-full shrink-0 snap-center flex-col px-5" aria-hidden={i !== at}>
            <div className="flex min-h-[220px] flex-col justify-center gap-3 rounded-card bg-sunken/60 p-5">{c.pic}</div>
            <h1 className="mt-6 text-h1 leading-tight">{c.title}</h1>
            <p className="mt-2 text-body text-ink-soft">{c.line}</p>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-6 bg-paper px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        <button className="btn-primary h-13 w-full" onClick={() => (end ? onDone() : go(at + 1))}>{end ? last : "Дальше"}</button>
      </div>
    </div>
  );
}
