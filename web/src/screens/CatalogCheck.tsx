// ?check=1 — the catalog report for the site owner: how many recipes each file gave, and what was rejected.
import { useEffect, useState } from "react";
import { buildCatalog, apiUrl, type BuiltCatalog } from "../engine";

export function CatalogCheck() {
  const [built, setBuilt] = useState<BuiltCatalog | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(apiUrl("catalog"), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("сервер ответил " + r.status))))
      .then((j) => setBuilt(buildCatalog(j.files)))
      .catch((e) => setError(e instanceof Error ? e.message : "нет связи"));
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Проверка каталога</h1>
      <p className="text-sm text-ink-soft">Файлы из папки data/catalog. Записи с ошибками на сайт не попадают, остальные работают сразу.</p>
      {error && <p className="mt-4 text-brand">Не удалось загрузить каталог: {error}</p>}
      {built && (
        <>
          <p className="mt-4 font-semibold">Принято рецептов: {built.recipes.length}, продуктов: {built.ingredients.length}. Ошибок: {built.errors.length}, предупреждений: {built.warnings.length}.</p>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-ink-faint"><th>Файл</th><th>Рецептов</th><th>Продуктов</th></tr></thead>
            <tbody>{built.files.map((f) => <tr key={f.name} className="border-t border-line"><td className="py-1">{f.name}</td><td>{f.recipes}</td><td>{f.ingredients}</td></tr>)}</tbody>
          </table>
          {[["Ошибки — запись пропущена", built.errors, "text-brand"], ["Предупреждения — запись работает", built.warnings, "text-warn"]].map(([title, list, color]) => (list as BuiltCatalog["errors"]).length > 0 && (
            <section key={title as string} className="mt-6">
              <h2 className={"text-lg font-semibold " + color}>{title as string}</h2>
              <ul className="mt-2 space-y-1 text-sm">{(list as BuiltCatalog["errors"]).map((e, i) => <li key={i}><b>{e.file}</b> · {e.item}: {e.message}</li>)}</ul>
            </section>
          ))}
        </>
      )}
      <p className="mt-8"><a className="text-brand underline" href="./">← На сайт</a></p>
    </div>
  );
}
