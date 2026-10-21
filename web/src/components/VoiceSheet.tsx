// Профиль → «Голос для чтения»: the speed and the voice that read the steps aloud, each voice with «Послушать».
// The list is the phone's own Russian voices (in the app) or the browser's (on the site) — free and offline.
import { useEffect, useState } from "react";
import { Check, Play } from "lucide-react";
import { useStore } from "../app/store";
import { say, voiceOptions, type VoiceOption } from "../app/voice";
import { Segmented, Sheet, cx } from "./ui";

const SAMPLE = "Обжарьте лук на среднем огне 3–4 мин., до мягкости. Затем добавьте 2 ст. л. сметаны.";
const SPEEDS = [{ id: "0.95", label: "Спокойно" }, { id: "1.1", label: "Обычно" }, { id: "1.3", label: "Быстрее" }] as const;

export function VoiceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile } = useStore();
  const [list, setList] = useState<VoiceOption[] | null>(null);
  useEffect(() => { if (open && !list) void voiceOptions().then(setList, () => setList([])); }, [open, list]);
  const rate = SPEEDS.reduce((a, b) => (Math.abs(Number(b.id) - profile.voiceRate) < Math.abs(Number(a.id) - profile.voiceRate) ? b : a)).id;
  const pick = (voice?: string) => { setProfile((p) => ({ ...p, voice })); say(SAMPLE, { voice, rate: profile.voiceRate }); };
  const options: (VoiceOption & { auto?: boolean })[] = [{ id: "", label: "Лучший на телефоне", note: "выбирается сам", auto: true }, ...(list ?? [])];
  return (
    <Sheet open={open} title="Голос для чтения шагов" onClose={() => { window.speechSynthesis?.cancel(); onClose(); }}>
      <p className="label mb-2">Скорость</p>
      <Segmented label="Скорость чтения" value={rate} options={SPEEDS.map((x) => ({ id: x.id, label: x.label }))}
        onChange={(v) => { setProfile((p) => ({ ...p, voiceRate: Number(v) })); say(SAMPLE, { voice: profile.voice, rate: Number(v) }); }} />
      <p className="label mb-2 mt-5">Голос</p>
      {list === null ? <p className="text-body-sm text-ink-soft">Ищу голоса телефона…</p> : (
        <ul className="grid gap-2">
          {options.map((v) => {
            const on = (profile.voice ?? "") === v.id;
            return (
              <li key={v.id || "auto"} className={cx("flex items-center gap-2 rounded-input border p-1.5 pl-3", on ? "border-brand bg-brand-soft" : "border-line bg-card")}>
                <button className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left" onClick={() => pick(v.id || undefined)} aria-pressed={on}>
                  <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", on ? "border-brand bg-brand text-white" : "border-line-strong")} aria-hidden>{on && <Check size={14} strokeWidth={3} />}</span>
                  <span className="min-w-0"><span className="block text-body-sm font-semibold">{v.label}</span><span className="block text-caption text-ink-soft">{v.note}</span></span>
                </button>
                <button className="icon-btn shrink-0" onClick={() => say(SAMPLE, { voice: v.id || undefined, rate: profile.voiceRate })} aria-label={"Послушать: " + v.label}><Play size={18} /></button>
              </li>
            );
          })}
        </ul>
      )}
      {list !== null && list.length === 0 && <p className="mt-3 text-small text-ink-soft">Других русских голосов на этом устройстве не нашлось. В Android их можно добавить: Настройки → Специальные возможности → Синтез речи → Google.</p>}
    </Sheet>
  );
}
