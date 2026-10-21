// The voice that reads the steps aloud: which voices this phone (or browser) has, and saying a text with the one
// chosen in Профиль at the chosen speed, cleaned for reading (app/speech). In the Android app the voices are the
// phone's speech engine (often 3–4 Russian ones by Google); on the site — the browser's.
import { loadProfile } from "./profile";
import { speechText } from "./speech";

export interface VoiceOption { id: string; label: string; note: string }

interface NativeVoice { id: string; quality: number; network: boolean; installed: boolean }
type Cook = { ttsVoices: () => Promise<{ ready: boolean; voices: NativeVoice[] }> };
const nativeCook = (): Cook | null => (window as unknown as { CookNative?: { Cook: Cook } }).CookNative?.Cook ?? null;

const browserVoices = (): Promise<SpeechSynthesisVoice[]> => new Promise((done) => {
  const synth = window.speechSynthesis;
  if (!synth) return done([]);
  const ru = () => synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ru"));
  if (ru().length) return done(ru());
  const on = () => { synth.removeEventListener("voiceschanged", on); done(ru()); };
  synth.addEventListener("voiceschanged", on);
  setTimeout(() => done(ru()), 1500);
});

/** Russian voices to choose from, best first. */
export async function voiceOptions(): Promise<VoiceOption[]> {
  const cook = nativeCook();
  if (cook) {
    let r = await cook.ttsVoices().catch(() => ({ ready: true, voices: [] as NativeVoice[] }));
    if (!r.ready) { await new Promise((x) => setTimeout(x, 900)); r = await cook.ttsVoices().catch(() => r); }
    // Google lists each voice twice (offline «-local» and online «-network») plus a «ru-RU-language» alias:
    // each voice once, the offline one when there is one (the kitchen has no Wi-Fi at times).
    const base = (id: string) => id.replace(/-(local|network)$/, "");
    const once = new Map<string, NativeVoice>();
    for (const v of r.voices.filter((x) => !/-language$/.test(x.id))) {
      const had = once.get(base(v.id));
      if (!had || (had.network && !v.network) || (!had.installed && v.installed)) once.set(base(v.id), v);
    }
    return [...once.values()]
      .sort((a, b) => Number(b.installed) - Number(a.installed) || Number(a.network) - Number(b.network) || b.quality - a.quality || a.id.localeCompare(b.id))
      .map((v, i) => ({
        id: v.id, label: "Голос " + (i + 1),
        note: [v.quality >= 400 ? "высокое качество" : "", v.network ? "нужен интернет" : "без интернета", v.installed ? "" : "скачается при выборе"].filter(Boolean).join(" · "),
      }));
  }
  return (await browserVoices()).map((v) => ({ id: v.voiceURI, label: v.name.replace(/^(Microsoft|Google)\s+/, ""), note: v.localService ? "без интернета" : "нужен интернет" }));
}

/** Says the text with the chosen voice and speed; `try` overrides them for «Послушать» in Профиль. */
export function say(text: string, test?: { voice?: string; rate?: number }): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const p = loadProfile();
    const voice = test ? test.voice : p.voice;
    const u = new SpeechSynthesisUtterance(speechText(text));
    u.lang = "ru-RU";
    u.rate = test?.rate ?? p.voiceRate;
    if (nativeCook()) {
      // The app's adapter (engine) passes the voice's id to the phone's speech engine.
      if (voice) (u as unknown as { voice: { voiceURI: string } }).voice = { voiceURI: voice };
    } else {
      const all = synth.getVoices();
      const v = (voice && all.find((x) => x.voiceURI === voice)) || all.find((x) => x.lang.toLowerCase().startsWith("ru"));
      if (v) u.voice = v;
    }
    synth.speak(u);
  } catch { /* no speech */ }
}
