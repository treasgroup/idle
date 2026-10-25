// Профиль → «Соблюдаю пост»: one switch, two choices (Wednesday and Friday, fish) and the coming fasts with dates.
import { useStore } from "../app/store";
import { feature } from "../app/feature";
import { comingFasts, daysLeft, keepsFast } from "../app/fasting";
import { plural } from "../engine";
import { Sheet, Toggle } from "./ui";

const dm = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

/** The line under «Соблюдаю пост» in Профиль. */
export function fastHint(p: ReturnType<typeof useStore>["profile"]): string {
  if (!p.fast.on) return "Выключено. В пост план и Шеф возьмут постное";
  const today = keepsFast(p, new Date());
  const next = comingFasts()[0];
  return today ? "Сегодня: " + (today.kind === "weekly" ? today.name : today.name.toLowerCase()) : next ? next.name + " — с " + dm(next.from) : "Включено";
}

export function FastSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile } = useStore();
  const f = profile.fast;
  const set = (patch: Partial<typeof f>) => setProfile((p) => ({ ...p, fast: { ...p.fast, ...patch } }));
  return (
    <Sheet open={open} title="Соблюдаю пост" onClose={onClose}>
      <p className="text-body-sm text-ink-soft">В постные дни план на неделю, «Рецепт дня» и Шеф сами возьмут постное. Накануне многодневного поста напомню на главной.</p>
      <div className="mt-2 divide-y divide-line">
        <Toggle on={f.on} onChange={(v) => { set({ on: v }); if (v) feature("fast_on"); }} label="Соблюдаю пост" hint="Без мяса, молочного и яиц" />
        {f.on && <>
          <Toggle on={f.weekly} onChange={(v) => set({ weekly: v })} label="Среда и пятница" hint="Кроме сплошных седмиц: Святки, Светлая, Троицкая" />
          <Toggle on={f.fish} onChange={(v) => set({ fish: v })} label="Рыба можно" hint="Если в ваши дни рыба разрешена" />
        </>}
      </div>
      <p className="label mb-2 mt-5">Ближайшие посты</p>
      <div className="grid gap-1.5">
        {comingFasts().map((x) => {
          const left = daysLeft(x.from);
          return (
            <div key={x.name + +x.from} className="flex items-baseline justify-between gap-3 rounded-input bg-sunken px-3 py-2.5">
              <span className="text-body-sm font-semibold">{x.name}</span>
              <span className="text-right text-caption text-ink-soft">{dm(x.from)} – {dm(x.to)}<br />{x.now ? "идёт сейчас" : "через " + left + " " + plural(left, "день", "дня", "дней")}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-caption text-ink-faint">Даты — по новому стилю. Правило самое простое: без мяса, молочного и яиц; строже или мягче — как вы решите сами.</p>
    </Sheet>
  );
}
