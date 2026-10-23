// «Что я про вас понял»: what the service has learnt from what the person opens, cooks and rates — in words,
// habits by the day of the week, each with «это не так», and «начать заново». Everything here lives only on this device.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { forgetTrait, resetTaste, understood, PERSONAL_EVENT } from "../app/personal";
import { useStore } from "../app/store";
import { FIX_INFO, removeFix } from "../app/kitchenFit";
import { Sheet } from "./ui";

export function useUnderstood() {
  const [u, setU] = useState(understood);
  useEffect(() => { const on = () => setU(understood()); window.addEventListener(PERSONAL_EVENT, on); return () => window.removeEventListener(PERSONAL_EVENT, on); }, []);
  return u;
}

export function TasteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update, toast, profile, setProfile } = useStore();
  const u = useUnderstood();
  const reset = () => {
    if (!confirm("Забыть всё, что я понял о ваших вкусах, и начать заново?")) return;
    resetTaste();
    update((st) => ({ ...st, taste: { liked: [], tooHard: [], disliked: [], notNow: [] } }));
    toast("Начинаю заново — буду присматриваться");
  };
  const chips = (list: { key: string; label: string }[], tone: string) => (
    <div className="mt-2 flex flex-wrap gap-2">
      {list.map((x) => (
        <button key={x.key} className={"inline-flex h-10 items-center gap-1.5 rounded-full border pl-3.5 pr-2.5 text-body-sm " + tone}
          onClick={() => forgetTrait(x.key)} aria-label={"Это не так: " + x.label}>
          {x.label}<X size={16} className="text-ink-faint" aria-hidden />
        </button>
      ))}
    </div>
  );
  return (
    <Sheet open={open} title="Что я про вас понял" onClose={onClose}
      footer={u.count > 0 ? <button className="btn-ghost w-full" onClick={reset}>Начать заново</button> : undefined}>
      <p className="text-body-sm text-ink-soft">Учусь по тому, что вы открываете, готовите и оцениваете, — и подбираю похожее. Хранится только на этом телефоне.</p>
      {/* «Под вашу кухню» (app/kitchenFit): from «Что не так?» after cooking and «Спасти блюдо». */}
      {profile.kitchen.length > 0 && (
        <>
          <h3 className="mt-5 text-title">Под вашу кухню</h3>
          <ul className="card mt-2 divide-y divide-line overflow-hidden">
            {profile.kitchen.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5 pl-4 pr-2">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-herb-soft text-[20px]" aria-hidden>{FIX_INFO[f.id].icon}</span>
                <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold">{FIX_INFO[f.id].title}</span><span className="block text-caption text-ink-soft">{FIX_INFO[f.id].line}</span></span>
                <button className="min-h-11 shrink-0 rounded-full px-3 text-body-sm font-semibold text-ink-soft hover:bg-sunken" onClick={() => setProfile((p) => ({ ...p, kitchen: removeFix(p.kitchen, f.id) }))}
                  aria-label={"Убрать: " + FIX_INFO[f.id].title}>Убрать</button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-soft">Подсказываю в похожих блюдах, сам рецепт не меняю. Если стало наоборот — отметьте это после готовки, и я поправлю.</p>
        </>
      )}
      {u.likes.length === 0 && u.less.length === 0 && u.habits.length === 0 ? (
        <p className="mt-4 rounded-input bg-sunken px-4 py-3 text-body-sm">Пока присматриваюсь. Открывайте рецепты, готовьте и нажимайте «Понравилось» — через несколько блюд здесь появится, что вы любите.</p>
      ) : (
        <>
          {u.likes.length > 0 && <><h3 className="mt-5 text-title">Чаще предлагаю</h3>{chips(u.likes, "border-herb/40 bg-herb-soft")}</>}
          {u.less.length > 0 && <><h3 className="mt-5 text-title">Реже предлагаю</h3>{chips(u.less, "border-line bg-card")}</>}
          {u.habits.length > 0 && <><h3 className="mt-5 text-title">По дням недели</h3>
            {chips(u.habits.map((h) => ({ key: h.key, label: h.when[0].toUpperCase() + h.when.slice(1) + " — " + h.label })), "border-line bg-card")}</>}
          <p className="mt-4 text-caption text-ink-soft">Нажмите на ✕, если это не так, — перестану это учитывать.</p>
        </>
      )}
    </Sheet>
  );
}
