// «Шеф в Алисе»: a short code that links a speaker to the family's plan and shopping list (server: api/_private/
// alice_home.php). The plan and the list are already kept on the server for the family; the code only says which
// household this speaker may read and change. One code, once, for 15 minutes; «Отключить» unlinks every speaker.
import { useEffect, useState } from "react";
import { Mic, RefreshCw } from "lucide-react";
import { apiUrl, plural } from "../engine";
import { useStore } from "../app/store";

async function call(route: string, post: boolean): Promise<Record<string, unknown>> {
  const r = await fetch(apiUrl(route), post
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "same-origin" }
    : { credentials: "same-origin" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: string }).error || "Не удалось связаться с сервером.");
  return body;
}

export function AliceSheetBody({ name }: { name: string }) {
  const { sync, toast } = useStore();
  const [code, setCode] = useState<string | null>(null);
  const [linked, setLinked] = useState(0);
  const [error, setError] = useState("");
  const ready = sync.status.state === "ready";

  const fresh = () => {
    setError("");
    call("alice.code", true).then((b) => { setCode(String(b.code)); setLinked(Number(b.linked) || 0); }).catch((e: Error) => setError(e.message));
  };
  useEffect(() => { if (ready) fresh(); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  // Linked while the sheet is open: the count changes as soon as the speaker has heard the code.
  useEffect(() => {
    if (!ready || !code) return;
    // The code works once: when a speaker has used it, a new one for the next speaker.
    const t = setInterval(() => { call("alice.status", false).then((b) => { const n = Number(b.linked) || 0; setLinked((was) => { if (n > was) { toast("Колонка подключена"); fresh(); } return n; }); }).catch(() => {}); }, 4000);
    return () => clearInterval(t);
  }, [ready, code]);
  const unlink = () => call("alice.unlink", true).then(() => { setLinked(0); toast("Алиса больше не видит ваш план и покупки"); fresh(); }).catch((e: Error) => toast(e.message));

  if (!ready) return <p className="text-body-sm text-ink-soft">Нужна связь с сервером: план и покупки должны сохраниться на нём. Проверьте интернет и откройте это окно ещё раз.</p>;
  return (
    <div>
      <p className="text-body-sm text-ink-soft">Колонка подскажет, что на ужин по плану, прочитает список покупок, вычеркнет купленное и скажет, что в морозилке.</p>
      <div className="mt-4 rounded-card bg-brand-soft px-4 py-4 text-center">
        <p className="text-caption text-ink-soft">Ваш код</p>
        <p className="mt-1 text-[2.25rem] font-semibold tabular-nums tracking-[0.35em] text-brand-ink" aria-live="polite">{code ?? "····"}</p>
        <p className="text-caption text-ink-soft">действует 15 минут, подходит один раз</p>
      </div>
      {error && <p className="mt-2 text-body-sm text-warn">{error}</p>}
      <p className="mt-4 text-body-sm">Скажите колонке один раз:</p>
      <p className="mt-2 flex gap-2 rounded-input bg-sunken p-3 text-body">
        <Mic size={18} className="mt-1 shrink-0 text-brand" aria-hidden />
        <span>«Алиса, попроси {name} запомнить код {code ?? "…"}»</span>
      </p>
      <p className="mt-3 text-caption text-ink-soft">Потом: «Алиса, спроси у {name}, что на ужин», «что купить», «вычеркни молоко», «что в морозилке», «достань котлеты на завтра».</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-body-sm text-ink-soft">{linked ? "Подключено: " + linked + " " + plural(linked, "устройство", "устройства", "устройств") : "Пока не подключено"}</span>
        <span className="flex gap-1">
          <button className="btn-ghost h-11 px-3 text-body-sm" onClick={fresh}><RefreshCw size={16} aria-hidden />Новый код</button>
          {linked > 0 && <button className="btn-ghost h-11 px-3 text-body-sm text-warn" onClick={unlink}>Отключить</button>}
        </span>
      </div>
    </div>
  );
}
