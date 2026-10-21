// «Профиль»: who we cook for, what we don't eat, the kitchen, family and devices, reminders, theme, documents.
import { useState } from "react";
import {
  Users, Bell, Download, Shield, Trash2, ChevronRight, KeyRound, Link2, Utensils, Target, GraduationCap, Ban, Check, X, Smartphone, QrCode, CalendarDays, Refrigerator, ShoppingCart, BookOpenCheck, Type, UserRound, PartyPopper, BookHeart, Send, Mic, MessageSquareHeart, Sparkles, CloudSun,
} from "lucide-react";
import {
  LABELS, LEGAL_TITLES, ingredientOptions, plural, qrSvg, searchIngredients, shortName, siteBase, type LegalKey,
} from "../engine";
import { useStore } from "../app/store";
import { useReminders } from "../app/reminders";
import { GOALS, LEVELS } from "../app/profile";
import { openLayer, openRecipesView, routeHash } from "../app/router";
import { Chip, Section, Sheet, Stepper, Toggle, cx } from "../components/ui";
import { ShareOptions } from "../components/ShareOptions";
import { FamilyMembers } from "../components/FamilyMembers";
import { cue } from "../app/feedback";
import { FeastSheet } from "../components/Feast";
import { WriteUs } from "../components/WriteUs";
import { TasteSheet, useUnderstood } from "../components/TasteSheet";
import { WeatherSheet, degrees } from "../components/WeatherSheet";
import { usePlace, useWeather } from "../app/weather";
import { useMyMessages } from "../app/myMessages";

const ALLERGENS = ["dairy", "eggs", "gluten", "nuts", "fish", "seafood", "soy", "mushrooms", "legumes", "spicy", "meat", "poultry"];
const APPLIANCES = ["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"];

function Row({ icon, title, hint, onClick, dot }: { icon: JSX.Element; title: string; hint?: string; onClick: () => void; dot?: boolean }) {
  return (
    <button className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sunken/60" onClick={onClick}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden>{icon}{dot && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-brand" />}</span>
      <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold">{title}</span>{hint && <span className="block truncate text-caption text-ink-soft">{hint}</span>}</span>
      <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
    </button>
  );
}

export interface Pwa { installed: boolean; canInstall: boolean; ios: boolean; install: () => Promise<boolean> }

export function Profile({ pwa }: { pwa: Pwa }) {
  const { s, update, profile, setProfile, sync, toast, wipe, server } = useStore();
  const reminders = useReminders();
  const [sheet, setSheet] = useState<null | "goals" | "limits" | "kitchen" | "family" | "login" | "reminders" | "data" | "docs">(null);
  const [wiping, setWiping] = useState(false);
  const [feast, setFeast] = useState(false);
  const [writeUs, setWriteUs] = useState(false);
  const [tasteOpen, setTasteOpen] = useState(false);
  const understoodNow = useUnderstood();
  const [weatherOpen, setWeatherOpen] = useState(false);
  const place = usePlace(), weather = useWeather();
  const mine = useMyMessages();
  const prefs = s.preferences;
  const bookCount = new Set(s.book.map((b) => b.recipeId)).size;
  const nonzero = ([["Приготовлено", bookCount], ["Сохранено", s.favorites.length], ["Дома", s.fridge.length]] as const).filter(([, v]) => v > 0);
  const stats = nonzero.length >= 2 ? nonzero : [];
  const excludedHint = [prefs.vegetarian ? "без мяса и рыбы" : "", ...prefs.excluded.slice(0, 3).map((x) => (LABELS[x] ?? shortName(x)).toLowerCase())].filter(Boolean).join(", ");
  const close = () => setSheet(null);
  const size = profile.textSize !== "m" ? profile.textSize : s.largeText ? "l" : "m";

  return (
    <div className="pt-4 sm:pt-6 lg:max-w-[960px]">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink"><UserRound size={30} /></span>
        <div>
          <h1 className="text-h1">Профиль</h1>
          <p className="text-body-sm text-ink-soft">Готовлю на {profile.eaters} {plural(profile.eaters, "человека", "человека", "человек")} · без регистрации</p>
        </div>
      </div>

      {stats.length > 0 && (
        <div className={cx("mt-5 grid gap-2 text-center", stats.length === 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {stats.map(([l, v]) => <div key={l} className="card py-3"><div className="text-h2">{v}</div><div className="text-caption text-ink-soft">{l}</div></div>)}
        </div>
      )}

      {/* «Ещё»: the bigger tools that are not in the bottom bar. */}
      <div className="card mt-6 divide-y divide-line overflow-hidden">
        {!profile.simple && <Row icon={<CalendarDays size={18} />} title="План на неделю" hint="Ужины без повторов и список покупок" onClick={() => openLayer(routeHash({ tab: "menu" }))} />}
        <Row icon={<BookHeart size={18} />} title="Семейная книга" hint={s.myRecipes?.length ? "Рецептов: " + s.myRecipes.length : "Бабушкины и свои рецепты — и с фото тетради"} onClick={() => openRecipesView("mine")} />
        <Row icon={<PartyPopper size={18} />} title="Праздничный стол" hint="Гости, блюда, покупки и когда что начинать" onClick={() => setFeast(true)} />
        {!profile.simple && <Row icon={<Refrigerator size={18} />} title="Мои продукты" hint={s.fridge.length ? s.fridge.length + " " + plural(s.fridge.length, "продукт", "продукта", "продуктов") + " дома" : "Что есть дома — подскажу, что приготовить"} onClick={() => openLayer(routeHash({ tab: "pantry" }))} />}
        {profile.simple && <Row icon={<ShoppingCart size={18} />} title="Список покупок" hint={s.shopping.filter((i) => !i.checked).length ? "Купить: " + s.shopping.filter((i) => !i.checked).length : "Пока пуст"} onClick={() => openLayer(routeHash({ tab: "shopping" }))} />}
        <Row icon={<BookOpenCheck size={18} />} title="Я готовил(а)" hint={bookCount ? bookCount + " " + plural(bookCount, "блюдо", "блюда", "блюд") : "Здесь будет всё, что вы приготовили"} onClick={() => openRecipesView("book")} />
        <Row icon={<GraduationCap size={18} />} title="Школа готовки" hint={profile.lessonsDone.length ? "Пройдено уроков: " + profile.lessonsDone.length : "14 коротких уроков для начинающих"} onClick={() => openLayer(routeHash({ tab: "learn" }))} />
      </div>

      <div className="card mt-3 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden><Type size={18} /></span>
          <span className="min-w-0 flex-1 whitespace-nowrap text-body-sm font-semibold">Размер текста</span>
          <div role="radiogroup" aria-label="Размер текста" className="flex rounded-full bg-sunken p-1">
            {(["m", "l", "xl"] as const).map((k, i) => (
              <button key={k} role="radio" aria-checked={size === k} aria-label={["Обычный", "Крупный", "Очень крупный"][i]}
                onClick={() => { setProfile((p) => ({ ...p, textSize: k })); update((st) => ({ ...st, largeText: k !== "m" })); }}
                className={cx("grid h-10 w-10 place-items-center rounded-full min-[380px]:w-11", size === k ? "bg-card font-semibold shadow-e1" : "text-ink-soft")}
                style={{ fontSize: ["0.875rem", "1.0625rem", "1.3125rem"][i] }}>А</button>
            ))}
          </div>
        </div>
        <div className="border-t border-line px-4">
          <Toggle on={profile.simple} onChange={(v) => setProfile((p) => ({ ...p, simple: v }))} label="Простой режим" hint="Крупно и только главное: Главная, Шеф, Избранное" />
          <Toggle on={profile.sounds} onChange={(v) => { setProfile((p) => ({ ...p, sounds: v })); if (v) setTimeout(() => cue("listen"), 50); }} label="Звуки и вибрация" hint="Тихие сигналы при готовке и ответах Шефа. Таймер звенит всегда" />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
        <div>
          <Section title="Под вас">
            <div className="card divide-y divide-line overflow-hidden">
              <Row icon={<Target size={18} />} title="Для кого, цели и опыт"
                hint={profile.eaters + " " + plural(profile.eaters, "человек", "человека", "человек") + " · " + profile.goals.map((g) => GOALS.find((x) => x.id === g)?.label).join(", ") + " · " + LEVELS.find((l) => l.id === profile.level)?.label}
                onClick={() => setSheet("goals")} />
              <Row icon={<Sparkles size={18} />} title="Что я про вас понял"
                hint={understoodNow.likes.length ? "Чаще: " + understoodNow.likes.slice(0, 3).map((x) => x.label).join(", ") : "Пока присматриваюсь к вашим вкусам"}
                onClick={() => setTasteOpen(true)} />
              <Row icon={<CloudSun size={18} />} title="Погода за окном"
                hint={place ? place.name + (weather ? " · " + degrees(weather.t) : "") + " — учитываю при подборе" : "Выключено. В холод — супы, в жару — лёгкое"}
                onClick={() => setWeatherOpen(true)} />
              <Row icon={<Ban size={18} />} title="Ограничения" hint={excludedHint || "Ничего не исключено"} onClick={() => setSheet("limits")} />
              <Row icon={<Utensils size={18} />} title="Техника" hint={prefs.appliances.map((a) => (LABELS[a] ?? a).toLowerCase()).join(", ")} onClick={() => setSheet("kitchen")} />
            </div>
          </Section>

          <Section title="Семья и устройства">
            <div className="card divide-y divide-line overflow-hidden">
              <Row icon={<Users size={18} />} title="Семья" hint={sync.status.members > 1 ? "В семье: " + sync.status.members + " — общий план и покупки" : "Общий план и список покупок"} onClick={() => setSheet("family")} />
              {server.telegram && <a className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 hover:bg-sunken/60" href={"https://t.me/" + server.telegram} target="_blank" rel="noopener">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden><Send size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold">Шеф в Telegram</span><span className="block truncate text-caption text-ink-soft">Спросить, что приготовить, прямо в мессенджере</span></span>
                <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
              </a>}
              {server.alice && <div className="flex min-h-[64px] items-center gap-3 px-4 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink" aria-hidden><Mic size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold">Шеф в Алисе</span><span className="block text-caption text-ink-soft">Скажите: «Алиса, запусти навык {server.alice}»</span></span>
              </div>}
              <Row icon={<KeyRound size={18} />} title="Другое устройство" hint="Перенести рецепты на телефон или компьютер" onClick={() => setSheet("login")} />
            </div>
          </Section>
        </div>

        <div>
          <Section title="Удобство">
            <div className="card overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <p className="mb-2 text-body-sm font-semibold">Тема</p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Тема">
                  {([["light", "Светлая"], ["dark", "Тёмная"], ["contrast", "Контрастная"], ["system", "Как в телефоне"]] as const).map(([id, label]) => (
                    <button key={id} role="radio" aria-checked={profile.theme === id} onClick={() => setProfile((p) => ({ ...p, theme: id }))}
                      className={cx("h-11 rounded-input border px-2 text-small", profile.theme === id ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card")}>{label}</button>
                  ))}
                </div>
                {profile.theme === "contrast" && <p className="mt-2 text-caption text-ink-soft">Чёрный текст на белом и чёткие рамки — легче читать при слабом зрении.</p>}
              </div>
              <div className="divide-y divide-line px-4">
                <Toggle on={s.readAloud} onChange={(v) => update((st) => ({ ...st, readAloud: v }))} label="Читать шаги вслух" hint="В режиме готовки" />
              </div>
              {reminders.supported && <div className="border-t border-line"><Row icon={<Bell size={18} />} title="Напоминания" hint={s.reminders.daily ? "Каждый день в " + s.reminders.daily : "Выключены"} onClick={() => setSheet("reminders")} /></div>}
              {!pwa.installed && (pwa.canInstall || pwa.ios) && (
                <div className="border-t border-line">
                  <Row icon={<Download size={18} />} title="Установить приложение" hint={pwa.ios ? "Safari → «Поделиться» → «На экран Домой»" : "Значок на экране, работает без интернета"}
                    onClick={() => { if (pwa.canInstall) void pwa.install(); else toast("В Safari нажмите «Поделиться», затем «На экран Домой»"); }} />
                </div>
              )}
            </div>
          </Section>

          <div className="card mt-8 divide-y divide-line overflow-hidden">
            <Row icon={<MessageSquareHeart size={18} />} title="Написать нам" hint={mine.unread ? "Пришёл ответ на ваше сообщение" : "Что улучшить или что мешает"} dot={mine.unread > 0} onClick={() => setWriteUs(true)} />
            <Row icon={<Shield size={18} />} title="Документы и мои данные" hint="Политика, правила, удаление данных" onClick={() => setSheet("docs")} />
          </div>
        </div>
      </div>

      <Sheet open={sheet === "goals"} title="Для кого, цели и опыт" onClose={close}>
        <div className="flex items-center justify-between gap-3"><span className="text-body-sm">Сколько человек едят</span><Stepper value={profile.eaters} min={1} max={12} onChange={(n) => { setProfile((p) => ({ ...p, eaters: n })); update((st) => ({ ...st, conditions: { ...st.conditions, servings: n } })); }} label="Едоков" /></div>
        <Toggle on={profile.kids} onChange={(v) => setProfile((p) => ({ ...p, kids: v }))} label="Есть дети" hint="Чаще покажу блюда, которые нравятся детям" />
        <p className="label mb-2 mt-5">Что важно</p>
        <div className="grid gap-2">
          {GOALS.map((g) => {
            const on = profile.goals.includes(g.id);
            return (
              <button key={g.id} aria-pressed={on} className={cx("flex min-h-[56px] items-center gap-3 rounded-input border px-3.5 py-2 text-left", on ? "border-brand bg-brand-soft" : "border-line bg-card")}
                onClick={() => setProfile((p) => { const goals = on ? p.goals.filter((x) => x !== g.id) : [...p.goals.filter((x) => x !== "tasty"), g.id]; return { ...p, goals: goals.length ? goals : ["tasty"] }; })}>
                <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", on ? "border-brand bg-brand-fill text-white" : "border-line-strong")}>{on && <Check size={14} strokeWidth={3} />}</span>
                <span><span className="block text-body-sm font-semibold">{g.label}</span><span className="block text-caption text-ink-soft">{g.hint}</span></span>
              </button>
            );
          })}
        </div>
        <p className="label mb-2 mt-5">Опыт</p>
        <div className="flex flex-wrap gap-2">{LEVELS.map((l) => <Chip key={l.id} on={profile.level === l.id} onClick={() => setProfile((p) => ({ ...p, level: l.id }))}>{l.label}</Chip>)}</div>
      </Sheet>

      <Sheet open={sheet === "limits"} title="Ограничения" onClose={close}>
        <Toggle on={prefs.vegetarian} onChange={(v) => update((st) => ({ ...st, preferences: { ...st.preferences, vegetarian: v } }))} label="Без мяса и рыбы" />
        <p className="label mb-2 mt-4">Не едим</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => {
            const on = prefs.excluded.includes(a);
            return (
              <button key={a} aria-pressed={on} className={cx("chip gap-1.5", on && "border-warn bg-warn-soft text-ink line-through decoration-warn")}
                onClick={() => update((st) => ({ ...st, preferences: { ...st.preferences, excluded: on ? st.preferences.excluded.filter((x) => x !== a) : [...st.preferences.excluded, a] } }))}>
                {on && <X size={14} className="text-warn" aria-hidden />}{LABELS[a] ?? a}
              </button>
            );
          })}
        </div>
        <ExcludeProduct />
        <FamilyMembers />
      </Sheet>

      <FeastSheet open={feast} onClose={() => setFeast(false)} />
      <WriteUs open={writeUs} onClose={() => setWriteUs(false)} />
      <TasteSheet open={tasteOpen} onClose={() => setTasteOpen(false)} />
      <WeatherSheet open={weatherOpen} onClose={() => setWeatherOpen(false)} />
      <Sheet open={sheet === "docs"} title="Документы и мои данные" onClose={close}>
        <div className="grid gap-1">
          {(Object.keys(LEGAL_TITLES) as LegalKey[]).map((k) => (
            <button key={k} className="flex min-h-[48px] items-center gap-2 rounded-input px-1 text-left text-body-sm hover:bg-sunken" onClick={() => { close(); openLayer(routeHash({ doc: k })); }}>
              <Shield size={18} className="shrink-0 text-ink-soft" aria-hidden /><span className="flex-1">{LEGAL_TITLES[k]}</span><ChevronRight size={18} className="text-ink-faint" aria-hidden />
            </button>
          ))}
        </div>
        <button className="btn-outline mt-5 w-full border-brand text-brand" onClick={() => setSheet("data")}><Trash2 size={18} />Удалить все мои данные</button>
        <p className="mt-2 text-center text-caption text-ink-faint">С этого устройства и с сервера</p>
      </Sheet>

      <Sheet open={sheet === "kitchen"} title="Техника" onClose={close}>
        <p className="text-body-sm text-ink-soft">Рецепты, для которых нужна техника, которой у вас нет, Шеф не предложит.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {APPLIANCES.map((a) => {
            const on = prefs.appliances.includes(a);
            return (
              <button key={a} aria-pressed={on} className={cx("chip gap-1.5", on && "border-herb bg-herb-soft text-ink")}
                onClick={() => update((st) => { const next = on ? st.preferences.appliances.filter((x) => x !== a) : [...st.preferences.appliances, a]; return next.length ? { ...st, preferences: { ...st.preferences, appliances: next } } : st; })}>
                {on && <Check size={14} className="text-herb" aria-hidden />}{LABELS[a] ?? a}
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={sheet === "family"} title="Семья" onClose={close}><Family /></Sheet>
      <Sheet open={sheet === "login"} title="Другое устройство" onClose={close}><Login /></Sheet>
      <Sheet open={sheet === "reminders"} title="Напоминания" onClose={close}><Reminders /></Sheet>
      <Sheet open={sheet === "data"} title="Удалить все данные?" onClose={close}
        footer={<div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={close}>Отмена</button>
          <button className="btn-outline flex-1 border-brand text-brand" disabled={wiping} onClick={async () => {
            setWiping(true);
            await reminders.enable(null, false).catch(() => {});
            await wipe();
          }}>{wiping ? "Удаляю…" : "Удалить всё"}</button>
        </div>}>
        <p className="text-body-sm text-ink-soft">Удалятся сохранённые рецепты, «Я готовил(а)», заметки, продукты «Мои продукты», план на неделю, список покупок, ваши отзывы, напоминания и анонимный аккаунт на сервере. Отменить нельзя.</p>
      </Sheet>
    </div>
  );
}

function ExcludeProduct() {
  const { s, update } = useStore();
  const [q, setQ] = useState("");
  const ids = ingredientOptions().map((o) => o.id);
  const found = q.trim() ? searchIngredients(q, ids, 6) : [];
  const products = s.preferences.excluded.filter((x) => !ALLERGENS.includes(x));
  const set = (fn: (l: string[]) => string[]) => update((st) => ({ ...st, preferences: { ...st.preferences, excluded: fn(st.preferences.excluded) } }));
  return (
    <div className="mt-4">
      <p className="label mb-2">Не люблю</p>
      <input className="input" placeholder="Не люблю… например, кинза" aria-label="Исключить продукт" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-2">
        {found.map((id) => <Chip key={id} onClick={() => { set((l) => [...new Set([...l, id])]); setQ(""); }}>+ {shortName(id)}</Chip>)}
        {products.map((id) => (
          <button key={id} className="chip gap-1.5 border-warn bg-warn-soft line-through decoration-warn" onClick={() => set((l) => l.filter((x) => x !== id))} aria-label={"Вернуть: " + shortName(id)}>
            <X size={14} className="text-warn" aria-hidden />{shortName(id)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Family() {
  const { sync, toast } = useStore();
  const [link, setLink] = useState("");
  return (
    <div>
      <p className="text-body-sm text-ink-soft">План на неделю, список покупок и «Мои продукты» станут общими: изменения увидят все в семье. Без телефонов и почты — по ссылке-приглашению.</p>
      <p className="mt-2 text-body-sm">Сейчас в семье: <b>{sync.status.members}</b></p>
      {link ? (
        <div className="mt-4">
          <ShareOptions title="Приглашение в семью" text={"Присоединяйся к нашему плану на неделю и списку покупок: " + link} url={link} onDone={() => toast("Приглашение готово — ссылка действует 7 дней")} />
        </div>
      ) : (
        <button className="btn-primary mt-4 w-full" onClick={async () => { try { setLink(siteBase() + "#family=" + (await sync.invite())); } catch (e) { toast(e instanceof Error ? e.message : "Нет связи с сервером"); } }}><Link2 size={18} />Пригласить в семью</button>
      )}
      {sync.status.members > 1 && <button className="btn-ghost mt-2 w-full" onClick={() => sync.leave().then(() => toast("Вы вышли из семьи. Меню и покупки скопированы вам.")).catch((e: Error) => toast(e.message))}>Выйти из семьи</button>}
    </div>
  );
}

function Login() {
  const { sync, toast } = useStore();
  const [mode, setMode] = useState<null | "enter" | "show">(null);
  const [code, setCode] = useState("");
  const [mine, setMine] = useState("");
  const show = async () => { setMode("show"); try { setMine(await sync.code()); } catch (e) { toast(e instanceof Error ? e.message : "Нет связи"); } };
  if (!mode)
    return (
      <div className="grid gap-2">
        <p className="mb-2 text-body-sm text-ink-soft">Рецепты, план и покупки можно перенести на другой телефон или компьютер — без регистрации, по коду.</p>
        <button className="flex min-h-[64px] items-center gap-3 rounded-input border border-line bg-card px-4 text-left" onClick={() => setMode("enter")}>
          <Smartphone size={20} className="shrink-0 text-ink-soft" aria-hidden />
          <span><span className="block text-body-sm font-semibold">Это новое устройство</span><span className="block text-caption text-ink-soft">Ввести код с другого</span></span>
        </button>
        <button className="flex min-h-[64px] items-center gap-3 rounded-input border border-line bg-card px-4 text-left" onClick={show}>
          <QrCode size={20} className="shrink-0 text-ink-soft" aria-hidden />
          <span><span className="block text-body-sm font-semibold">Перенести на другое устройство</span><span className="block text-caption text-ink-soft">Показать код и QR</span></span>
        </button>
      </div>
    );
  if (mode === "show")
    return (
      <div className="text-center">
        {mine ? (
          <>
            <div className="mx-auto w-48 rounded-input bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg(siteBase() + "#login=" + mine, 180) }} />
            <div className="mt-3 text-h2 tabular-nums tracking-widest">{mine.replace(/(\d{4})(?=\d)/g, "$1 ")}</div>
            <p className="mt-1 text-caption text-ink-soft">Отсканируйте QR или введите код на новом устройстве. Новый код отменяет предыдущий.</p>
          </>
        ) : <p className="text-body-sm text-ink-soft">Получаю код…</p>}
        <button className="btn-ghost mt-3" onClick={() => setMode(null)}>Назад</button>
      </div>
    );
  return (
    <div>
      <p className="text-body-sm text-ink-soft">Откройте «Профиль → Другое устройство → Перенести» там, где уже есть ваши рецепты, и введите код. Сохранённое здесь не пропадёт — объединится.</p>
      <input className="input mt-3 text-center tabular-nums tracking-widest" inputMode="numeric" placeholder="0000 0000 0000 0000" aria-label="Код из 16 цифр" value={code} onChange={(e) => setCode(e.target.value)} />
      <button className="btn-primary mt-3 w-full" disabled={code.replace(/\D/g, "").length !== 16} onClick={() => sync.login(code.replace(/\D/g, "")).then(() => toast("Готово — данные объединены")).catch((e: Error) => toast(e.message))}>Войти</button>
      <button className="btn-ghost mt-2 w-full" onClick={() => setMode(null)}>Назад</button>
    </div>
  );
}

const HOURS = Array.from({ length: 48 }, (_, i) => String(Math.floor(i / 2)).padStart(2, "0") + ":" + (i % 2 ? "30" : "00")).filter((h) => h >= "06:00" && h <= "22:30");

function Reminders() {
  const { s, toast } = useStore();
  const r = useReminders();
  const [time, setTime] = useState(s.reminders.daily ?? "17:30");
  const [weekly, setWeekly] = useState(s.reminders.weekly);
  const apply = async (daily: string | null, w: boolean) => {
    try { await r.enable(daily, w); toast(daily || w ? "Напоминания включены" : "Напоминания выключены"); } catch (e) { toast(e instanceof Error ? e.message : "Не получилось"); }
  };
  return (
    <div>
      <p className="text-body-sm text-ink-soft">Раз в день — блюдо из вашего плана, продукты, которые пора использовать, или идея на ужин. По воскресеньям — составить план на неделю.</p>
      <label className="mt-4 flex items-center justify-between gap-3">
        <span className="text-body-sm">Каждый день в</span>
        <select className="input w-32" value={time} onChange={(e) => setTime(e.target.value)}>
          {(HOURS.includes(time) ? HOURS : [time, ...HOURS]).map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </label>
      <Toggle on={weekly} onChange={setWeekly} label="По воскресеньям — план на неделю" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={() => apply(time, weekly)}>Включить</button>
        <button className="btn-outline" onClick={() => apply(null, false)}>Выключить</button>
      </div>
      {r.on && <button className="btn-ghost mt-2 w-full" onClick={() => r.test().then(() => toast("Отправил пробное напоминание")).catch((e: Error) => toast(e.message))}>Проверить</button>}
    </div>
  );
}
