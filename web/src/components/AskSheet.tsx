// «Спросить Шефа» about one recipe: a short thread in a sheet. Answers come from the recipe itself and the
// kitchen notes on the device; anything else goes on to the general conversation with Шеф.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUp, MessageCircle, Search, Scale } from "lucide-react";
import {
  answerKitchenQuestion, answerRecipeQuestion, basics, clampServings, displayName, normalize, plural, scaleIngredient, shortName,
  type Preferences, type Recipe,
} from "../engine";
import { useAssistant } from "../app/assistant";
import { goChat } from "../app/chatNav";
import { homeAmount, mergeSame } from "../app/amounts";
import { ChefAvatar, Chip, Sheet } from "./ui";

export interface AskRequest { text: string; key: number }
interface Action { label: string; icon: ReactNode; run: () => void }
interface Msg { id: number; role: "user" | "chef"; text: string; action?: Action }

/** «сметана» → «сметану», «томатная паста» → «томатную пасту»: the object of «Чем заменить …?». */
export function accusative(phrase: string): string {
  const words = phrase.toLowerCase().split(" ");
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    if (/(ая|яя)$/.test(w)) { words[k] = w.replace(/ая$/, "ую").replace(/яя$/, "юю"); continue; }
    if (/(ый|ий|ой|ое|ее|ые|ие)$/.test(w)) continue;
    if (!/^(яйца|сливки|специи|семена)$/.test(w)) words[k] = w.replace(/([^аеёиоуыэюя])а$/, "$1у").replace(/([^аеёиоуыэюя])я$/, "$1ю");
    break;
  }
  return words.join(" ");
}

const ovenSteps = (r: Recipe) => r.steps.map((s, i) => (/духовк/i.test(s.text) ? i + 1 : 0)).filter(Boolean);
const servingsWord = (n: number) => plural(n, "порцию", "порции", "порций");

/** What can be swapped in this recipe: the first product with a known replacement (else the first one). */
function swapTarget(r: Recipe, prefs?: Preferences): string | null {
  const staples = basics(prefs);
  const list = r.ingredients.filter((i) => !staples.has(i.id) && !i.optional);
  const named = (id: string) => accusative(shortName(id));
  const known = list.find((i) => i.swap?.length) ?? list.find((i) => {
    const a = answerKitchenQuestion("Чем заменить " + named(i.id) + "?", true)?.text;
    const last = normalize(shortName(i.id)).split(" ").pop() ?? "";
    return !!a && last.length >= 3 && normalize(a).includes(last.slice(0, 4));
  });
  const pick = known ?? list[0];
  return pick ? named(pick.id) : null;
}

/** Ready questions for this recipe (the card on the page shows them too). */
export function askStarters(r: Recipe, servings: number, prefs?: Preferences): string[] {
  const swap = swapTarget(r, prefs);
  const more = servings + 2 <= r.maxServings ? servings + 2 : servings + 1 <= r.maxServings ? servings + 1 : servings - 1 >= r.minServings ? servings - 1 : 0;
  return [
    swap ? "Чем заменить " + swap + "?" : "",
    r.appliances.includes("oven") ? "Можно без духовки?" : "",
    more ? "На " + more + " " + servingsWord(more) + "?" : "",
    "Сколько хранится?",
  ].filter(Boolean);
}

export function AskSheet({ open, onClose, recipe, servings, prefs, onServings, request }: {
  open: boolean; onClose: () => void; recipe: Recipe; servings: number; prefs?: Preferences;
  /** «Показать на 6 порций» from an answer changes the page's servings. */
  onServings?: (n: number) => void;
  /** A question to ask as the sheet opens (a starter chip on the page). */
  request?: AskRequest | null;
}) {
  const a = useAssistant();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const last = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const starters = useMemo(() => askStarters(recipe, servings, prefs), [recipe, servings, prefs]);
  const asked = new Set(msgs.filter((m) => m.role === "user").map((m) => m.text));
  const left = starters.filter((q) => !asked.has(q));

  const toChat = (q: string): Action => ({
    label: "Спросить в общем чате", icon: <MessageCircle size={18} />,
    run: () => { a.opened(recipe.id, servings); void a.ask(q, { fresh: false }); goChat(); },
  });

  const answer = (q: string): Omit<Msg, "id" | "role"> => {
    // «На 6 порций?» — the list right here, and a button to switch the page to it.
    const want = q.match(/на\s+(\d{1,2})\s*(порц|человек|персон|гост|едок)/i);
    if (want) {
      const n = Number(want[1]);
      const fit = clampServings(recipe, n);
      if (n < 1) return { text: "Назовите число порций — например, «на 4 порции»." };
      if (fit !== n)
        return {
          text: "Этот рецепт рассчитан на " + recipe.minServings + "–" + recipe.maxServings + " " + plural(recipe.maxServings, "порцию", "порции", "порций") + ". "
            + (n > fit ? "На " + n + " удобнее приготовить его в две партии." : "Остатки можно убрать в холодильник."),
          action: onServings ? { label: "Показать на " + fit + " " + servingsWord(fit), icon: <Scale size={18} />, run: () => { onServings(fit); onClose(); } } : undefined,
        };
      const rows = mergeSame(recipe.ingredients.filter((i) => i.id !== "water").map((i) => scaleIngredient(i, recipe, n)));
      return {
        text: "На " + n + " " + servingsWord(n) + " понадобится:\n" + rows.map((i) => "• " + displayName(i.id, i.name) + " — " + homeAmount(i)).join("\n"),
        action: onServings && n !== servings ? { label: "Показать рецепт на " + n + " " + servingsWord(n), icon: <Scale size={18} />, run: () => { onServings(n); onClose(); } } : undefined,
      };
    }
    // «Можно без духовки?» — where the oven is needed, and a way to find a dish without it.
    if (/без\s+духовк/i.test(q)) {
      const at = ovenSteps(recipe);
      if (!recipe.appliances.includes("oven") && !at.length) return { text: "Да, духовка здесь не нужна." };
      const main = recipe.mainIngredient ? shortName(recipe.mainIngredient).toLowerCase() + " " : "";
      return {
        text: (at.length ? "Духовка нужна " + (at.length === 1 ? "на шаге " + at[0] : "на шагах " + at.slice(0, -1).join(", ") + " и " + at[at.length - 1]) + ". " : "В этом рецепте нужна духовка. ")
          + "Без неё блюдо получится другим — давайте подберу похожее без духовки.",
        action: { label: "Подобрать без духовки", icon: <Search size={18} />, run: () => { void a.ask(main + "без духовки", { fresh: true }); goChat(); } },
      };
    }
    const own = answerRecipeQuestion(q, [recipe], servings) ?? answerKitchenQuestion(q, true);
    if (own) return { text: own.text };
    return { text: "Точного ответа у меня здесь нет. В общем чате разберу вопрос подробнее и подберу варианты.", action: toChat(q) };
  };

  const ask = (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    setText("");
    setMsgs((m) => [...m, { id: ++seq.current, role: "user", text: q }]);
    setBusy(true);
    // A short pause, so the answer does not flash in before the question has settled.
    window.setTimeout(() => {
      setMsgs((m) => [...m, { id: ++seq.current, role: "chef", ...answer(q) }]);
      setBusy(false);
    }, 450);
  };

  // A starter chip on the page opens the sheet with its question already asked.
  const handled = useRef(0);
  useEffect(() => {
    if (!open || !request || request.key === handled.current) return;
    handled.current = request.key;
    ask(request.text);
  }, [open, request]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && !request && matchMedia("(pointer: fine)").matches) input.current?.focus({ preventScroll: true });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) last.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [msgs.length, busy, open]);

  const submit = (e: FormEvent) => { e.preventDefault(); ask(text); };

  return (
    <Sheet open={open} title="Вопрос Шефу" onClose={onClose} tall
      footer={
        <form onSubmit={submit} className="flex items-center gap-2">
          <input ref={input} className="input h-12 flex-1 rounded-full px-4" value={text} onChange={(e) => setText(e.target.value)} maxLength={300}
            placeholder="Спросите о рецепте…" aria-label="Вопрос о рецепте" enterKeyHint="send" autoComplete="off" />
          <button type="submit" disabled={!text.trim() || busy} aria-label="Отправить"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-fill text-white transition-opacity duration-150 disabled:opacity-40">
            <ArrowUp size={20} />
          </button>
        </form>
      }>
      <div className="space-y-5 pb-2 pt-1" aria-live="polite" aria-relevant="additions">
        <article className="flex gap-3" aria-label="Шеф">
          <ChefAvatar size={28} />
          <div className="min-w-0 flex-1">
            <p className="text-body">Спрашивайте про «{recipe.title}»: чем заменить продукт, сколько чего на другое число порций, как хранить.</p>
            {!msgs.length && <Starters list={left} ask={ask} />}
          </div>
        </article>
        {msgs.map((m, i) => m.role === "user" ? (
          <article key={m.id} className="anim-rise flex justify-end" aria-label="Вы">
            <p className="max-w-[80%] whitespace-pre-line rounded-[20px] rounded-br-md bg-brand-soft px-4 py-2.5 text-body text-ink">{m.text}</p>
          </article>
        ) : (
          <article key={m.id} className="anim-rise flex gap-3" aria-label="Шеф">
            <ChefAvatar size={28} />
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-line text-body">{m.text}</p>
              {m.action && <button className="btn-soft mt-3" onClick={m.action.run}>{m.action.icon}{m.action.label}</button>}
              {i === msgs.length - 1 && !busy && <Starters list={left} ask={ask} />}
            </div>
          </article>
        ))}
        {busy && (
          <div className="flex items-center gap-3" role="status" aria-label="Шеф печатает">
            <ChefAvatar size={28} />
            <span className="typing rounded-full bg-card px-3 py-2 shadow-e1"><i /><i /><i /></span>
          </div>
        )}
        <div ref={last} />
      </div>
    </Sheet>
  );
}

function Starters({ list, ask }: { list: string[]; ask: (q: string) => void }) {
  if (!list.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {list.map((q) => <Chip key={q} onClick={() => ask(q)}>{q}</Chip>)}
    </div>
  );
}
