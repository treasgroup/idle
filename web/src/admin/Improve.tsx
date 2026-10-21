// «Доработка»: the catalog improved with the owner's AI, a batch at a time. The tab writes the task (copy → paste
// into the chat with the AI), checks the answer, shows what will change, and saves it into the catalog files on the
// hosting (admin.recipes.patch, with a backup). Two jobs: long steps split into short ones; product swaps.
import { useEffect, useMemo, useState } from "react";
import { get, post } from "./api";
import { BTN, BTN_OUTLINE, BTN_SM } from "./ui";

interface RawLine { id: string; name: string; amount: number; unit: string; optional?: boolean; swap?: string[] }
interface RawStep { text: string; timerSeconds?: number; uses?: string[] }
interface RawRecipe { id: string; title: string; mainIngredient?: string; ingredients: RawLine[]; steps: RawStep[] }
interface CatalogAnswer { files: { name: string; data?: { recipes?: RawRecipe[]; ingredients?: { id: string; name: string }[] } }[]; hidden: string[] }

const STEP_BATCH = 6, SWAP_BATCH = 30;
const BASIC = new Set(["salt", "water", "sugar", "black-pepper"]);

/** The JSON in an AI answer: code fences and words around it are dropped. */
function parseAnswer(text: string): Record<string, unknown> {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e <= s) throw new Error("В ответе нет JSON. Скопируйте ответ нейросети целиком.");
  try { return JSON.parse(text.slice(s, e + 1)); } catch { throw new Error("JSON в ответе с ошибкой. Попросите нейросеть: «Пришли только JSON, без пояснений»."); }
}

function stepsTask(list: RawRecipe[]): string {
  return [
    "Ты редактор кулинарных рецептов для сайта, по которому готовят с телефона, в том числе пожилые люди. Перепиши шаги рецептов ниже так, чтобы каждый шаг был коротким и понятным.",
    "",
    "Правила:",
    "1. Один шаг — одно-два действия, не длиннее 250 знаков. Длинный шаг раздели на 2–3 шага.",
    "2. Ничего не теряй: продукты, количества, время, огонь, признаки готовности должны остаться.",
    "3. Простые слова. Без кухонного термометра и «°C в центре» — пиши, что видно: «сок прозрачный», «без розового», «золотистая корочка». Температуру духовки оставь.",
    "4. Доли продуктов — только «половину», «треть», «четверть», «оставшееся». Не пиши «две пятых», «одну седьмую».",
    "5. Время цифрами: «варите 20 минут». Если на шаге есть ожидание, добавь timerSeconds — секунды основного ожидания этого шага.",
    "6. uses — id продуктов из «Состава», которые на этом шаге кладут, режут или добавляют. Каждый продукт должен встретиться хотя бы в одном шаге.",
    "7. Не добавляй новых продуктов и действий, не меняй число порций. Всего шагов — не больше 25.",
    "",
    "Ответ — только JSON, без пояснений:",
    '{"id-рецепта": [{"text": "…", "timerSeconds": 600, "uses": ["id-продукта"]}, …], …}',
    "",
    "Рецепты:",
    ...list.flatMap((r) => [
      "", "### " + r.id, "Название: " + r.title,
      "Состав: " + r.ingredients.map((i) => i.id + " — " + i.name + ", " + i.amount + " " + i.unit).join("; "),
      "Шаги:", ...r.steps.map((s, n) => (n + 1) + ". " + s.text + (s.timerSeconds ? " [таймер " + Math.round(s.timerSeconds / 60) + " мин]" : "") + (s.uses?.length ? " {uses: " + s.uses.join(", ") + "}" : "")),
    ]),
  ].join("\n");
}

function swapsTask(list: RawRecipe[], products: { id: string; name: string }[]): string {
  return [
    "Для каждого рецепта ниже подбери, чем можно заменить продукты, если их нет дома. Блюдо после замены должно получиться похожим.",
    "",
    "Правила:",
    "1. Замены — только из «Списка продуктов» в конце, по id.",
    "2. В рецепте не больше 4 продуктов с заменами, у каждого 1–3 замены, первая — лучшая.",
    "3. Главный продукт (отмечен *) не заменяй. Соль, воду, сахар и чёрный перец не заменяй.",
    "4. Не предлагай замен, которые меняют блюдо: мясо на рыбу, муку на крахмал в тесте и т. п. Хорошие замены: сметана → греческий йогурт, сливочное масло → растительное, петрушка → укроп.",
    "5. Если заменить нечего — пустой объект {}.",
    "",
    "Ответ — только JSON, без пояснений:",
    '{"id-рецепта": {"id-продукта": ["id-замены", …]}, …}',
    "",
    "Рецепты:",
    ...list.flatMap((r) => ["", "### " + r.id + " — " + r.title, "Состав: " + r.ingredients.filter((i) => !BASIC.has(i.id)).map((i) => i.id + (i.id === r.mainIngredient ? "*" : "") + " — " + i.name).join("; ")]),
    "",
    "Список продуктов (id — название):",
    products.map((p) => p.id + " — " + p.name).join("; "),
  ].join("\n");
}

export function Improve() {
  const [cat, setCat] = useState<CatalogAnswer | null>(null);
  const [problem, setProblem] = useState("");
  const load = () => get<CatalogAnswer>("catalog").then(setCat).catch((e: Error) => setProblem(e.message));
  useEffect(() => { void load(); }, []);

  const { all, products } = useMemo(() => {
    const hidden = new Set(cat?.hidden ?? []);
    const seen = new Set<string>();
    const all: RawRecipe[] = [], products: { id: string; name: string }[] = [];
    for (const f of cat?.files ?? []) {
      for (const r of f.data?.recipes ?? []) if (r?.id && !hidden.has(r.id) && !seen.has(r.id)) { seen.add(r.id); all.push(r); }
      for (const i of f.data?.ingredients ?? []) if (i?.id && !products.some((p) => p.id === i.id)) products.push({ id: i.id, name: i.name });
    }
    return { all, products };
  }, [cat]);

  return (
    <section>
      <div className="adm-toolbar">
        <div>
          <h1 className="adm-title">Доработка рецептов</h1>
          <p className="adm-muted">Нейросеть дописывает рецепты пачками: скопируйте задание, вставьте ответ, проверьте и сохраните. Перед сохранением файл каталога копируется в резерв.</p>
        </div>
      </div>
      {problem && <div className="adm-alert adm-bad">{problem}</div>}
      {!cat && !problem ? <p className="adm-muted">Загружаю каталог…</p> : cat && (
        <>
          <LongSteps all={all} onSaved={load} />
          <Swaps all={all} products={products} onSaved={load} />
        </>
      )}
    </section>
  );
}

function Batches({ count, size, at, setAt, task }: { count: number; size: number; at: number; setAt: (n: number) => void; task: () => string }) {
  const [copied, setCopied] = useState(false);
  const batches = Math.ceil(count / size);
  useEffect(() => setCopied(false), [at, count]);
  if (!count) return null;
  return (
    <div className="cx-row" style={{ marginTop: 14 }}>
      <button className={BTN_SM} disabled={at === 0} onClick={() => setAt(at - 1)}>‹</button>
      <span style={{ fontSize: 14 }}>Пачка {at + 1} из {batches} · рецепты {at * size + 1}–{Math.min(count, (at + 1) * size)}</span>
      <button className={BTN_SM} disabled={at >= batches - 1} onClick={() => setAt(at + 1)}>›</button>
      <button className={BTN} onClick={() => void navigator.clipboard.writeText(task()).then(() => setCopied(true))}>{copied ? "Скопировано ✓" : "Скопировать задание"}</button>
    </div>
  );
}

function LongSteps({ all, onSaved }: { all: RawRecipe[]; onSaved: () => Promise<void> }) {
  const [limit, setLimit] = useState(300);
  const [at, setAt] = useState(0);
  const [answer, setAnswer] = useState("");
  const [check, setCheck] = useState<{ ok: Record<string, RawStep[]>; rows: { r: RawRecipe; steps: RawStep[]; notes: string[] }[]; bad: string[] } | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const list = useMemo(() => all.filter((r) => r.steps.some((s) => s.text.length > limit)), [all, limit]);
  const batch = list.slice(at * STEP_BATCH, (at + 1) * STEP_BATCH);
  useEffect(() => { if (at * STEP_BATCH >= list.length) setAt(Math.max(0, Math.ceil(list.length / STEP_BATCH) - 1)); }, [list.length, at]);

  const verify = () => {
    setMsg({});
    try {
      const j = parseAnswer(answer);
      const ok: Record<string, RawStep[]> = {}; const rows: { r: RawRecipe; steps: RawStep[]; notes: string[] }[] = []; const bad: string[] = [];
      for (const [id, v] of Object.entries(j)) {
        const r = all.find((x) => x.id === id);
        if (!r) { bad.push(id + ": такого рецепта нет"); continue; }
        if (!Array.isArray(v) || v.length < 2 || v.length > 25) { bad.push(r.title + ": шагов должно быть от 2 до 25"); continue; }
        const ids = new Set(r.ingredients.map((i) => i.id));
        const steps = (v as RawStep[]).map((s) => ({ text: String(s?.text ?? "").trim(), ...(s?.timerSeconds ? { timerSeconds: Math.round(Number(s.timerSeconds)) } : {}), uses: (s?.uses ?? []).filter((u) => ids.has(u)) }));
        if (steps.some((s) => s.text.length < 5 || s.text.length > 700)) { bad.push(r.title + ": пустой или слишком длинный шаг"); continue; }
        const notes: string[] = [];
        const long = steps.filter((s) => s.text.length > 300).length;
        if (long) notes.push(long + " шаг(а) всё ещё длиннее 300 знаков");
        const used = new Set(steps.flatMap((s) => s.uses));
        const lost = r.ingredients.filter((i) => !used.has(i.id) && !i.optional).map((i) => i.name);
        if (lost.length) notes.push("не отмечены в шагах: " + lost.slice(0, 4).join(", "));
        if (steps.some((s) => /термометр|°\s?C\s*(в центре|внутри)/i.test(s.text))) notes.push("остался термометр или «°C в центре»");
        ok[id] = steps; rows.push({ r, steps, notes });
      }
      setCheck({ ok, rows, bad });
    } catch (e) { setCheck(null); setMsg({ err: (e as Error).message }); }
  };
  const save = async () => {
    if (!check) return;
    try {
      const res = await post<{ saved: number; problems: string[] }>("admin.recipes.patch", { recipes: Object.fromEntries(Object.entries(check.ok).map(([id, steps]) => [id, { steps }])) });
      setMsg({ ok: "Сохранено рецептов: " + res.saved + (res.problems.length ? ". Не сохранено: " + res.problems.join("; ") : "") });
      setAnswer(""); setCheck(null); await onSaved();
    } catch (e) { setMsg({ err: (e as Error).message }); }
  };

  return (
    <div className="adm-card">
      <div className="cx-head">
        <div>
          <h2 style={{ marginBottom: 2 }}>Длинные шаги</h2>
          <p className="adm-muted" style={{ margin: 0 }}>Шаг-«простыня» тяжело читать на телефоне. Нейросеть делит его на 2–3 коротких, ничего не теряя.</p>
        </div>
        <div className="cx-pills" style={{ margin: 0 }}>
          {[300, 250].map((n) => <button key={n} className={"cx-pill" + (limit === n ? " on" : "")} onClick={() => { setLimit(n); setAt(0); }}>длиннее {n} знаков</button>)}
        </div>
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 15 }}>{list.length ? <>Осталось <b>{list.length}</b> рецептов с длинными шагами — {Math.ceil(list.length / STEP_BATCH)} пачек по {STEP_BATCH}.</> : "Длинных шагов нет 🎉"}</p>
      <Batches count={list.length} size={STEP_BATCH} at={at} setAt={setAt} task={() => stepsTask(batch)} />
      {list.length > 0 && <Answer answer={answer} setAnswer={setAnswer} verify={verify} />}
      {check && (
        <div className="cx-section">
          {check.bad.map((b) => <p key={b} className="cx-err" style={{ margin: "0 0 6px" }}>✗ {b}</p>)}
          {check.rows.map(({ r, steps, notes }) => (
            <details key={r.id} style={{ marginBottom: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 15 }}><b>{r.title}</b> · было {r.steps.length} шагов → стало {steps.length}{notes.length ? <span className="cx-err"> · {notes.join("; ")}</span> : <span className="cx-saved"> ✓</span>}</summary>
              <ol style={{ margin: "8px 0 0", paddingLeft: 22, fontSize: 14, lineHeight: 1.5 }}>{steps.map((s, n) => <li key={n} style={{ marginBottom: 4 }}>{s.text}{s.timerSeconds ? <span className="adm-muted"> · таймер {Math.round(s.timerSeconds / 60)} мин</span> : null}</li>)}</ol>
            </details>
          ))}
          {check.rows.length > 0 && <button className={BTN} onClick={() => void save()}>Сохранить {check.rows.length} рецептов</button>}
        </div>
      )}
      {msg.ok && <p className="cx-saved" style={{ marginTop: 10 }}>✓ {msg.ok}</p>}
      {msg.err && <p className="cx-err" style={{ marginTop: 10 }}>{msg.err}</p>}
    </div>
  );
}

function Swaps({ all, products, onSaved }: { all: RawRecipe[]; products: { id: string; name: string }[]; onSaved: () => Promise<void> }) {
  const [at, setAt] = useState(0);
  const [answer, setAnswer] = useState("");
  const [check, setCheck] = useState<{ ok: Record<string, Record<string, string[]>>; rows: { r: RawRecipe; lines: string[] }[]; bad: string[] } | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const list = useMemo(() => all.filter((r) => !r.ingredients.some((i) => i.swap?.length)), [all]);
  const batch = list.slice(at * SWAP_BATCH, (at + 1) * SWAP_BATCH);
  const known = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  useEffect(() => { if (at * SWAP_BATCH >= list.length) setAt(Math.max(0, Math.ceil(list.length / SWAP_BATCH) - 1)); }, [list.length, at]);

  const verify = () => {
    setMsg({});
    try {
      const j = parseAnswer(answer);
      const ok: Record<string, Record<string, string[]>> = {}; const rows: { r: RawRecipe; lines: string[] }[] = []; const bad: string[] = [];
      for (const [id, v] of Object.entries(j)) {
        const r = all.find((x) => x.id === id);
        if (!r) { bad.push(id + ": такого рецепта нет"); continue; }
        const map: Record<string, string[]> = {}; const lines: string[] = [];
        for (const [pid, to] of Object.entries((v ?? {}) as Record<string, unknown>)) {
          const line = r.ingredients.find((i) => i.id === pid);
          if (!line || pid === r.mainIngredient || !Array.isArray(to)) continue;
          const good = to.map(String).filter((t) => t !== pid && known.has(t)).slice(0, 3);
          if (!good.length || Object.keys(map).length >= 4) continue;
          map[pid] = good; lines.push(line.name + " → " + good.map((t) => known.get(t)).join(" / "));
        }
        ok[id] = map; rows.push({ r, lines });
      }
      setCheck({ ok, rows, bad });
    } catch (e) { setCheck(null); setMsg({ err: (e as Error).message }); }
  };
  const save = async () => {
    if (!check) return;
    try {
      const res = await post<{ saved: number; problems: string[] }>("admin.recipes.patch", { recipes: Object.fromEntries(Object.entries(check.ok).filter(([, m]) => Object.keys(m).length).map(([id, swaps]) => [id, { swaps }])) });
      setMsg({ ok: "Сохранено рецептов: " + res.saved + (res.problems.length ? ". Не сохранено: " + res.problems.join("; ") : "") });
      setAnswer(""); setCheck(null); await onSaved();
    } catch (e) { setMsg({ err: (e as Error).message }); }
  };
  const withSwaps = check?.rows.filter((x) => x.lines.length).length ?? 0;

  return (
    <div className="adm-card">
      <h2 style={{ marginBottom: 2 }}>Замены продуктов</h2>
      <p className="adm-muted" style={{ margin: 0 }}>Чем заменить продукт, если его нет дома. Это видят люди в «Чего-то нет дома?» на странице рецепта и в ответах Шефа «чем заменить».</p>
      <p style={{ margin: "12px 0 0", fontSize: 15 }}>{list.length ? <>Без замен <b>{list.length}</b> рецептов — {Math.ceil(list.length / SWAP_BATCH)} пачек по {SWAP_BATCH}.</> : "У всех рецептов есть замены 🎉"}</p>
      <Batches count={list.length} size={SWAP_BATCH} at={at} setAt={setAt} task={() => swapsTask(batch, products)} />
      {list.length > 0 && <Answer answer={answer} setAnswer={setAnswer} verify={verify} />}
      {check && (
        <div className="cx-section">
          {check.bad.map((b) => <p key={b} className="cx-err" style={{ margin: "0 0 6px" }}>✗ {b}</p>)}
          <details>
            <summary style={{ cursor: "pointer", fontSize: 15 }}>Замены нашлись в <b>{withSwaps}</b> рецептах из {check.rows.length} — посмотреть</summary>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
              {check.rows.map(({ r, lines }) => <li key={r.id}><b>{r.title}</b>: {lines.length ? lines.join("; ") : <span className="adm-muted">нечего заменить</span>}</li>)}
            </ul>
          </details>
          {withSwaps > 0 && <button className={BTN} style={{ marginTop: 12 }} onClick={() => void save()}>Сохранить замены в {withSwaps} рецептах</button>}
        </div>
      )}
      {msg.ok && <p className="cx-saved" style={{ marginTop: 10 }}>✓ {msg.ok}</p>}
      {msg.err && <p className="cx-err" style={{ marginTop: 10 }}>{msg.err}</p>}
    </div>
  );
}

function Answer({ answer, setAnswer, verify }: { answer: string; setAnswer: (s: string) => void; verify: () => void }) {
  return (
    <div style={{ marginTop: 14 }}>
      <span className="cx-label">Ответ нейросети</span>
      <textarea className="cx-prompt" style={{ minHeight: 120, background: "#fffdf8" }} placeholder="Вставьте сюда ответ целиком" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <div className="cx-row"><button className={BTN_OUTLINE} disabled={!answer.trim()} onClick={verify}>Проверить</button></div>
    </div>
  );
}
