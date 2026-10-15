// «Кто что не ест»: each person at the table with what they do not eat. Their products are left out of every
// suggestion, so a dinner suits everybody. Lives inside «Ограничения» and stays out of the way until used.
import { useState } from "react";
import { Plus, UserRound, X } from "lucide-react";
import { LABELS, ingredientOptions, searchIngredients, shortName } from "../engine";
import { useStore } from "../app/store";
import { withMembers, type Member } from "../app/profile";
import { Chip, Sheet, cx } from "./ui";

// The usual reasons, then the usual dislikes.
const COMMON = ["meat", "fish", "dairy", "eggs", "gluten", "nuts", "mushrooms", "spicy", "onion", "garlic"];
const label = (id: string) => LABELS[id] ?? shortName(id);

export function FamilyMembers() {
  const { profile, setProfile, update } = useStore();
  const [edit, setEdit] = useState<number | null>(null);
  const save = (next: Member[]) => {
    const before = profile.members;
    setProfile((p) => ({ ...p, members: next }));
    update((st) => ({ ...st, preferences: { ...st.preferences, excluded: withMembers(st.preferences.excluded, before, next) } }));
  };
  return (
    <div className="mt-6">
      <p className="label mb-2">Кто что не ест</p>
      {profile.members.length > 0 && (
        <ul className="mb-2 grid gap-1.5">
          {profile.members.map((m, i) => (
            <li key={i}>
              <button className="flex min-h-[56px] w-full items-center gap-3 rounded-input border border-line bg-card px-3 text-left hover:border-line-strong" onClick={() => setEdit(i)}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken" aria-hidden><UserRound size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium">{m.name}</span>
                  <span className="block truncate text-caption text-ink-soft">{m.excluded.length ? "не ест: " + m.excluded.map((x) => label(x).toLowerCase()).join(", ") : "ест всё"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-ghost h-11 px-2" onClick={() => setEdit(profile.members.length)}><Plus size={18} />Добавить человека</button>
      {edit !== null && (
        <MemberSheet member={profile.members[edit]} onClose={() => setEdit(null)}
          onSave={(m) => { const next = [...profile.members]; next[edit] = m; save(next); setEdit(null); }}
          onRemove={edit < profile.members.length ? () => { save(profile.members.filter((_, k) => k !== edit)); setEdit(null); } : undefined} />
      )}
    </div>
  );
}

function MemberSheet({ member, onClose, onSave, onRemove }: { member?: Member; onClose: () => void; onSave: (m: Member) => void; onRemove?: () => void }) {
  const [name, setName] = useState(member?.name ?? "");
  const [list, setList] = useState<string[]>(member?.excluded ?? []);
  const [q, setQ] = useState("");
  const found = q.trim() ? searchIngredients(q, ingredientOptions().map((o) => o.id), 6) : [];
  const toggle = (id: string) => setList((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const extra = list.filter((x) => !COMMON.includes(x));
  return (
    <Sheet open title={member ? member.name : "Новый человек"} onClose={onClose} tall
      footer={<div className="flex gap-2">
        {onRemove && <button className="btn-outline" onClick={onRemove}>Убрать</button>}
        <button className="btn-primary flex-1" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), excluded: list })}>Сохранить</button>
      </div>}>
      <input className="input" placeholder="Имя: Маша, папа, гость…" aria-label="Имя" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} autoFocus={!member} />
      <p className="label mb-2 mt-5">Не ест</p>
      <div className="flex flex-wrap gap-2">
        {[...COMMON, ...extra].map((id) => {
          const on = list.includes(id);
          return (
            <button key={id} aria-pressed={on} className={cx("chip gap-1.5", on && "border-warn bg-warn-soft line-through decoration-warn")} onClick={() => toggle(id)}>
              {on && <X size={14} className="text-warn" aria-hidden />}{label(id)}
            </button>
          );
        })}
      </div>
      <input className="input mt-4" placeholder="Другой продукт, например кинза" aria-label="Найти продукт" value={q} onChange={(e) => setQ(e.target.value)} />
      {found.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{found.map((id) => <Chip key={id} onClick={() => { toggle(id); setQ(""); }}>+ {shortName(id)}</Chip>)}</div>}
      <p className="mt-4 text-caption text-ink-faint">Блюда с этими продуктами Шеф не предложит — ни в подборках, ни в плане на неделю.</p>
    </Sheet>
  );
}
