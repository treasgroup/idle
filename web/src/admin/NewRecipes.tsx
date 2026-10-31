// «Новые рецепты»: the catalog grown with the owner's AI, 8 dishes per request. The tab writes the full spec for a batch
// (the site's format, plain language, what is already in the catalog, the products with their ids), checks the answer
// with the site's own engine (errors, duplicates, the theme's rules), and saves it as a new catalog file.
import { useEffect, useMemo, useState } from "react";
import { buildCatalog, nutritionOf, useCatalog } from "../engine";
import { get, post } from "./api";
import { THEMES_NEW, type Theme } from "./newBatches";
import { BTN, BTN_OUTLINE, BTN_SM } from "./ui";

interface RawFile { name: string; data?: { recipes?: { id: string; title: string }[]; ingredients?: { id: string; name: string }[] } }
interface CatalogAnswer { files: RawFile[] }

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[«»"()]/g, "").replace(/\s+/g, " ").trim();
/** A dish of the list is already there: the same name, or an existing title that starts with it. */
const inCatalog = (dish: string, titles: string[]) => { const d = norm(dish); return titles.some((t) => t === d || t.startsWith(d + " ") || d.startsWith(t + " ")); };

function spec(theme: Theme, dishes: string[], titles: string[], products: { id: string; name: string }[], batch: string): string {
  return [
    `Ты составляешь рецепты для сайта и приложения «Шефли». Ими пользуются люди всех возрастов, в том числе пожилые, и готовят прямо с телефона. Сделай ${dishes.length} рецептов для подборки «${theme.title}» — ровно эти блюда:`,
    ...dishes.map((d, i) => `${i + 1}. ${d}`),
    "",
    "Правила этой подборки:",
    ...theme.rules.map((r) => "— " + r),
    "",
    "Как писать (обязательно):",
    "1. Простой язык, короткие предложения. Шагов — как можно меньше: каждый шаг — законченный этап на 120–280 знаков (подготовить продукты, обжарить, тушить, подать). Отдельный шаг — только там, где своё ожидание с таймером. Шагов в пару слов («Посолите.») не делай. Обычно 5–8 шагов; сложному блюду из нескольких частей можно больше.",
    "2. Признаки готовности — то, что видно: «золотистая корочка», «сок прозрачный», «без розового внутри», «легко протыкается вилкой». Никаких кухонных термометров и «°C в центре». Температура — только у духовки, аэрогриля и масла для жарки.",
    "3. Доли продуктов в шагах — только «половину», «треть», «четверть», «оставшееся». Не пиши «две пятых», «одну седьмую».",
    "4. Время в тексте цифрами («варите 20 минут»), а на шаге с ожиданием — timerSeconds (в секундах).",
    "5. totalMinutes — всё время до подачи вместе с ожиданием (тесто, маринад, остывание). activeMinutes — сколько человек занят руками.",
    "6. Продукты — из обычного супермаркета. Количество — в граммах или миллилитрах на 4 порции (servings 4, minServings 1, maxServings 8). Штуки и зубчики можно, но тогда у продукта нужен gramsPerUnit.",
    "7. tips — 1–3 коротких практичных совета (как не испортить, чем заменить). Сколько хранится — не в советах, а в storageDays.",
    "8. У 2–4 продуктов укажи swap — чем заменить, если его нет дома (id из «Продуктов каталога»). Главный продукт не заменяй.",
    "9. Не повторяй блюда из «Уже есть в каталоге».",
    "10. Продукты бери из «Продуктов каталога» по их id. Если нужного нет — добавь его в ingredients файла.",
    "",
    "Ответ — только JSON, без пояснений и без сокращений, все рецепты целиком:",
    "{",
    `  "batch": "${batch}", "description": "${theme.title}",`,
    '  "ingredients": [ /* только новые продукты */ {"id": "latinica-cherez-defis", "name": "Название", "aliases": [], "groups": ["meat|poultry|chicken|fish|seafood|dairy|eggs|gluten|soy|nuts|mushrooms|legumes|spicy"], "per100g": {"kcal": 0, "protein": 0, "fat": 0, "carbs": 0}, "gramsPerUnit": {"шт.": 55}, "aisle": "veg|meat|fish|dairy|bread|grocery|canned|spices|frozen|other"} ],',
    '  "recipes": [ {',
    '    "schema": 2, "editorialStatus": "draft", "id": "latinica-cherez-defis", "title": "…", "summary": "1–2 предложения, до 300 знаков", "aliases": ["как ещё называют"],',
    '    "servings": 4, "minServings": 1, "maxServings": 8, "totalMinutes": 30, "activeMinutes": 20, "difficulty": "easy|medium|hard",',
    '    "ingredients": [{"id": "…", "name": "как написано в рецепте", "amount": 300, "unit": "г", "optional": false, "swap": ["id-замены"]}],',
    '    "appliances": ["pan|pot|oven|blender|multicooker|airfryer|microwave"], "tags": ["cozy|light|hearty|quick|comfort|fresh|spicy|sweet|vegetarian"],',
    '    "steps": [{"text": "…", "timerSeconds": 600, "uses": ["id продуктов этого шага"]}], "tips": ["…"], "storageDays": 2, "freezerDays": 30,',
    '    "cuisine": "russian|ukrainian|belarusian|caucasian|central-asian|tatar|international", "course": "soup|main|side|salad|breakfast|baking|dessert|snack|sauce|drink",',
    '    "meals": ["breakfast|lunch|dinner|snack"], "mainIngredient": "id главного продукта", "needsSide": false, "season": ["winter|spring|summer|autumn"],',
    '    "occasions": ["everyday|guests|holiday|new-year|easter|maslenitsa|picnic|kids-party|date"], "budget": "low|medium|high", "kids": false,',
    '    "yields": {"amount": 12, "unit": "шт."} /* только для того, что считают штуками */, "cookware": ["Сковорода 26 см", "Миска"], "look": "как выглядит готовое блюдо — для фото, до 240 знаков"',
    "  } ]",
    "}",
    "",
    "Уже есть в каталоге (не повторяй):",
    titles.join("; "),
    "",
    "Продукты каталога (id — название):",
    products.map((p) => p.id + " — " + p.name).join("; "),
  ].join("\n");
}

interface Checked { name: string; data: Record<string, unknown>; rows: { title: string; info: string; notes: string[] }[]; errors: string[]; accepted: number; total: number }

export function NewRecipes() {
  const [cat, setCat] = useState<CatalogAnswer | null>(null);
  const [problem, setProblem] = useState("");
  const [theme, setTheme] = useState(THEMES_NEW[0].key);
  const [part, setPart] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<Checked | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [copied, setCopied] = useState(false);
  const load = () => get<CatalogAnswer>("catalog").then(setCat).catch((e: Error) => setProblem(e.message));
  useEffect(() => { void load(); }, []);
  useEffect(() => { setCopied(false); setChecked(null); setMsg({}); }, [theme, part]);

  const { titles, products, next } = useMemo(() => {
    const files = cat?.files ?? [];
    const titles = files.flatMap((f) => f.data?.recipes ?? []).map((r) => norm(r.title));
    const products: { id: string; name: string }[] = [];
    for (const f of files) for (const i of f.data?.ingredients ?? []) if (!products.some((p) => p.id === i.id)) products.push({ id: i.id, name: i.name });
    const next = Math.max(0, ...files.map((f) => parseInt(f.name, 10) || 0)) + 1;
    return { titles, products, next };
  }, [cat]);
  const t = THEMES_NEW.find((x) => x.key === theme)!;
  const dishes = t.parts[part] ?? [];
  const batch = String(next).padStart(2, "0") + "-" + t.key + "-" + (part + 1);
  const done = (p: string[]) => p.filter((d) => inCatalog(d, titles)).length;

  const verify = () => {
    setMsg({}); setChecked(null);
    try {
      const s = answer.indexOf("{"), e = answer.lastIndexOf("}");
      if (s < 0 || e <= s) throw new Error("В ответе нет JSON. Скопируйте ответ нейросети целиком.");
      let data: Record<string, unknown>;
      try { data = JSON.parse(answer.slice(s, e + 1)); } catch { throw new Error("JSON с ошибкой — скорее всего ответ обрезан. Попросите нейросеть: «Продолжи с того места, где остановился» и вставьте всё вместе, или сделайте пачку меньше."); }
      if (!Array.isArray(data.recipes)) throw new Error("В ответе нет списка recipes.");
      const name = batch + ".json";
      data.batch = batch;
      const files = [...(cat?.files ?? []).map((f) => ({ name: f.name, data: f.data })), { name, data }];
      const built = buildCatalog(files);
      useCatalog(built);
      const mine = (x: { file: string }) => x.file === name;
      const errors = built.errors.filter(mine).map((x) => x.item + ": " + x.message);
      const warns = built.warnings.filter(mine);
      const raw = data.recipes as { id?: string; title?: string; totalMinutes?: number; appliances?: string[]; steps?: { text?: string }[] }[];
      const rows = raw.map((r) => {
        const got = built.recipes.find((x) => x.id === r.id);
        const notes: string[] = [];
        if (!got) notes.push("не принят сайтом — смотрите ошибки ниже");
        if (r.title && titles.includes(norm(r.title))) notes.push("такое название уже есть в каталоге");
        if (t.maxMinutes && (r.totalMinutes ?? 0) > t.maxMinutes) notes.push(`дольше ${t.maxMinutes} минут`);
        if (t.appliance && !(r.appliances ?? []).includes(t.appliance)) notes.push("не указана нужная техника");
        if ((r.steps ?? []).some((st) => (st.text ?? "").length > 300)) notes.push("есть шаги длиннее 300 знаков");
        const st = r.steps ?? [];
        if (st.length >= 8 && st.filter((x) => (x.text ?? "").length < 80).length / st.length >= 0.4) notes.push("шаги раздроблены на мелкие — попросите собрать в цельные этапы");
        if ((r.steps ?? []).some((st) => /термометр|°\s?C\s*(в центре|внутри)/i.test(st.text ?? ""))) notes.push("термометр в шагах");
        for (const w of warns) if (w.item === r.id || w.item === r.title) notes.push(w.message);
        const info = got ? got.totalMinutes + " мин · " + nutritionOf(got).perServing.kcal + " ккал · " + got.steps.length + " шагов" : "";
        return { title: r.title ?? r.id ?? "?", info, notes };
      });
      setChecked({ name, data, rows, errors, accepted: built.files.find((f) => f.name === name)?.recipes ?? 0, total: raw.length });
    } catch (err) { setMsg({ err: (err as Error).message }); }
  };
  const save = async () => {
    if (!checked) return;
    try {
      await post("admin.file.save", { name: checked.name, content: JSON.stringify(checked.data, null, 2) + "\n" });
      setMsg({ ok: "Сохранено: файл " + checked.name + ", рецептов на сайте — " + checked.accepted + ". Они появятся после обновления страницы сайта." });
      setAnswer(""); setChecked(null); await load();
    } catch (err) { setMsg({ err: (err as Error).message }); }
  };

  return (
    <section>
      <div className="adm-toolbar">
        <div>
          <h1 className="adm-title">Новые рецепты</h1>
          <p className="adm-muted">Чего не хватает в каталоге, пачками по 8 блюд. Скопируйте ТЗ, отправьте нейросети, вставьте ответ — сайт проверит рецепты своим движком и сохранит новым файлом каталога.</p>
        </div>
      </div>
      {problem && <div className="adm-alert adm-bad">{problem}</div>}
      {!cat && !problem ? <p className="adm-muted">Загружаю каталог…</p> : cat && (
        <div className="cx-cols">
          <div className="adm-card cx-list">
            {THEMES_NEW.map((x) => {
              const total = x.parts.flat().length, have = done(x.parts.flat());
              return (
                <button key={x.key} className={"cx-li" + (x.key === theme ? " on" : "")} onClick={() => { setTheme(x.key); setPart(0); }}>
                  <span style={{ flex: 1 }}>{x.title}</span><span className="cx-n">{have}/{total}</span>
                </button>
              );
            })}
          </div>
          <div className="adm-card">
            <h2 style={{ marginBottom: 2 }}>{t.title}</h2>
            <p className="adm-muted" style={{ margin: 0 }}>{t.why}</p>
            <div className="cx-pills" style={{ marginTop: 14 }}>
              {t.parts.map((p, i) => <button key={i} className={"cx-pill" + (i === part ? " on" : "")} onClick={() => setPart(i)}>Пачка {i + 1}{done(p) === p.length ? " ✓" : ""}</button>)}
            </div>
            <ol style={{ margin: "4px 0 0", paddingLeft: 22, fontSize: 15, lineHeight: 1.7 }}>
              {dishes.map((d) => <li key={d}>{d}{inCatalog(d, titles) && <span className="cx-saved"> · уже в каталоге</span>}</li>)}
            </ol>
            <div className="cx-row" style={{ marginTop: 14 }}>
              <button className={BTN} onClick={() => void navigator.clipboard.writeText(spec(t, dishes.filter((d) => !inCatalog(d, titles)), [...new Set(titles)], products, batch)).then(() => setCopied(true))}>{copied ? "ТЗ скопировано ✓" : "Скопировать ТЗ"}</button>
              <span className="adm-muted">Блюда, которые уже в каталоге, в ТЗ не попадут.</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <span className="cx-label">Ответ нейросети</span>
              <textarea className="cx-prompt" style={{ minHeight: 140, background: "#fffdf8" }} placeholder="Вставьте сюда ответ целиком" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <div className="cx-row"><button className={BTN_OUTLINE} disabled={!answer.trim()} onClick={verify}>Проверить</button></div>
            </div>
            {checked && (
              <div className="cx-section">
                <p style={{ margin: "0 0 10px", fontSize: 15 }}>Сайт примет <b>{checked.accepted}</b> из {checked.total} рецептов.</p>
                {checked.rows.map((r) => (
                  <p key={r.title} style={{ margin: "0 0 6px", fontSize: 14 }}>
                    {r.notes.length ? "⚠️" : "✓"} <b>{r.title}</b>{r.info && <span className="adm-muted"> · {r.info}</span>}
                    {r.notes.length > 0 && <span className="cx-err"> · {r.notes.join("; ")}</span>}
                  </p>
                ))}
                {checked.errors.length > 0 && <details><summary className="cx-err" style={{ cursor: "pointer" }}>Ошибки ({checked.errors.length})</summary><ul style={{ fontSize: 13 }}>{checked.errors.map((x) => <li key={x}>{x}</li>)}</ul></details>}
                <div className="cx-row">
                  {checked.accepted > 0 && <button className={BTN} onClick={() => void save()}>Сохранить файл {checked.name}</button>}
                  <button className={BTN_SM} onClick={() => setChecked(null)}>Отмена</button>
                </div>
              </div>
            )}
            {msg.ok && <p className="cx-saved" style={{ marginTop: 10 }}>✓ {msg.ok}</p>}
            {msg.err && <p className="cx-err" style={{ marginTop: 10 }}>{msg.err}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
