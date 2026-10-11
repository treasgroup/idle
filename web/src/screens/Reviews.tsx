import { useCallback, useEffect, useState } from "react";
import { Star, ThumbsUp, Flag, Camera, X } from "lucide-react";
import { reviewsApi, reviewsWord, ratingText, type Recipe, type ReviewList } from "../engine";
import { useStore } from "../app/store";
import { replace, routeHash } from "../app/router";
import { Section, Sheet, cx } from "../components/ui";

const when = (ms: number) => {
  const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);
  return d <= 0 ? "сегодня" : d === 1 ? "вчера" : new Date(ms).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

function Stars({ value, size = 16, onPick }: { value: number; size?: number; onPick?: (n: number) => void }) {
  return (
    <span className="inline-flex" role={onPick ? "radiogroup" : undefined} aria-label={onPick ? "Оценка" : "Оценка " + value + " из 5"}>
      {[1, 2, 3, 4, 5].map((n) => onPick ? (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={n + " из 5"} onClick={() => onPick(n)} className="p-1">
          <Star size={size} className={cx(n <= value ? "fill-warn text-warn" : "text-line")} />
        </button>
      ) : <Star key={n} size={size} className={cx(n <= Math.round(value) ? "fill-warn text-warn" : "text-line")} />)}
    </span>
  );
}

export function Reviews({ recipe }: { recipe: Recipe }) {
  const { online, toast } = useStore();
  const [data, setData] = useState<ReviewList | null>(null);
  const [sort, setSort] = useState("new");
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!online) return;
    reviewsApi.list(recipe.id, sort).then(setData).catch((e) => setError(e instanceof Error ? e.message : ""));
  }, [recipe.id, sort, online]);
  useEffect(load, [load]);

  if (!online && !data) return null;
  const sum = data?.summary;
  return (
    <Section title={sum && sum.count ? <span className="flex items-center gap-2">Отзывы <span className="text-base font-normal text-ink-soft">★ {ratingText(sum.avg)} · {reviewsWord(sum.count)}</span></span> : "Отзывы"}
      action={<button className="text-sm font-semibold text-brand" onClick={() => setWriting(true)}>{data?.mine ? "Изменить свой" : "Оценить"}</button>}>
      <div className="space-y-3 px-4">
        {error && !data && <p className="text-sm text-ink-faint">{error}</p>}
        {data && !data.reviews.length && <p className="text-sm text-ink-faint">Отзывов пока нет. Приготовили? Расскажите, как получилось, — это поможет другим.</p>}
        {data && data.reviews.length > 1 && (
          <div className="flex gap-2 text-sm">
            {[["new", "Новые"], ["top", "Полезные"], ["photos", "С фото"]].map(([k, l]) => <button key={k} className={cx("chip py-1", sort === k && "chip-on")} onClick={() => setSort(k)}>{l}</button>)}
          </div>
        )}
        {data?.reviews.map((r) => (
          <article key={r.id} className="card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0"><span className="font-semibold">{r.author}</span> <span className="text-xs text-ink-faint">· {when(r.created)}{r.edited ? " · изменён" : ""}{r.pending ? " · на проверке" : ""}</span></div>
              <Stars value={r.rating} size={14} />
            </div>
            {r.text && <p className="mt-1.5 whitespace-pre-line text-[15px]">{r.text}</p>}
            {r.photos.length > 0 && <div className="scroll-x mt-2">{r.photos.map((p) => <a key={p} href={p} target="_blank" rel="noopener noreferrer"><img src={p} alt="Фото блюда из отзыва" loading="lazy" className="h-24 w-24 rounded-lg object-cover" /></a>)}</div>}
            {r.replies.map((x) => <div key={x.id} className="mt-2 rounded-lg bg-paper px-3 py-2 text-sm"><b>{x.author}</b>: {x.text}</div>)}
            <div className="mt-2 flex items-center gap-3 text-xs text-ink-faint">
              {!r.mine && <button className={cx("inline-flex items-center gap-1", r.liked && "text-brand")} onClick={() => reviewsApi.like(r.id, !r.liked).then(load).catch((e: Error) => toast(e.message))}><ThumbsUp size={13} /> Полезно{r.likes ? " · " + r.likes : ""}</button>}
              {!r.mine && <button className="inline-flex items-center gap-1" onClick={() => reviewsApi.report("review", r.id, "other").then(() => toast("Спасибо, проверим")).catch((e: Error) => toast(e.message))}><Flag size={13} /> Пожаловаться</button>}
            </div>
          </article>
        ))}
      </div>
      <ReviewForm open={writing} onClose={() => setWriting(false)} recipe={recipe} data={data} onSaved={() => { setWriting(false); load(); }} />
    </Section>
  );
}

function ReviewForm({ open, onClose, recipe, data, onSaved }: { open: boolean; onClose: () => void; recipe: Recipe; data: ReviewList | null; onSaved: () => void }) {
  const { toast } = useStore();
  const mine = data?.mine;
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [text, setText] = useState(mine?.text ?? "");
  const [author, setAuthor] = useState(data?.author ?? "");
  const [consent, setConsent] = useState(!!data?.consented);
  const [keep, setKeep] = useState<string[]>(mine?.photos ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRating(mine?.rating ?? 0); setText(mine?.text ?? ""); setAuthor(data?.author ?? ""); setConsent(!!data?.consented); setKeep(mine?.photos ?? []); setFiles([]);
  }, [open, mine, data]);

  const save = async () => {
    if (!rating) return toast("Поставьте оценку — от 1 до 5 звёзд.");
    if (!author.trim()) return toast("Напишите, как вас подписать.");
    if (!consent) return toast("Отметьте согласие с правилами — без него отзыв нельзя опубликовать.");
    setBusy(true);
    try { await reviewsApi.save({ recipeId: recipe.id, rating, text, author, consent, keep, files }); toast("Спасибо за отзыв!"); onSaved(); }
    catch (e) { toast(e instanceof Error ? e.message : "Не удалось сохранить отзыв."); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} title="Ваш отзыв" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex justify-center"><Stars value={rating} size={30} onPick={setRating} /></div>
        <textarea className="input min-h-[96px]" placeholder="Как получилось? Что бы поменяли?" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <div className="flex flex-wrap gap-2">
          {keep.map((p) => <span key={p} className="relative"><img src={p} alt="" className="h-16 w-16 rounded-lg object-cover" /><button className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-paper" onClick={() => setKeep((k) => k.filter((x) => x !== p))} aria-label="Убрать фото"><X size={12} /></button></span>)}
          {files.map((f, i) => <span key={i} className="relative"><img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover" /><button className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-paper" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label="Убрать фото"><X size={12} /></button></span>)}
          {keep.length + files.length < 3 && (
            <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-line text-ink-faint" aria-label="Добавить фото">
              <Camera size={20} />
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFiles((x) => [...x, f]); e.target.value = ""; }} />
            </label>
          )}
        </div>
        <input className="input" placeholder="Как вас подписать? Например, Марина" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} />
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Согласен с <button type="button" className="underline" onClick={() => replace(routeHash({ doc: "rules" }))}>Правилами отзывов</button>: подпись, текст и фото будут видны всем.</span>
        </label>
        <div className="flex gap-2">
          {mine && <button className="btn-ghost text-brand" disabled={busy} onClick={() => reviewsApi.remove(mine.id).then(() => { toast("Отзыв удалён"); onSaved(); }).catch((e: Error) => toast(e.message))}>Удалить</button>}
          <button className="btn-primary flex-1" disabled={busy} onClick={save}>{busy ? "Сохраняю…" : "Опубликовать"}</button>
        </div>
      </div>
    </Sheet>
  );
}
