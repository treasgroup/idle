// «Семейный календарь»: birthdays and the family's own dates, by how soon they come. Three days before, the Home
// shelf and the reminder offer «Праздничный стол» for that day. Kept in the profile, on this device only.
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "../app/store";
import { AHEAD, KIND_ICON, MONTHS, byNext, dayMonth, daysUntil, turning, whenText, years, type DateKind, type FamilyDate } from "../app/familyCalendar";
import { Sheet, cx } from "./ui";

const KINDS: { id: DateKind; label: string; placeholder: string }[] = [
  { id: "birthday", label: "День рождения", placeholder: "Мама, сын Миша, Ольга…" },
  { id: "anniversary", label: "Годовщина", placeholder: "Наша годовщина свадьбы" },
  { id: "other", label: "Другое", placeholder: "Встреча выпускников" },
];

/** onReminders: opens the reminder settings — without a daily reminder the phone stays silent (the Home tile shows anyway). */
export function FamilyCalendarSheet({ open, onClose, onReminders }: { open: boolean; onClose: () => void; onReminders?: () => void }) {
  const { s, profile, setProfile } = useStore();
  const [edit, setEdit] = useState<FamilyDate | "new" | null>(null);
  const list = byNext(profile.familyDates);
  const save = (d: FamilyDate) => setProfile((p) => ({ ...p, familyDates: [...p.familyDates.filter((x) => x.id !== d.id), d] }));
  const remove = (id: string) => setProfile((p) => ({ ...p, familyDates: p.familyDates.filter((x) => x.id !== id) }));
  return (
    <Sheet open={open} title="Семейный календарь" onClose={onClose} tall>
      <p className="text-body-sm text-ink-soft">Дни рождения и праздники семьи. За {AHEAD} дня напомню и помогу собрать стол.</p>
      {list.length > 0 && (
        <ul className="card mt-4 divide-y divide-line overflow-hidden">
          {list.map((d) => {
            const n = daysUntil(d), age = d.kind === "birthday" || d.kind === "anniversary" ? turning(d) : null;
            return (
              <li key={d.id}>
                <button className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sunken/60" onClick={() => setEdit(d)}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-[20px]" aria-hidden>{KIND_ICON[d.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-semibold">{d.who}</span>
                    <span className="block text-caption text-ink-soft">
                      {n <= AHEAD && <span className="font-semibold text-brand-ink">{whenText(n)} · </span>}
                      {dayMonth(d)}{age != null && age > 0 ? " · " + years(age) : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button className={cx("btn-outline mt-4 w-full", !list.length && "mt-5")} onClick={() => setEdit("new")}><Plus size={18} />Добавить дату</button>
      {list.length > 0 && !s.reminders.daily && onReminders && (
        <button className="mt-3 w-full rounded-input bg-sunken px-3 py-2.5 text-left text-body-sm" onClick={onReminders}>
          Напоминания выключены — дата появится только на Главной. <span className="font-semibold text-brand-ink">Включить</span>
        </button>
      )}
      <p className="mt-3 text-caption text-ink-faint">Даты хранятся в вашем аккаунте и видны только вам.</p>
      {edit && <DateSheet date={edit === "new" ? undefined : edit} onClose={() => setEdit(null)}
        onSave={(d) => { save(d); setEdit(null); }}
        onRemove={edit !== "new" ? () => { remove(edit.id); setEdit(null); } : undefined} />}
    </Sheet>
  );
}

function DateSheet({ date, onClose, onSave, onRemove }: { date?: FamilyDate; onClose: () => void; onSave: (d: FamilyDate) => void; onRemove?: () => void }) {
  const [kind, setKind] = useState<DateKind>(date?.kind ?? "birthday");
  const [who, setWho] = useState(date?.who ?? "");
  const [day, setDay] = useState(date ? String(date.day) : "");
  const [month, setMonth] = useState(date?.month ?? new Date().getMonth() + 1);
  const [year, setYear] = useState(date?.year ? String(date.year) : "");
  const d = Number(day), y = Number(year);
  const last = new Date(2024, month, 0).getDate();
  const thisYear = new Date().getFullYear();
  const dayOk = Number.isInteger(d) && d >= 1 && d <= last;
  const yearOk = !year || (Number.isInteger(y) && y > 1900 && y <= thisYear);
  const ok = !!who.trim() && dayOk && yearOk;
  const kindInfo = KINDS.find((k) => k.id === kind)!;
  return (
    <Sheet open title={date ? date.who : "Новая дата"} onClose={onClose} tall
      footer={<div className="flex gap-2">
        {onRemove && <button className="btn-outline" onClick={onRemove}>Удалить</button>}
        <button className="btn-primary flex-1" disabled={!ok}
          onClick={() => onSave({ id: date?.id ?? Date.now().toString(36), kind, who: who.trim(), day: d, month, ...(year ? { year: y } : {}) })}>Сохранить</button>
      </div>}>
      <p className="label mb-2">Что за повод</p>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.id} aria-pressed={kind === k.id} className={cx("chip gap-1.5", kind === k.id && "border-brand bg-brand-soft font-semibold text-brand-ink")} onClick={() => setKind(k.id)}>
            <span aria-hidden>{KIND_ICON[k.id]}</span>{k.label}
          </button>
        ))}
      </div>
      <p className="label mb-2 mt-5">{kind === "birthday" ? "Чей" : "Название"}</p>
      <input className="input" placeholder={kindInfo.placeholder} aria-label={kind === "birthday" ? "Чей день рождения" : "Название"} value={who} maxLength={40}
        onChange={(e) => setWho(e.target.value)} autoFocus={!date} />
      <p className="label mb-2 mt-5">Дата</p>
      <div className="flex gap-2">
        <input className="input w-20 text-center" inputMode="numeric" placeholder="День" aria-label="День" value={day} maxLength={2}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))} />
        <select className="input min-w-0 flex-1" aria-label="Месяц" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <input className="input w-24 text-center" inputMode="numeric" placeholder="Год" aria-label="Год, можно не писать" value={year} maxLength={4}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} />
      </div>
      {day && !dayOk && <p className="mt-2 text-caption text-warn">В {MONTHS[month - 1].replace(/я$/, "е").replace(/а$/, "е")} {last} {last === 31 ? "день" : "дней"} — проверьте число.</p>}
      {year.length === 4 && !yearOk && <p className="mt-2 text-caption text-warn">Проверьте год.</p>}
      <p className="mt-2 text-caption text-ink-faint">Год можно не писать. Если указать — покажу, сколько исполнится.</p>
    </Sheet>
  );
}
