// «Стол в складчину»: the list of this device's tables, a new table (the occasion, when and where, the dishes and
// what to bring), and the table itself — the same page for the organiser and the guests who opened the link:
// «приду / не смогу», «Я приготовлю», «Возьму я», who can't eat what, and the optional split of the expenses.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ChevronRight, MapPin, Plus, RefreshCw, Send, Settings2, ShoppingCart, Trash2, Users, Wallet, X } from "lucide-react";
import {
  LABELS, addToShopping, clampServings, ingredientsToBuy, plural, recipeById, searchRecipes, siteBase, type Recipe,
} from "../engine";
import { useStore } from "../app/store";
import { useActions, haveIds } from "../app/actions";
import { cue } from "../app/feedback";
import {
  CANT, FORMATS, candidates, forgetParty, formatOf, guestName, guestSecret, headcount, knownParties, nextSaturday, partyCall, rememberParty, settle,
  warnings, whenLine, type Party, type PartyDraft, type PartyFormat, type PartyItem, type Status,
} from "../app/party";
import { RecipeImage } from "./RecipeCard";
import { ShareOptions } from "./ShareOptions";
import { Chip, Layer, Sheet, Stepper, Toggle, cx } from "./ui";

type Screen = { to: "list" } | { to: "new"; draft?: PartyDraft } | { to: "table"; token: string; fresh?: boolean };

export function PartyLayer({ token, draft, onClose }: { token?: string | null; draft?: PartyDraft; onClose: () => void }) {
  const [screen, setScreen] = useState<Screen>(token ? { to: "table", token } : draft ? { to: "new", draft } : knownParties().length ? { to: "list" } : { to: "new" });
  // «Назад» steps back to the list of tables; from the list (or a table opened by a link with nothing else) it closes.
  const back = () => (screen.to === "list" || (!knownParties().length && screen.to !== "table") ? onClose() : setScreen({ to: "list" }));
  return (
    <Layer title="Стол в складчину" onClose={back} width="max-w-xl">
      <div className="px-4 pb-12 sm:px-6">
        {screen.to === "list" && <PartyList onOpen={(t) => setScreen({ to: "table", token: t })} onNew={() => setScreen({ to: "new" })} />}
        {screen.to === "new" && <PartyNew draft={screen.draft} onCreated={(t) => setScreen({ to: "table", token: t, fresh: true })} />}
        {screen.to === "table" && <PartyTable key={screen.token} token={screen.token} fresh={screen.fresh} onGone={() => setScreen(knownParties().length ? { to: "list" } : { to: "new" })} />}
      </div>
    </Layer>
  );
}

function PartyList({ onOpen, onNew }: { onOpen: (token: string) => void; onNew: () => void }) {
  const list = knownParties();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <h1 className="text-h1">Стол в складчину</h1>
      <p className="mt-1 text-body-sm text-ink-soft">Каждый приносит своё — и всё видно в одном списке: кто что готовит, кому что нельзя, кто берёт мангал.</p>
      <button className="btn-primary btn-bar mt-5 w-full" onClick={onNew}><Plus size={18} aria-hidden />Собрать стол</button>
      {list.length > 0 && <p className="label mb-2 mt-6">Мои столы</p>}
      <div className="grid gap-2">
        {list.map((k) => (
          <button key={k.token} onClick={() => onOpen(k.token)} className={cx("card flex min-h-[64px] items-center gap-3 px-4 py-3 text-left", k.date < today && "opacity-70")}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-semibold">{k.title}</span>
              <span className="block text-caption text-ink-soft">{whenLine({ date: k.date, time: "" })}{k.admin ? " · вы организатор" : ""}{k.date < today ? " · прошёл" : ""}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
          </button>
        ))}
      </div>
    </>
  );
}

// ---------- A new table ----------
function PartyNew({ draft, onCreated }: { draft?: PartyDraft; onCreated: (token: string) => void }) {
  const { s, profile, toast } = useStore();
  const [format, setFormat] = useState<PartyFormat>(draft?.format ?? "dinner");
  const f = formatOf(format);
  const [title, setTitle] = useState(f.label);
  const [date, setDate] = useState(nextSaturday);
  const [time, setTime] = useState(f.hour);
  const [place, setPlace] = useState("");
  const [name, setName] = useState(profile.name ?? "");
  const [expenses, setExpenses] = useState(false);
  const pools = useMemo(() => candidates(format, s.preferences), [format, s.preferences]);
  // The dishes: from «Праздничный стол» as they were, otherwise the first candidate of each place of the format.
  const [dishes, setDishes] = useState<{ id: string | null; title: string; slot: string; n: number }[]>([]);
  const [things, setThings] = useState<{ title: string; on: boolean }[]>([]);
  const touched = useRef(false);
  useEffect(() => {
    if (draft?.dishes?.length && !touched.current) setDishes(draft.dishes.map((d) => ({ id: d.id, title: d.title, slot: d.slot ?? "", n: 0 })));
    else setDishes(f.slots.map((sl, i) => ({ id: pools[i]?.[0]?.id ?? null, title: pools[i]?.[0]?.title ?? "", slot: sl.label, n: 0 })).filter((d) => d.title));
    setThings(f.things.map((t) => ({ title: t, on: true })));
    if (!touched.current || FORMATS.some((x) => x.label === title)) setTitle(f.label);
    setTime(f.hour);
    touched.current = true;
  }, [format]); // eslint-disable-line react-hooks/exhaustive-deps
  const swap = (i: number) => setDishes((l) => l.map((d, k) => {
    if (k !== i) return d;
    const slot = f.slots.findIndex((sl) => sl.label === d.slot);
    const pool = (slot >= 0 ? pools[slot] : []).filter((r) => !l.some((x, j) => j !== i && x.id === r.id));
    if (!pool.length) return d;
    const r = pool[(d.n + 1) % pool.length];
    return { ...d, id: r.id, title: r.title, n: d.n + 1 };
  }));
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const j = await partyCall<{ token: string; admin: string; party: Party }>("party.create", {
        guest: guestSecret(), title, format, date, time, place,
        dishes: dishes.map((d) => ({ id: d.id, title: d.title, slot: d.slot })), things: things.filter((t) => t.on).map((t) => ({ title: t.title })),
        expenses, me: { name: name.trim(), status: "yes", plus: 0 },
      });
      rememberParty({ token: j.token, admin: j.admin, title: j.party.title, date: j.party.date });
      cue("done");
      onCreated(j.token);
    } catch (e) { toast((e as Error).message); setBusy(false); }
  };

  return (
    <>
      <h1 className="text-h1">Новый стол</h1>
      <p className="mt-1 text-body-sm text-ink-soft">Выберите повод — блюда и что взять подберу сам, поменять можно всё.</p>
      <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Повод">
        {FORMATS.map((x) => (
          <button key={x.id} role="radio" aria-checked={format === x.id} onClick={() => setFormat(x.id)}
            className={cx("flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-input border px-1 text-center text-small leading-tight", format === x.id ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-card")}>
            <span className="text-[1.375rem] leading-none" aria-hidden>{x.emoji}</span>{x.label}
          </button>
        ))}
      </div>

      <label className="mt-5 block"><span className="label mb-1.5 block">Название</span><input className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="mt-3 grid grid-cols-[1fr_7.5rem] gap-2">
        <label><span className="label mb-1.5 block">День</span><input className="input" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        <label><span className="label mb-1.5 block">Время</span><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      <label className="mt-3 block"><span className="label mb-1.5 block">Где <span className="font-normal normal-case tracking-normal text-ink-faint">— необязательно</span></span>
        <input className="input" value={place} maxLength={120} placeholder="Например, у нас на даче" onChange={(e) => setPlace(e.target.value)} /></label>

      <p className="label mb-2 mt-6">Блюда</p>
      <div className="grid gap-2">
        {dishes.map((d, i) => {
          const r = d.id ? recipeById(d.id) : undefined;
          return (
            <div key={i} className="card flex items-center gap-3 p-2 pr-1">
              <Thumb r={r} />
              <span className="min-w-0 flex-1"><span className="block text-caption text-ink-soft">{d.slot || "Блюдо"}</span><span className="block truncate text-body-sm font-semibold">{d.title}</span></span>
              {d.slot && f.slots.some((sl) => sl.label === d.slot) && <button className="icon-btn" onClick={() => swap(i)} aria-label={"Другое блюдо вместо: " + d.title}><RefreshCw size={18} /></button>}
              <button className="icon-btn" onClick={() => setDishes((l) => l.filter((_, k) => k !== i))} aria-label={"Убрать " + d.title}><X size={18} /></button>
            </div>
          );
        })}
      </div>
      <AddItem dish label="Добавить блюдо" onAdd={(x) => setDishes((l) => [...l, { id: x.id ?? null, title: x.title, slot: "", n: 0 }])} />

      <p className="label mb-2 mt-6">Что взять, кроме еды</p>
      <div className="flex flex-wrap gap-2">
        {things.map((t, i) => <Chip key={t.title} on={t.on} onClick={() => setThings((l) => l.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))}>{t.on && <Check size={14} aria-hidden />}{t.title}</Chip>)}
      </div>
      <AddItem label="Своё" onAdd={(x) => setThings((l) => [...l, { title: x.title, on: true }])} />

      <label className="mt-6 block"><span className="label mb-1.5 block">Как вас зовут — для гостей</span>
        <input className="input" value={name} maxLength={30} placeholder="Например, Анна" onChange={(e) => setName(e.target.value)} /></label>
      <div className="mt-3"><Toggle on={expenses} onChange={setExpenses} label="Посчитать расходы" hint="Каждый впишет, сколько потратил, — покажу, кто кому сколько переводит" /></div>

      <button className="btn-primary btn-bar mt-5 w-full" disabled={busy || !dishes.length && !things.some((t) => t.on)} onClick={create}><Send size={18} aria-hidden />{busy ? "Создаю…" : "Создать и позвать гостей"}</button>
      <p className="mt-2 text-center text-caption text-ink-faint">Гостям не нужно ничего устанавливать — откроют ссылку.</p>
    </>
  );
}

/** «Добавить блюдо»: the catalog's dishes as you type, or the words as your own dish. */
function AddItem({ label, dish, onAdd }: { label: string; dish?: boolean; onAdd: (x: { title: string; id?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const found = dish && q.trim().length >= 2 ? searchRecipes(q.trim()).slice(0, 4) : [];
  const add = (x: { title: string; id?: string }) => { onAdd(x); setQ(""); setOpen(false); };
  if (!open) return <button className="btn-ghost mt-2 px-3 text-brand" onClick={() => setOpen(true)}><Plus size={18} aria-hidden />{label}</button>;
  return (
    <div className="mt-2 rounded-card border border-line bg-card p-2">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) add({ title: q.trim() }); }}>
        <input className="input h-11" autoFocus value={q} maxLength={80} placeholder={dish ? "Например, пирог с капустой" : "Например, гитара"} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="icon-btn" onClick={() => { setOpen(false); setQ(""); }} aria-label="Закрыть"><X size={18} /></button>
      </form>
      {found.map((r) => <button key={r.id} className="flex min-h-[48px] w-full items-center gap-3 rounded-input px-1 text-left hover:bg-sunken" onClick={() => add({ title: r.title, id: r.id })}><Thumb r={r} small /><span className="text-body-sm">{r.title}</span></button>)}
      {q.trim() && <button className="flex min-h-[44px] w-full items-center gap-2 rounded-input px-2 text-left text-body-sm text-brand hover:bg-sunken" onClick={() => add({ title: q.trim() })}><Plus size={16} aria-hidden />Добавить «{q.trim()}»{dish ? " как своё блюдо" : ""}</button>}
    </div>
  );
}

function Thumb({ r, small }: { r?: Recipe; small?: boolean }) {
  const size = small ? "h-9 w-9" : "h-12 w-12";
  return r ? <RecipeImage recipe={r} className={cx(size, "shrink-0")} rounded="rounded-[12px]" />
    : <span className={cx(size, "grid shrink-0 place-items-center rounded-[12px] bg-sunken text-[1.25rem]")} aria-hidden>🥘</span>;
}

// ---------- The table ----------
function PartyTable({ token, fresh, onGone }: { token: string; fresh?: boolean; onGone: () => void }) {
  const { s, update, profile, toast } = useStore();
  const { openRecipe } = useActions();
  const known = knownParties().find((k) => k.token === token);
  const admin = known?.admin;
  const guest = guestSecret();
  const [p, setP] = useState<Party | null>(null);
  const [error, setError] = useState("");
  const [share, setShare] = useState(!!fresh);
  const [edit, setEdit] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [busy, setBusy] = useState("");

  const take = (v: Party) => { setP(v); rememberParty({ token, title: v.title, date: v.date }); };
  const load = () => partyCall("party.get", { token, guest, admin }).then(take).catch((e: Error & { status?: number }) => {
    if (e.status === 404) { forgetParty(token); setError(e.message); } else if (!p) setError(e.message);
  });
  useEffect(() => {
    void load();
    // Others answer and take dishes meanwhile: a fresh look every 15 seconds while the page is in front.
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => clearInterval(t);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (body: Record<string, unknown>, what = "act") => {
    setBusy(what);
    try { take(await partyCall("party.act", { token, guest, admin, ...body })); return true; }
    catch (e) { toast((e as Error).message); void load(); return false; }
    finally { setBusy(""); }
  };

  if (error && !p) return (
    <div className="pt-6 text-center">
      <p className="text-h2">Стол не открылся</p>
      <p className="mt-2 text-body-sm text-ink-soft">{error}</p>
      <button className="btn-outline mt-5" onClick={onGone}>К моим столам</button>
    </div>
  );
  if (!p) return <div className="grid gap-3 pt-2" aria-busy="true"><div className="h-8 w-2/3 rounded-input bg-sunken" /><div className="h-24 rounded-card bg-sunken" /><div className="h-40 rounded-card bg-sunken" /></div>;

  const f = formatOf(p.format);
  const me = p.guests.find((g) => g.key === p.me);
  const answered = !!me && (!!me.name || p.me === p.host);
  const people = headcount(p);
  const maybe = p.guests.filter((g) => g.status === "maybe").length;
  const url = siteBase() + "#party=" + token;
  const shareText = f.emoji + " " + p.title + " — " + whenLine(p) + (p.place ? ", " + p.place : "") + ". Отметься, придёшь ли и что принесёшь: " + url;
  const mine = p.dishes.filter((d) => d.by === p.me && d.id).map((d) => recipeById(d.id!)).filter((r): r is Recipe => !!r);
  const toShopping = () => {
    const n = Math.max(people, 2), have = haveIds(s);
    update((st) => {
      let list = st.shopping;
      for (const r of mine) {
        const per = clampServings(r, n);
        for (let k = 0; k < Math.ceil(n / per); k++) list = addToShopping(list, ingredientsToBuy(r, per, have).filter((i) => !i.optional), r.title);
      }
      return { ...st, shopping: list };
    });
    cue("list");
    toast("Продукты для ваших блюд на " + n + " " + plural(n, "человека", "человека", "человек") + " — в покупках");
  };

  return (
    <>
      <p className="text-[2rem] leading-none" aria-hidden>{f.emoji}</p>
      <h1 className="mt-2 text-h1">{p.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-body-sm text-ink-soft"><CalendarDays size={16} aria-hidden />{whenLine(p)}</p>
      {p.place && <p className="mt-0.5 flex items-center gap-1.5 text-body-sm text-ink-soft"><MapPin size={16} aria-hidden />{p.place}</p>}
      {p.note && <p className="mt-2 text-body-sm">{p.note}</p>}

      <div className="mt-4 flex gap-2">
        <button className="btn-primary flex-1" onClick={() => setShare(true)}><Send size={18} aria-hidden />Позвать гостей</button>
        {p.admin && <button className="btn-outline" onClick={() => setEdit(true)} aria-label="Изменить стол"><Settings2 size={18} aria-hidden />Изменить</button>}
      </div>

      {/* Who is coming. */}
      <div className="card mt-4 px-4 py-3">
        <p className="flex items-center gap-2 text-body font-semibold"><Users size={18} className="text-ink-soft" aria-hidden />
          {people ? "Придут: " + people + " " + plural(people, "человек", "человека", "человек") : "Пока никто не ответил"}
          {maybe > 0 && <span className="font-normal text-ink-soft">· ещё {maybe} думают</span>}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.guests.filter((g) => g.name || g.key === p.host).map((g) => (
            <span key={g.key} className={cx("rounded-full px-2.5 py-1 text-caption", g.status === "yes" ? "bg-herb-soft text-ink" : g.status === "no" ? "bg-sunken text-ink-faint line-through" : "bg-warn-soft text-ink")}>
              {guestName(p, g.key)}{g.plus ? " +" + g.plus : ""}{g.key === p.host ? " · организатор" : ""}{g.key === p.me ? " (вы)" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* My answer: first thing for a guest who just opened the link. */}
      {!answered || answering
        ? <Answer p={p} busy={busy === "answer"} onSave={async (a) => { if (await act({ act: "answer", ...a }, "answer")) setAnswering(false); }} defaultName={profile.name ?? ""} />
        : (
          <button className="mt-3 flex w-full items-center gap-2 rounded-card bg-sunken px-4 py-3 text-left text-body-sm" onClick={() => setAnswering(true)}>
            <span className="flex-1">Вы: <b>{me!.status === "yes" ? "приду" : me!.status === "no" ? "не смогу" : "пока не знаю"}{me!.plus ? " +" + me!.plus : ""}</b>
              {me!.cant.length > 0 && <> · нельзя: {me!.cant.map((c) => (LABELS[c] ?? c).toLowerCase()).join(", ")}</>}</span>
            <span className="text-brand">Изменить</span>
          </button>
        )}

      <Items p={p} kind="dish" title={"Блюда" + (people > 1 ? " — на " + people + " " + plural(people, "человека", "человека", "человек") : "")} busy={busy}
        onAct={(b) => act(b, String(b.key ?? "add"))} onOpen={(id) => { const r = recipeById(id); if (r) openRecipe(r); }} canAct={answered} />
      {mine.length > 0 && <button className="btn-soft mt-2 w-full" onClick={toShopping}><ShoppingCart size={18} aria-hidden />Продукты для моих блюд — в покупки</button>}
      <Items p={p} kind="thing" title="Что взять, кроме еды" busy={busy} onAct={(b) => act(b, String(b.key ?? "add"))} canAct={answered} />

      {p.expenses && <Expenses p={p} busy={busy === "spent"} onSpent={(n) => act({ act: "answer", spent: n }, "spent")} canAct={answered} />}

      <Sheet open={share} title="Позвать гостей" onClose={() => setShare(false)}>
        <p className="mb-3 text-body-sm text-ink-soft">Отправьте ссылку в общий чат — гости отметят, придут ли, и возьмут блюда. Устанавливать ничего не нужно.</p>
        <ShareOptions title={p.title} text={shareText} url={url} onDone={(copied) => { setShare(false); if (copied) toast("Ссылка скопирована"); }} />
      </Sheet>
      {p.admin && <EditSheet open={edit} p={p} onClose={() => setEdit(false)} onAct={act} onDeleted={() => { forgetParty(token); toast("Стол удалён"); onGone(); }} token={token} admin={admin!} />}
    </>
  );
}

function Answer({ p, busy, onSave, defaultName }: { p: Party; busy: boolean; defaultName: string; onSave: (a: { name?: string; status: Status; plus: number; cant: string[] }) => void }) {
  const me = p.guests.find((g) => g.key === p.me);
  const host = p.me === p.host;
  const [name, setName] = useState(me?.name || defaultName);
  const [status, setStatus] = useState<Status>(me?.status ?? "yes");
  const [plus, setPlus] = useState(me?.plus ?? 0);
  const [cant, setCant] = useState<string[]>(me?.cant ?? []);
  return (
    <div className="card mt-3 p-4">
      <p className="text-body font-semibold">{host ? "Вы организатор" : "Придёте?"}</p>
      <input className="input mt-3" value={name} maxLength={30} placeholder="Ваше имя — его увидят гости" onChange={(e) => setName(e.target.value)} aria-label="Ваше имя" />
      {!host && (
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Придёте?">
          {([["yes", "Приду"], ["no", "Не смогу"], ["maybe", "Не знаю"]] as const).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={status === id} onClick={() => setStatus(id)}
              className={cx("h-11 rounded-input border text-small", status === id ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line bg-card")}>{label}</button>
          ))}
        </div>
      )}
      {status !== "no" && <>
        <div className="mt-3 flex items-center justify-between gap-3"><span className="text-body-sm">Со мной ещё</span><Stepper value={plus} min={0} max={6} onChange={setPlus} label="Сколько человек с вами" /></div>
        <p className="label mb-2 mt-4">Мне нельзя <span className="font-normal normal-case tracking-normal text-ink-faint">— увидят у блюд</span></p>
        <div className="flex flex-wrap gap-1.5">
          {CANT.map((c) => { const on = cant.includes(c); return <Chip key={c} on={on} onClick={() => setCant((l) => (on ? l.filter((x) => x !== c) : [...l, c]))}>{LABELS[c] ?? c}</Chip>; })}
        </div>
      </>}
      <button className="btn-primary mt-4 w-full" disabled={busy || (!host && !name.trim())} onClick={() => onSave({ name: name.trim(), status: host ? "yes" : status, plus: status === "no" ? 0 : plus, cant: status === "no" ? [] : cant })}>
        {busy ? "Сохраняю…" : "Готово"}
      </button>
    </div>
  );
}

function Items({ p, kind, title, busy, onAct, onOpen, canAct }: {
  p: Party; kind: "dish" | "thing"; title: string; busy: string; canAct: boolean;
  onAct: (b: Record<string, unknown>) => Promise<boolean>; onOpen?: (id: string) => void;
}) {
  const list = kind === "dish" ? p.dishes : p.things;
  if (!list.length && !canAct) return null;
  return (
    <>
      <p className="label mb-2 mt-6">{title}</p>
      <div className="card divide-y divide-line overflow-hidden">
        {list.map((x) => <ItemRow key={x.key} p={p} x={x} kind={kind} busy={busy === x.key} onAct={onAct} onOpen={onOpen} canAct={canAct} />)}
        {!list.length && <p className="px-4 py-3 text-body-sm text-ink-soft">Пока пусто.</p>}
      </div>
      {canAct && <AddItem dish={kind === "dish"} label={kind === "dish" ? (p.admin ? "Добавить блюдо" : "Принесу своё блюдо") : "Добавить"}
        onAdd={(a) => void onAct({ act: "add", kind, title: a.title, id: a.id, take: !p.admin })} />}
    </>
  );
}

function ItemRow({ p, x, kind, busy, onAct, onOpen, canAct }: {
  p: Party; x: PartyItem; kind: "dish" | "thing"; busy: boolean; canAct: boolean;
  onAct: (b: Record<string, unknown>) => Promise<boolean>; onOpen?: (id: string) => void;
}) {
  const r = x.id ? recipeById(x.id) : undefined;
  const warn = kind === "dish" ? warnings(p, x, LABELS) : [];
  const mine = !!x.by && x.by === p.me;
  const free = !x.by || !p.guests.some((g) => g.key === x.by);
  const removable = p.admin || (x.added && x.added === p.me);
  const action = canAct && (free
    ? <button className="btn-soft h-10 shrink-0 px-3 text-small" disabled={busy} onClick={() => void onAct({ act: "take", kind, key: x.key })}>{kind === "dish" ? "Я приготовлю" : "Возьму я"}</button>
    : mine || p.admin ? <button className="btn-ghost h-10 shrink-0 px-2 text-small" disabled={busy} onClick={() => void onAct({ act: "give", kind, key: x.key })}>{mine ? "Отказаться" : "Освободить"}</button> : null);
  // A dish's name is long: its button goes under it, so the name keeps the whole width. A thing's goes to the right.
  return (
    <div className={cx("flex gap-3 px-3 py-2.5", kind === "dish" ? "items-start" : "items-center", mine && "bg-herb-soft/60")}>
      {kind === "dish" && <Thumb r={r} />}
      <div className="min-w-0 flex-1">
        {r && onOpen ? <button className="block text-left text-body-sm font-semibold underline-offset-2 hover:underline" onClick={() => onOpen(r.id)}>{x.title}</button>
          : <span className="block text-body-sm font-semibold">{x.title}</span>}
        <span className="block text-caption text-ink-soft">{x.slot ? x.slot + " · " : ""}{free ? "никто ещё не взял" : mine ? (kind === "dish" ? "готовите вы" : "берёте вы") : (kind === "dish" ? "готовит " : "берёт ") + guestName(p, x.by)}</span>
        {warn.map((w) => <span key={w} className="mt-0.5 flex items-center gap-1 text-caption text-warn"><AlertTriangle size={13} className="shrink-0" aria-hidden />{w}</span>)}
        {kind === "dish" && action && <div className="-ml-0.5 mt-2">{action}</div>}
      </div>
      {kind === "thing" && action}
      {removable && <button className="icon-btn -mr-1 h-10 w-10 shrink-0" disabled={busy} onClick={() => void onAct({ act: "remove", kind, key: x.key })} aria-label={"Убрать " + x.title}><X size={16} /></button>}
    </div>
  );
}

function Expenses({ p, busy, onSpent, canAct }: { p: Party; busy: boolean; canAct: boolean; onSpent: (n: number | null) => Promise<boolean> }) {
  const me = p.guests.find((g) => g.key === p.me);
  const [v, setV] = useState(me?.spent ? String(me.spent) : "");
  useEffect(() => { setV(me?.spent ? String(me.spent) : ""); }, [me?.spent]);
  const st = settle(p);
  const rub = (n: number) => n.toLocaleString("ru-RU") + " ₽"; // own-sums: what the guests typed themselves
  return (
    <>
      <p className="label mb-2 mt-6">Расходы</p>
      <div className="card p-4">
        {canAct && (
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); const n = parseInt(v.replace(/\D/g, ""), 10); void onSpent(n > 0 ? n : null); }}>
            <label className="min-w-0 flex-1"><span className="mb-1.5 block text-body-sm">Сколько вы потратили</span>
              <input className="input" inputMode="numeric" value={v} placeholder="0" onChange={(e) => setV(e.target.value.replace(/[^\d ]/g, "").slice(0, 9))} /></label>
            <button className="btn-outline h-12" disabled={busy}>{busy ? "…" : "Сохранить"}</button>
          </form>
        )}
        <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-line pt-3">
          <span className="flex items-center gap-1.5 text-body-sm"><Wallet size={16} className="text-ink-soft" aria-hidden />Всего потрачено</span>
          <b className="text-body tabular-nums">{rub(st.total)}</b>
        </div>
        {st.total > 0 && <p className="mt-1 text-caption text-ink-soft">Делим на {st.people} {plural(st.people, "человека", "человека", "человек")} — по {rub(st.share)} с человека{p.guests.some((g) => g.plus > 0) ? " (кто пришёл не один — за себя и своих)" : ""}.</p>}
        {st.transfers.length > 0 && (
          <div className="mt-3 grid gap-1.5">
            {st.transfers.map((t, i) => (
              <p key={i} className={cx("flex items-center justify-between gap-2 rounded-input px-3 py-2 text-body-sm", t.from === p.me || t.to === p.me ? "bg-brand-soft" : "bg-sunken")}>
                <span>{guestName(p, t.from)} → {guestName(p, t.to)}</span><b className="tabular-nums">{rub(t.sum)}</b>
              </p>
            ))}
          </div>
        )}
        {st.total > 0 && !st.transfers.length && <p className="mt-2 text-body-sm text-herb">Все в расчёте.</p>}
        {st.outside > 0 && <p className="mt-2 text-caption text-ink-soft">Ещё {rub(st.outside)} — с тех, кого нет в списке.</p>}
      </div>
    </>
  );
}

function EditSheet({ open, p, onClose, onAct, onDeleted, token, admin }: {
  open: boolean; p: Party; onClose: () => void; onAct: (b: Record<string, unknown>, what?: string) => Promise<boolean>; onDeleted: () => void; token: string; admin: string;
}) {
  const { toast } = useStore();
  const [title, setTitle] = useState(p.title);
  const [date, setDate] = useState(p.date);
  const [time, setTime] = useState(p.time);
  const [place, setPlace] = useState(p.place);
  const [note, setNote] = useState(p.note);
  const [expenses, setExpenses] = useState(p.expenses);
  const [split, setSplit] = useState<number | null>(p.split);
  const [sure, setSure] = useState(false);
  useEffect(() => { if (open) { setTitle(p.title); setDate(p.date); setTime(p.time); setPlace(p.place); setNote(p.note); setExpenses(p.expenses); setSplit(p.split); setSure(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const people = Math.max(1, headcount(p));
  const save = async () => { if (await onAct({ act: "edit", patch: { title, date, time, place, note, expenses, split } }, "edit")) onClose(); };
  const remove = () => partyCall<{ deleted: boolean }>("party.act", { token, guest: guestSecret(), admin, act: "delete" }).then(onDeleted).catch((e: Error) => toast(e.message));
  return (
    <Sheet open={open} title="Изменить стол" onClose={onClose} tall footer={<button className="btn-primary w-full" onClick={save}>Сохранить</button>}>
      <label className="block"><span className="label mb-1.5 block">Название</span><input className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="mt-3 grid grid-cols-[1fr_7.5rem] gap-2">
        <label><span className="label mb-1.5 block">День</span><input className="input" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        <label><span className="label mb-1.5 block">Время</span><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      <label className="mt-3 block"><span className="label mb-1.5 block">Где</span><input className="input" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} /></label>
      <label className="mt-3 block"><span className="label mb-1.5 block">Записка гостям</span><textarea className="input" rows={2} value={note} maxLength={300} placeholder="Например, код домофона 25" onChange={(e) => setNote(e.target.value)} /></label>
      <div className="mt-3"><Toggle on={expenses} onChange={setExpenses} label="Посчитать расходы" hint="Каждый впишет, сколько потратил" /></div>
      {expenses && (
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-body-sm">Делим на<span className="block text-caption text-ink-soft">{split == null ? "всех, кто придёт" : <button className="text-brand" onClick={() => setSplit(null)}>вернуть: всех, кто придёт ({people})</button>}</span></span>
          <Stepper value={split ?? people} min={1} max={100} onChange={setSplit} label="На сколько человек делить" />
        </div>
      )}
      {p.guests.filter((g) => g.key !== p.host && g.name).length > 0 && <>
        <p className="label mb-2 mt-4">Гости</p>
        <div className="grid gap-1">
          {p.guests.filter((g) => g.key !== p.host && g.name).map((g) => (
            <div key={g.key} className="flex min-h-[44px] items-center justify-between gap-2 text-body-sm">
              <span>{g.name}{g.plus ? " +" + g.plus : ""}</span>
              <button className="btn-ghost h-10 px-3 text-small" onClick={() => void onAct({ act: "kick", who: g.key }, "kick")}>Убрать</button>
            </div>
          ))}
        </div>
      </>}
      <div className="mt-5 border-t border-line pt-4">
        {sure
          ? <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setSure(false)}>Отмена</button><button className="btn-danger flex-1" onClick={remove}><Trash2 size={16} aria-hidden />Удалить</button></div>
          : <button className="btn-ghost w-full text-warn" onClick={() => setSure(true)}><Trash2 size={16} aria-hidden />Удалить стол</button>}
        {sure && <p className="mt-2 text-center text-caption text-ink-soft">Ссылка перестанет работать у всех гостей.</p>}
      </div>
    </Sheet>
  );
}
