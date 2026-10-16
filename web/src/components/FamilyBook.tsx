// «Семейная книга»: the family's own recipes — typed in or read from a photo of a notebook page — kept with the
// person's other things and sent to children and grandchildren as a link that opens straight into their book.
import { useRef, useState } from "react";
import { BookHeart, Camera, Clock, PenLine, Printer, Send, Trash2, Users } from "lucide-react";
import { canShare, copyText, plural, type MyRecipe } from "../engine";
import { useStore } from "../app/store";
import { lines, newRecipe, recipeText, removeRecipe, saveRecipe, shareLink } from "../app/myRecipes";
import { cue } from "../app/feedback";
import { printPage } from "../app/print";
import { Layer, Sheet, Stepper, cx } from "./ui";

export function FamilyBook() {
  const { s } = useStore();
  const list = [...(s.myRecipes ?? [])].sort((a, b) => b.at - a.at);
  const [edit, setEdit] = useState<{ r: MyRecipe; photo?: boolean } | null>(null);
  const [open, setOpen] = useState<MyRecipe | null>(null);
  const current = open ? list.find((x) => x.id === open.id) ?? null : null;
  return (
    <div className="mt-6">
      {list.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong/50 px-5 py-8 text-center">
          <BookHeart size={48} strokeWidth={1.5} className="mx-auto text-ink-faint" aria-hidden />
          <h2 className="mt-3 text-h2">Семейная книга рецептов</h2>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">Бабушкин наполеон, мамины котлеты, ваш фирменный салат — сохраните их здесь и отправьте детям и внукам. Можно сфотографировать страницу тетради — текст распознается сам.</p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((r) => (
            <li key={r.id}>
              <button className="flex min-h-[72px] w-full items-center gap-3 rounded-card border border-line bg-card p-3 text-left hover:border-line-strong" onClick={() => setOpen(r)}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-input bg-warn-soft text-2xl" aria-hidden>📖</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{r.title}</span>
                  <span className="block truncate text-small text-ink-soft">{[r.from, r.minutes ? r.minutes + " мин" : "", lines(r.ingredients).length ? lines(r.ingredients).length + " " + plural(lines(r.ingredients).length, "продукт", "продукта", "продуктов") : ""].filter(Boolean).join(" · ") || "Свой рецепт"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 grid gap-2 sm:flex">
        <button className="btn-primary" onClick={() => setEdit({ r: newRecipe(), photo: true })}><Camera size={18} />Сфотографировать страницу</button>
        <button className="btn-outline" onClick={() => setEdit({ r: newRecipe() })}><PenLine size={18} />Написать рецепт</button>
      </div>
      {edit && <RecipeEditor initial={edit.r} photo={edit.photo} onClose={() => setEdit(null)} onSaved={(r) => { setEdit(null); setOpen(r); }} />}
      {current && <MyRecipeView r={current} onClose={() => setOpen(null)} onEdit={() => setEdit({ r: current })} />}
    </div>
  );
}

function RecipeEditor({ initial, photo, onClose, onSaved }: { initial: MyRecipe; photo?: boolean; onClose: () => void; onSaved: (r: MyRecipe) => void }) {
  const { update, toast } = useStore();
  const [r, setR] = useState(initial);
  const [reading, setReading] = useState<{ share: number; what: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = (p: Partial<MyRecipe>) => setR((x) => ({ ...x, ...p }));
  const pick = () => file.current?.click();

  const read = async (f: File) => {
    setReading({ share: 0, what: "Готовлю…" });
    try {
      const { recognize, splitRecipe } = await import("../app/ocr");
      const text = await recognize(f, (share, what) => setReading({ share, what }));
      const part = splitRecipe(text);
      setR((x) => ({
        ...x,
        title: x.title || part.title,
        ingredients: [x.ingredients, part.ingredients].filter(Boolean).join("\n"),
        steps: [x.steps, part.steps].filter(Boolean).join("\n"),
      }));
      cue(text ? "success" : "error");
      toast(text ? "Текст распознан — проверьте и поправьте, если нужно" : "Не удалось прочитать текст — попробуйте снять ровнее и при свете");
    } catch {
      cue("error");
      toast("Не получилось распознать фото. Попробуйте ещё раз или введите текст вручную");
    } finally { setReading(null); }
  };

  const save = () => {
    if (!r.title.trim()) return toast("Напишите название рецепта");
    update((st) => saveRecipe(st, r));
    cue("success");
    onSaved(r);
  };

  return (
    <Sheet open title={initial.title ? "Изменить рецепт" : "Новый рецепт"} onClose={onClose} tall
      footer={<button className="btn-primary h-13 w-full" disabled={!!reading} onClick={save}>Сохранить в книгу</button>}>
      <input ref={file} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void read(f); }} />
      <button className={cx("flex w-full items-center gap-3 rounded-card border p-3 text-left", photo ? "border-brand/40 bg-brand-soft" : "border-line bg-card")} onClick={pick} disabled={!!reading}>
        <Camera size={22} className="shrink-0 text-ink-soft" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-medium">{reading ? reading.what : "Распознать с фото"}</span>
          <span className="block text-caption text-ink-soft">{reading ? "Можно подождать — это бесплатно и прямо на телефоне" : "Страница тетради, книги или открытка. Снимайте ровно и при свете"}</span>
          {reading && <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-brand transition-[width]" style={{ width: Math.round(reading.share * 100) + "%" }} /></span>}
        </span>
      </button>

      <label className="label mb-1.5 mt-5 block" htmlFor="my-title">Название</label>
      <input id="my-title" className="input" value={r.title} maxLength={120} placeholder="Например: Наполеон бабушки Нины" onChange={(e) => set({ title: e.target.value })} />
      <label className="label mb-1.5 mt-4 block" htmlFor="my-from">Чей рецепт</label>
      <input id="my-from" className="input" value={r.from} maxLength={80} placeholder="от бабушки, от мамы, свой…" onChange={(e) => set({ from: e.target.value })} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="label mb-1.5">На сколько человек</p>
          <Stepper value={r.people ?? 4} min={1} max={30} onChange={(n) => set({ people: n })} label="Человек" />
        </div>
        <div>
          <label className="label mb-1.5 block" htmlFor="my-min">Время, минут</label>
          <input id="my-min" className="input" inputMode="numeric" value={r.minutes ?? ""} placeholder="60"
            onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); set({ minutes: Number.isFinite(n) && n > 0 ? Math.min(n, 2880) : null }); }} />
        </div>
      </div>
      <label className="label mb-1.5 mt-4 block" htmlFor="my-ing">Продукты — каждый с новой строки</label>
      <textarea id="my-ing" className="input min-h-[120px] py-3" value={r.ingredients} maxLength={4000} placeholder={"Мука — 2 стакана\nМасло сливочное — 200 г\nЯйца — 3 шт."} onChange={(e) => set({ ingredients: e.target.value })} />
      <label className="label mb-1.5 mt-4 block" htmlFor="my-steps">Как готовить — по шагам, каждый с новой строки</label>
      <textarea id="my-steps" className="input min-h-[160px] py-3" value={r.steps} maxLength={8000} placeholder={"Масло порубить с мукой в крошку.\nДобавить яйца и замесить тесто."} onChange={(e) => set({ steps: e.target.value })} />
      <label className="label mb-1.5 mt-4 block" htmlFor="my-note">Секреты и заметки</label>
      <textarea id="my-note" className="input min-h-[72px] py-3" value={r.note} maxLength={1000} placeholder="Бабушка говорила: тесто не любит спешки" onChange={(e) => set({ note: e.target.value })} />
    </Sheet>
  );
}

function MyRecipeView({ r, onClose, onEdit }: { r: MyRecipe; onClose: () => void; onEdit: () => void }) {
  const { update, toast } = useStore();
  const [done, setDone] = useState<number[]>([]);
  const ing = lines(r.ingredients), steps = lines(r.steps);
  const send = async () => {
    const link = await shareLink(r);
    const text = "Рецепт из нашей семейной книги — «" + r.title + "». Откройте, и он сохранится у вас: " + link;
    if (canShare()) { try { await navigator.share({ title: r.title, text }); return; } catch (e) { if ((e as Error).name === "AbortError") return; } }
    toast((await copyText(text)) ? "Ссылка скопирована — отправьте её в мессенджере" : "Не удалось скопировать ссылку");
  };
  const remove = () => {
    const keep = r;
    update((st) => removeRecipe(st, r.id));
    onClose();
    toast("Рецепт удалён", { label: "Отменить", run: () => update((st) => saveRecipe(st, keep)) });
  };
  return (
    <Layer title={r.title} onClose={onClose} label={r.title}
      actions={<button className="icon-btn" onClick={onEdit} aria-label="Изменить"><PenLine size={20} /></button>}>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-[calc(env(safe-area-inset-top)+4.5rem)] sm:px-6">
        <p className="text-small text-ink-soft">Семейная книга{r.from ? " · " + r.from : ""}</p>
        <h1 className="mt-1 text-h1">{r.title}</h1>
        {(r.people || r.minutes) && (
          <p className="mt-2 flex flex-wrap gap-4 text-body-sm text-ink-soft">
            {r.people && <span className="inline-flex items-center gap-1.5"><Users size={16} aria-hidden />на {r.people} {plural(r.people, "человека", "человека", "человек")}</span>}
            {r.minutes && <span className="inline-flex items-center gap-1.5"><Clock size={16} aria-hidden />{r.minutes} мин</span>}
          </p>
        )}
        {ing.length > 0 && (
          <section className="mt-6">
            <h2 className="text-h2">Продукты</h2>
            <ul className="card mt-3 divide-y divide-line px-4">{ing.map((l, i) => <li key={i} className="py-3 text-body">{l}</li>)}</ul>
          </section>
        )}
        {steps.length > 0 && (
          <section className="mt-6">
            <h2 className="text-h2">Как готовить</h2>
            <ol className="mt-3 grid gap-3">
              {steps.map((l, i) => {
                const on = done.includes(i);
                return (
                  <li key={i}>
                    <button className={cx("flex w-full gap-3 rounded-input p-2 text-left", on && "opacity-50")} onClick={() => setDone((d) => (on ? d.filter((x) => x !== i) : [...d, i]))} aria-pressed={on}>
                      <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-small font-medium", on ? "bg-herb text-white" : "bg-brand-soft text-brand-ink")}>{i + 1}</span>
                      <span className={cx("pt-1 text-body", on && "line-through")}>{l}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-caption text-ink-faint">Нажмите на шаг, когда сделаете его.</p>
          </section>
        )}
        {r.note && <p className="mt-6 rounded-input bg-sunken p-4 text-body-sm">{r.note}</p>}
        <div className="mt-8 grid gap-2 sm:flex">
          <button className="btn-primary" onClick={send}><Send size={18} />Отправить семье</button>
          <button className="btn-outline" onClick={() => printPage(r.title, [
            ...(ing.length ? [{ title: "Продукты", items: ing }] : []),
            ...(steps.length ? [{ title: "Как готовить", items: steps }] : []),
            ...(r.note ? [{ text: r.note }] : []),
          ])}><Printer size={18} />Распечатать</button>
          <button className="btn-ghost text-ink-soft" onClick={remove}><Trash2 size={18} />Удалить</button>
        </div>
      </div>
    </Layer>
  );
}

/** A recipe sent by the family (#book=…): shown, and saved into one's own book with one tap. */
export function IncomingRecipe({ data, onClose }: { data: Partial<MyRecipe>; onClose: () => void }) {
  const { update, toast } = useStore();
  const r: MyRecipe = { ...newRecipe(), ...data, id: newRecipe().id, at: Date.now() };
  return (
    <Sheet open title="Вам прислали рецепт" onClose={onClose} tall
      footer={<button className="btn-primary h-13 w-full" onClick={() => { update((st) => saveRecipe(st, r)); cue("success"); toast("Сохранено в «Избранное» → «Семейная книга»"); onClose(); }}>Сохранить в мою книгу</button>}>
      <h2 className="text-h2">{r.title}</h2>
      {r.from && <p className="mt-1 text-small text-ink-soft">{r.from}</p>}
      <pre className="mt-4 whitespace-pre-wrap font-sans text-body-sm text-ink">{recipeText(r).split("\n").slice(1).join("\n").trim()}</pre>
    </Sheet>
  );
}
