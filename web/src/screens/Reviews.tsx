// Reviews of a recipe: the average with a star breakdown, the list (sorting, «Полезно», complaints)
// and the form in a sheet. The rules open in a sheet over the form, so a half-written review is kept.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star, ThumbsUp, Flag, Camera, X, PenLine, MessageSquare, RotateCw } from "lucide-react";
import { legalDoc, legalInfo, plural, reviewsApi, reviewsWord, ratingText, type Recipe, type Review, type ReviewList } from "../engine";
import { useStore } from "../app/store";
import { Section, Segmented, Sheet, cx } from "../components/ui";

type Sort = "new" | "top" | "photos";

const when = (ms: number) => {
  const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);
  return d <= 0 ? "сегодня" : d === 1 ? "вчера" : new Date(ms).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const RATING_WORD = ["", "Не понравилось", "Так себе", "Нормально", "Хорошо", "Отлично"];

export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cx("inline-flex shrink-0 gap-px", className)} role="img" aria-label={"Оценка " + ratingText(value) + " из 5"}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} aria-hidden className={n <= Math.round(value) ? "fill-warn text-warn" : "text-line-strong/50"} />)}
    </span>
  );
}

/** The reviews of one recipe: loaded once here so the page can show the average next to the title. */
export function useReviews(recipeId: string) {
  const { online } = useStore();
  const [data, setData] = useState<ReviewList | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const turn = useRef(0);
  const load = useCallback(() => {
    if (!online) return;
    const id = ++turn.current;
    setError("");
    reviewsApi.list(recipeId, sort)
      .then((d) => { if (id === turn.current) setData(d); })
      .catch((e) => { if (id === turn.current) setError(e instanceof Error && e.message ? e.message : "Не удалось загрузить отзывы."); });
  }, [recipeId, sort, online]);
  useEffect(load, [load]);
  const loadMore = useCallback(() => {
    if (!data || more) return;
    setMore(true);
    reviewsApi.list(recipeId, sort, data.reviews.length)
      .then((d) => setData((x) => (x ? { ...d, reviews: [...x.reviews, ...d.reviews.filter((r) => !x.reviews.some((y) => y.id === r.id))] } : d)))
      .catch(() => {})
      .finally(() => setMore(false));
  }, [data, more, recipeId, sort]);
  return { data, sort, setSort, error, load, loadMore, loadingMore: more, online };
}
export type ReviewsState = ReturnType<typeof useReviews>;

export function Reviews({ recipe, state, id, className }: { recipe: Recipe; state: ReviewsState; id?: string; className?: string }) {
  const { toast } = useStore();
  const { data, sort, setSort, error, load, loadMore, loadingMore, online } = state;
  const [writing, setWriting] = useState(false);
  const [report, setReport] = useState<Review | null>(null);
  if (!online && !data) return null;
  const sum = data?.summary;
  const count = sum?.count ?? 0;
  const like = (r: Review) => reviewsApi.like(r.id, !r.liked).then(load).catch((e: Error) => toast(e.message));

  return (
    <Section id={id} className={className} title="Отзывы"
      action={data && (count > 0 || data.mine) ? <button className="btn-soft h-10 px-4" onClick={() => setWriting(true)}><PenLine size={16} />{data.mine ? "Изменить" : "Оценить"}</button> : undefined}>
      {!data && !error && (
        <div className="space-y-3" aria-label="Загружаю отзывы">
          <div className="skeleton h-28 rounded-card" />
          <div className="skeleton h-24 rounded-card" />
        </div>
      )}
      {!data && error && (
        <div className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
          <p className="text-body-sm text-ink-soft">Не удалось загрузить отзывы.</p>
          <button className="btn-ghost h-10 shrink-0 px-3" onClick={load}><RotateCw size={16} />Ещё раз</button>
        </div>
      )}

      {data && count === 0 && !data.reviews.length && (
        <div className="rounded-card border border-dashed border-line-strong/50 px-5 py-6 text-center">
          <MessageSquare size={32} className="mx-auto text-ink-faint" aria-hidden />
          <h3 className="mt-2 text-title">Отзывов пока нет</h3>
          <p className="mx-auto mt-1 max-w-sm text-body-sm text-ink-soft">Приготовили? Расскажите, как получилось, — это поможет другим.</p>
          <button className="btn-primary mt-4" onClick={() => setWriting(true)}><Star size={18} />Оценить рецепт</button>
        </div>
      )}

      {sum && count > 0 && <Summary sum={sum} />}

      {data && data.reviews.length > 1 && (
        <div className="mt-4">
          <Segmented<Sort> label="Порядок отзывов" value={sort} onChange={setSort}
            options={[{ id: "new", label: "Новые" }, { id: "top", label: "Полезные" }, { id: "photos", label: "С фото" }]} />
        </div>
      )}

      {data && data.reviews.length > 0 && (
        <div className="mt-4 space-y-3">
          {data.reviews.map((r) => <ReviewCard key={r.id} r={r} onLike={() => like(r)} onReport={() => setReport(r)} onEdit={() => setWriting(true)} />)}
          {data.more && <button className="btn-outline w-full" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Загружаю…" : "Показать ещё"}</button>}
        </div>
      )}

      <ReviewForm open={writing} onClose={() => setWriting(false)} recipe={recipe} data={data} onSaved={() => { setWriting(false); load(); }} />
      <ReportSheet review={report} onClose={() => setReport(null)} />
    </Section>
  );
}

/** «4,6 ★★★★★ 12 отзывов» and a bar for each number of stars. */
function Summary({ sum }: { sum: ReviewList["summary"] }) {
  const top = Math.max(1, ...sum.dist);
  return (
    <div className="card flex items-center gap-5 p-4 sm:gap-8 sm:px-6">
      <div className="shrink-0 text-center">
        <div className="text-display tabular-nums">{ratingText(sum.avg)}</div>
        <Stars value={sum.avg} size={14} />
        <div className="mt-1 text-caption text-ink-soft">{reviewsWord(sum.count)}</div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1" aria-label="Сколько оценок по звёздам">
        {[5, 4, 3, 2, 1].map((n) => {
          const c = sum.dist[n - 1] ?? 0;
          return (
            <li key={n} className="flex items-center gap-2 text-caption text-ink-soft" aria-label={n + " " + plural(n, "звезда", "звезды", "звёзд") + ": " + c}>
              <span className="w-2 text-right tabular-nums" aria-hidden>{n}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <span className="block h-full rounded-full bg-warn" style={{ width: (c / top) * 100 + "%" }} />
              </span>
              <span className="w-6 tabular-nums" aria-hidden>{c}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({ r, onLike, onReport, onEdit }: { r: Review; onLike: () => void; onReport: () => void; onEdit: () => void }) {
  const meta = [when(r.created), r.edited && "изменён", r.pending && "на проверке"].filter(Boolean).join(" · ");
  return (
    <article className="card p-4" aria-label={"Отзыв: " + r.author}>
      <header className="flex items-start gap-3">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-body font-semibold text-ink-soft">{r.author.trim().charAt(0).toUpperCase() || "?"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-body-sm font-semibold">{r.author}</span>
            {r.mine && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-micro font-semibold text-brand-ink">Ваш</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ink-soft"><Stars value={r.rating} size={14} /><span>{meta}</span></div>
        </div>
      </header>
      {r.text && <p className="mt-3 whitespace-pre-line text-body-sm">{r.text}</p>}
      {r.photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.photos.map((p) => <a key={p} href={p} target="_blank" rel="noopener noreferrer" className="block"><img src={p} alt="Фото блюда из отзыва" loading="lazy" className="h-20 w-20 rounded-input bg-sunken object-cover" /></a>)}
        </div>
      )}
      {r.replies.map((x) => (
        <div key={x.id} className="mt-3 rounded-input bg-sunken px-3 py-2 text-small"><span className="font-semibold">{x.author}</span>{x.pending ? " (на проверке)" : ""}: {x.text}</div>
      ))}
      <footer className="-mb-2 -ml-3 mt-1 flex flex-wrap items-center">
        {r.mine ? (
          <button className="btn-ghost h-11 px-3" onClick={onEdit}><PenLine size={16} />Изменить</button>
        ) : (
          <>
            <button className={cx("btn-ghost h-11 px-3", r.liked && "text-brand")} aria-pressed={r.liked} onClick={onLike}>
              <ThumbsUp size={16} className={cx(r.liked && "fill-brand/20")} />Полезно{r.likes ? <span className="tabular-nums">· {r.likes}</span> : null}
            </button>
            <button className="btn-ghost h-11 px-3" onClick={onReport}><Flag size={16} />Пожаловаться</button>
          </>
        )}
      </footer>
    </article>
  );
}

const REASONS: { id: "rude" | "spam" | "wrong" | "other"; label: string }[] = [
  { id: "rude", label: "Оскорбления или хамство" },
  { id: "spam", label: "Реклама или спам" },
  { id: "wrong", label: "Неверный или опасный совет" },
  { id: "other", label: "Другое" },
];

function ReportSheet({ review, onClose }: { review: Review | null; onClose: () => void }) {
  const { toast } = useStore();
  const send = (reason: (typeof REASONS)[number]["id"]) => {
    if (!review) return;
    reviewsApi.report("review", review.id, reason).then(() => toast("Спасибо, проверим")).catch((e: Error) => toast(e.message));
    onClose();
  };
  return (
    <Sheet open={!!review} title="Пожаловаться на отзыв" onClose={onClose}>
      <p className="text-body-sm text-ink-soft">Что не так с отзывом{review ? " от " + review.author : ""}?</p>
      <div className="mt-3 grid gap-2">
        {REASONS.map((x) => <button key={x.id} className="flex min-h-[52px] items-center rounded-input border border-line bg-card px-4 text-left text-body-sm hover:border-line-strong/60" onClick={() => send(x.id)}>{x.label}</button>)}
      </div>
    </Sheet>
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
  const [problem, setProblem] = useState("");
  const [sure, setSure] = useState(false);
  const [rules, setRules] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRating(mine?.rating ?? 0); setText(mine?.text ?? ""); setAuthor(data?.author ?? ""); setConsent(!!data?.consented); setKeep(mine?.photos ?? []);
    setFiles([]); setProblem(""); setSure(false);
  }, [open, mine, data]);
  // Previews of the new photos (released when they change).
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const save = async () => {
    if (!rating) return setProblem("Поставьте оценку — от 1 до 5 звёзд.");
    if (!author.trim()) return setProblem("Напишите, как вас подписать.");
    if (!consent) return setProblem("Отметьте согласие с правилами — без него отзыв нельзя опубликовать.");
    setProblem("");
    setBusy(true);
    try { await reviewsApi.save({ recipeId: recipe.id, rating, text, author, consent, keep, files }); toast("Спасибо за отзыв!"); onSaved(); }
    catch (e) { setProblem(e instanceof Error && e.message ? e.message : "Не удалось сохранить отзыв."); }
    finally { setBusy(false); }
  };
  const remove = () => {
    if (!mine) return;
    if (!sure) return setSure(true);
    setBusy(true);
    reviewsApi.remove(mine.id).then(() => { toast("Отзыв удалён"); onSaved(); }).catch((e: Error) => setProblem(e.message)).finally(() => setBusy(false));
  };
  const photo = (src: string, alt: string, drop: () => void) => (
    <span key={src} className="relative">
      <img src={src} alt={alt} className="h-[72px] w-[72px] rounded-input bg-sunken object-cover" />
      <button type="button" className="absolute -right-3 -top-3 grid h-11 w-11 place-items-center" onClick={drop} aria-label="Убрать фото">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-paper shadow-e1"><X size={14} /></span>
      </button>
    </span>
  );

  return (
    <>
      <Sheet open={open} title={mine ? "Ваш отзыв" : "Оценить рецепт"} onClose={onClose}
        footer={
          <div className="space-y-3">
            {problem && <p role="alert" className="text-small text-brand">{problem}</p>}
            <div className="flex gap-2">
              {mine && <button className={cx(sure ? "btn-danger" : "btn-ghost")} disabled={busy} onClick={remove}>{sure ? "Удалить отзыв?" : "Удалить"}</button>}
              <button className="btn-primary flex-1" disabled={busy} onClick={save}>{busy ? "Сохраняю…" : "Опубликовать"}</button>
            </div>
          </div>
        }>
        <div className="space-y-5 pb-1">
          <div className="text-center">
            <p className="text-body-sm text-ink-soft">«{recipe.title}»</p>
            <div className="mt-2 inline-flex" role="radiogroup" aria-label="Оценка">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={n + " из 5"} onClick={() => { setRating(n); setProblem(""); }}
                  className="grid h-12 w-12 place-items-center rounded-full transition-transform duration-150 active:scale-90">
                  <Star size={32} className={n <= rating ? "fill-warn text-warn" : "text-line-strong"} />
                </button>
              ))}
            </div>
            <p className="h-5 text-small font-semibold text-ink-soft" aria-live="polite">{RATING_WORD[rating]}</p>
          </div>
          <label className="block">
            <span className="label">Отзыв</span>
            <textarea className="input mt-1.5 min-h-[112px]" placeholder="Как получилось? Что бы поменяли?" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          </label>
          <div>
            <span className="label">Фото блюда</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {keep.map((p) => photo(p, "Фото из вашего отзыва", () => setKeep((k) => k.filter((x) => x !== p))))}
              {previews.map((u, i) => photo(u, "Новое фото", () => setFiles((x) => x.filter((_, j) => j !== i))))}
              {keep.length + files.length < 3 && (
                <label className="grid h-[72px] w-[72px] cursor-pointer place-items-center rounded-input border border-dashed border-line-strong/60 text-ink-soft hover:bg-sunken focus-within:ring-2 focus-within:ring-brand">
                  <span className="flex flex-col items-center gap-0.5 text-caption"><Camera size={20} aria-hidden />Добавить</span>
                  <input type="file" accept="image/*" className="sr-only" aria-label="Добавить фото"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setFiles((x) => [...x, f]); e.target.value = ""; }} />
                </label>
              )}
            </div>
            <p className="mt-1.5 text-caption text-ink-faint">До 3 фото</p>
          </div>
          <label className="block">
            <span className="label">Подпись</span>
            <input className="input mt-1.5" placeholder="Например, Марина" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} autoComplete="given-name" />
          </label>
          <div className="flex items-start gap-3">
            <input id="review-consent" type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" checked={consent} onChange={(e) => { setConsent(e.target.checked); setProblem(""); }} />
            <label htmlFor="review-consent" className="text-small text-ink-soft">
              Согласен с <button type="button" className="link" onClick={() => setRules(true)}>правилами отзывов</button>: подпись, текст и фото увидят все.
            </label>
          </div>
        </div>
      </Sheet>
      <RulesSheet open={rules} onClose={() => setRules(false)} />
    </>
  );
}

/** «Правила отзывов» over the form (the draft stays as it is). */
function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [doc, setDoc] = useState<ReturnType<typeof legalDoc> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open || doc) return;
    setFailed(false);
    legalInfo().then((info) => setDoc(legalDoc("rules", info))).catch(() => setFailed(true));
  }, [open, doc]);
  return (
    <Sheet open={open} title={doc?.title ?? "Правила отзывов"} onClose={onClose} tall footer={<button className="btn-primary w-full" onClick={onClose}>Понятно</button>}>
      {!doc && !failed && <div className="space-y-2 pt-1" aria-label="Загружаю правила"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-4" /><div className="skeleton h-4 w-5/6" /></div>}
      {failed && <p className="text-body-sm text-ink-soft">Не удалось открыть правила. Проверьте интернет и попробуйте ещё раз.</p>}
      {doc && (
        <article className="space-y-4 pb-2 text-body-sm">
          {doc.sections.map((sec, i) => (
            <section key={i}>
              {sec.h && <h3 className="mb-1 font-sans text-title">{sec.h}</h3>}
              {sec.p.map((p, j) => <p key={j} className="mb-2 text-ink-soft">{p}</p>)}
            </section>
          ))}
        </article>
      )}
    </Sheet>
  );
}
