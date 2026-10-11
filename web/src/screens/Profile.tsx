import { useState } from "react";
import { Users, Bell, Download, Shield, Trash2, ChevronRight, KeyRound, Link2, Utensils, Target, GraduationCap, Ban } from "lucide-react";
import {
  LABELS, LEGAL_TITLES, clearState, copyText, ingredientOptions, qrSvg, searchIngredients, shortName, siteBase, type LegalKey,
} from "../engine";
import { useStore } from "../app/store";
import { useReminders } from "../app/reminders";
import { GOALS, LEVELS } from "../app/profile";
import { openLayer, replace, routeHash } from "../app/router";
import { Chip, Section, Sheet, Stepper, Toggle, cx } from "../components/ui";

const ALLERGENS = ["dairy", "eggs", "gluten", "nuts", "fish", "seafood", "soy", "mushrooms", "legumes", "spicy", "meat", "poultry"];
const APPLIANCES = ["pan", "pot", "oven", "blender", "multicooker", "airfryer", "microwave"];

function Row({ icon, title, hint, onClick }: { icon: JSX.Element; title: string; hint?: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={onClick}>
      <span className="text-brand">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[15px]">{title}</span>{hint && <span className="block truncate text-xs text-ink-faint">{hint}</span>}</span>
      <ChevronRight size={18} className="text-ink-faint" />
    </button>
  );
}

export interface Pwa { installed: boolean; canInstall: boolean; ios: boolean; install: () => Promise<boolean> }

export function Profile({ pwa }: { pwa: Pwa }) {
  const { s, update, profile, setProfile, sync, toast } = useStore();
  const reminders = useReminders();
  const [sheet, setSheet] = useState<null | "goals" | "limits" | "family" | "login" | "reminders" | "data">(null);
  const prefs = s.preferences;
  const bookCount = new Set(s.book.map((b) => b.recipeId)).size;

  return (
    <div className="pb-10">
      <div className="px-4 pt-4">
        <h1 className="text-[26px] font-semibold leading-tight">Профиль</h1>
        <p className="text-sm text-ink-soft">Без регистрации: всё хранится на этом устройстве{sync.status.state === "ok" || sync.status.members > 1 ? " и синхронизируется" : ""}.</p>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-3 gap-2 text-center">
        {[["Приготовлено", bookCount], ["Сохранено", s.favorites.length], ["Дома", s.fridge.length]].map(([l, v]) => (
          <div key={l} className="card py-3"><div className="text-2xl font-semibold">{v}</div><div className="text-xs text-ink-faint">{l}</div></div>
        ))}
      </div>

      <Section title="Под вас">
        <div className="card mx-4 divide-y divide-line/60">
          <Row icon={<Target size={20} />} title="Цели и опыт" hint={profile.goals.map((g) => GOALS.find((x) => x.id === g)?.label).join(", ") + " · " + LEVELS.find((l) => l.id === profile.level)?.label} onClick={() => setSheet("goals")} />
          <Row icon={<Ban size={20} />} title="Что не едим и техника" hint={(prefs.vegetarian ? "без мяса · " : "") + (prefs.excluded.length ? "исключено: " + prefs.excluded.length : "ничего не исключено")} onClick={() => setSheet("limits")} />
          <Row icon={<GraduationCap size={20} />} title="Школа готовки" hint={"Пройдено уроков: " + profile.lessonsDone.length} onClick={() => replace(routeHash({ tab: "learn" }))} />
        </div>
      </Section>

      <Section title="Семья и устройства">
        <div className="card mx-4 divide-y divide-line/60">
          <Row icon={<Users size={20} />} title="Семья" hint={sync.status.members > 1 ? "В семье: " + sync.status.members + " — общее меню и покупки" : "Общее меню и список покупок"} onClick={() => setSheet("family")} />
          <Row icon={<KeyRound size={20} />} title="Войти на другом устройстве" hint="Код из 16 цифр или QR" onClick={() => setSheet("login")} />
        </div>
      </Section>

      <Section title="Удобство">
        <div className="card mx-4 divide-y divide-line/60">
          {reminders.supported && <Row icon={<Bell size={20} />} title="Напоминания" hint={s.reminders.daily ? "Каждый день в " + s.reminders.daily : "Выключены"} onClick={() => setSheet("reminders")} />}
          <div className="px-4"><Toggle on={s.largeText} onChange={(v) => update((st) => ({ ...st, largeText: v }))} label="Крупный текст" /></div>
          <div className="px-4"><Toggle on={s.readAloud} onChange={(v) => update((st) => ({ ...st, readAloud: v }))} label="Читать шаги вслух" hint="В режиме готовки" /></div>
          {!pwa.installed && (pwa.canInstall || pwa.ios) && (
            <Row icon={<Download size={20} />} title="Установить приложение" hint={pwa.ios ? "Safari → «Поделиться» → «На экран Домой»" : "Работает без интернета"} onClick={() => { if (pwa.canInstall) void pwa.install(); else toast("В Safari нажмите «Поделиться», затем «На экран Домой»"); }} />
          )}
        </div>
      </Section>

      <Section title="Данные и документы">
        <div className="card mx-4 divide-y divide-line/60">
          {(Object.keys(LEGAL_TITLES) as LegalKey[]).map((k) => <Row key={k} icon={<Shield size={20} />} title={LEGAL_TITLES[k]} onClick={() => openLayer(routeHash({ doc: k }))} />)}
          <Row icon={<Trash2 size={20} />} title="Удалить все мои данные" hint="С этого устройства и с сервера" onClick={() => setSheet("data")} />
        </div>
      </Section>

      <Sheet open={sheet === "goals"} title="Цели и опыт" onClose={() => setSheet(null)}>
        <div className="label mb-2">Что важно</div>
        <div className="grid gap-2">
          {GOALS.map((g) => (
            <button key={g.id} className={cx("card flex items-center gap-3 px-3.5 py-2.5 text-left", profile.goals.includes(g.id) && "border-brand bg-brand-soft")}
              onClick={() => setProfile((p) => { const on = p.goals.includes(g.id); const goals = on ? p.goals.filter((x) => x !== g.id) : [...p.goals.filter((x) => x !== "tasty"), g.id]; return { ...p, goals: goals.length ? goals : ["tasty"] }; })}>
              <span className="text-xl">{g.emoji}</span><span><span className="block font-medium">{g.label}</span><span className="block text-xs text-ink-faint">{g.hint}</span></span>
            </button>
          ))}
        </div>
        {profile.goals.includes("budget") && (
          <label className="mt-4 flex items-center justify-between gap-3">
            <span><span className="block">Бюджет на продукты в неделю</span><span className="block text-xs text-ink-faint">Меню покажет, укладывается ли оно</span></span>
            <input type="number" inputMode="numeric" min={0} step={100} className="input w-32" placeholder="₽" value={profile.weeklyBudget || ""}
              onChange={(e) => setProfile((p) => ({ ...p, weeklyBudget: Math.max(0, Math.min(100000, Math.round(Number(e.target.value) || 0))) }))} />
          </label>
        )}
        <div className="label mb-2 mt-5">Опыт</div>
        <div className="flex flex-wrap gap-2">{LEVELS.map((l) => <Chip key={l.id} on={profile.level === l.id} onClick={() => setProfile((p) => ({ ...p, level: l.id }))}>{l.label}</Chip>)}</div>
        <div className="mt-5 flex items-center justify-between"><span>Сколько человек едят</span><Stepper value={profile.eaters} min={1} max={12} onChange={(n) => { setProfile((p) => ({ ...p, eaters: n })); update((st) => ({ ...st, conditions: { ...st.conditions, servings: n } })); }} label="Едоков" /></div>
        <div className="mt-2"><Toggle on={profile.kids} onChange={(v) => setProfile((p) => ({ ...p, kids: v }))} label="Есть дети" hint="Чаще покажу блюда, которые нравятся детям" /></div>
      </Sheet>

      <Sheet open={sheet === "limits"} title="Что не едим" onClose={() => setSheet(null)}>
        <Toggle on={prefs.vegetarian} onChange={(v) => update((st) => ({ ...st, preferences: { ...st.preferences, vegetarian: v } }))} label="Без мяса и рыбы" />
        <div className="label mb-2 mt-3">Исключить</div>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => <Chip key={a} on={prefs.excluded.includes(a)} onClick={() => update((st) => ({ ...st, preferences: { ...st.preferences, excluded: st.preferences.excluded.includes(a) ? st.preferences.excluded.filter((x) => x !== a) : [...st.preferences.excluded, a] } }))}>{LABELS[a] ?? a}</Chip>)}
        </div>
        <ExcludeProduct />
        <div className="label mb-2 mt-5 flex items-center gap-1.5"><Utensils size={13} /> Какая техника есть</div>
        <div className="flex flex-wrap gap-2">
          {APPLIANCES.map((a) => <Chip key={a} on={prefs.appliances.includes(a)} onClick={() => update((st) => { const has = st.preferences.appliances.includes(a); const next = has ? st.preferences.appliances.filter((x) => x !== a) : [...st.preferences.appliances, a]; return next.length ? { ...st, preferences: { ...st.preferences, appliances: next } } : st; })}>{LABELS[a] ?? a}</Chip>)}
        </div>
        <p className="mt-2 text-xs text-ink-faint">Рецепты, для которых нужна техника, которой у вас нет, я не предложу.</p>
      </Sheet>

      <Sheet open={sheet === "family"} title="Семья" onClose={() => setSheet(null)}><Family /></Sheet>
      <Sheet open={sheet === "login"} title="Другое устройство" onClose={() => setSheet(null)}><Login /></Sheet>
      <Sheet open={sheet === "reminders"} title="Напоминания" onClose={() => setSheet(null)}><Reminders /></Sheet>
      <Sheet open={sheet === "data"} title="Удалить данные" onClose={() => setSheet(null)}>
        <p className="text-sm text-ink-soft">Удалятся избранное, «Моя книга», заметки, продукты «Дома», меню, список покупок, ваши отзывы и анонимный аккаунт на сервере. Отменить нельзя.</p>
        <button className="btn-primary mt-4 w-full" onClick={async () => {
          try { await sync.remove(); } catch { /* offline: the device data is still removed */ }
          await clearState().catch(() => {});
          try { localStorage.clear(); } catch { /* ignore */ }
          location.href = location.pathname;
        }}>Удалить всё</button>
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
    <div className="mt-3">
      <input className="input" placeholder="Не люблю… например, кинза" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-2">
        {found.map((id) => <Chip key={id} onClick={() => { set((l) => [...new Set([...l, id])]); setQ(""); }}>+ {shortName(id)}</Chip>)}
        {products.map((id) => <Chip key={id} on onClick={() => set((l) => l.filter((x) => x !== id))}>{shortName(id)} ✕</Chip>)}
      </div>
    </div>
  );
}

function Family() {
  const { sync, toast } = useStore();
  const [link, setLink] = useState("");
  return (
    <div>
      <p className="text-sm text-ink-soft">Меню на неделю, список покупок и продукты «Дома» станут общими: изменения увидят все в семье. Без телефонов и почты — по ссылке-приглашению.</p>
      <p className="mt-2 text-sm">Сейчас в семье: <b>{sync.status.members}</b></p>
      {link ? (
        <div className="mt-3 space-y-2">
          <div className="break-all rounded-xl bg-card p-3 text-sm shadow-card">{link}</div>
          <button className="btn-primary w-full" onClick={async () => { await copyText(link); toast("Ссылка скопирована — отправьте её близким"); }}>Скопировать ссылку</button>
          <p className="text-xs text-ink-faint">Ссылка действует 7 дней.</p>
        </div>
      ) : (
        <button className="btn-primary mt-4 w-full" onClick={async () => { try { setLink(siteBase() + "#family=" + (await sync.invite())); } catch (e) { toast(e instanceof Error ? e.message : "Нет связи с сервером"); } }}><Link2 size={17} /> Пригласить в семью</button>
      )}
      {sync.status.members > 1 && <button className="btn-ghost mt-2 w-full" onClick={() => sync.leave().then(() => toast("Вы вышли из семьи. Меню и покупки скопированы вам.")).catch((e: Error) => toast(e.message))}>Выйти из семьи</button>}
    </div>
  );
}

function Login() {
  const { sync, toast } = useStore();
  const [code, setCode] = useState("");
  const [mine, setMine] = useState("");
  return (
    <div>
      <p className="text-sm text-ink-soft">Откройте код на телефоне, где уже есть ваши рецепты, и введите его здесь — или отсканируйте QR. Сохранённое на этом устройстве не пропадёт: оно объединится с аккаунтом.</p>
      {mine ? (
        <div className="mt-3 text-center">
          <div className="mx-auto w-48 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg(siteBase() + "#login=" + mine, 180) }} />
          <div className="mt-2 font-mono text-lg tracking-widest">{mine.replace(/(\d{4})(?=\d)/g, "$1 ")}</div>
          <p className="text-xs text-ink-faint">Новый код отменяет предыдущий.</p>
        </div>
      ) : (
        <button className="btn-outline mt-3 w-full" onClick={async () => { try { setMine(await sync.code()); } catch (e) { toast(e instanceof Error ? e.message : "Нет связи"); } }}>Показать мой код</button>
      )}
      <div className="label mb-2 mt-5">Ввести код с другого устройства</div>
      <input className="input font-mono tracking-widest" inputMode="numeric" placeholder="0000 0000 0000 0000" value={code} onChange={(e) => setCode(e.target.value)} />
      <button className="btn-primary mt-2 w-full" disabled={code.replace(/\D/g, "").length !== 16} onClick={() => sync.login(code.replace(/\D/g, "")).then(() => toast("Готово — данные объединены")).catch((e: Error) => toast(e.message))}>Войти</button>
    </div>
  );
}

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
      <p className="text-sm text-ink-soft">Раз в день — блюдо из вашего меню, продукты, которые пора использовать, или идея на ужин. По воскресеньям — составить меню на неделю.</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span>Каждый день в</span>
        <input type="time" className="input w-32" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="mt-2"><Toggle on={weekly} onChange={setWeekly} label="По воскресеньям — меню на неделю" /></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={() => apply(time, weekly)}>Включить</button>
        <button className="btn-outline" onClick={() => apply(null, false)}>Выключить</button>
      </div>
      {r.on && <button className="btn-ghost mt-2 w-full" onClick={() => r.test().then(() => toast("Отправил пробное напоминание")).catch((e: Error) => toast(e.message))}>Проверить</button>}
    </div>
  );
}
