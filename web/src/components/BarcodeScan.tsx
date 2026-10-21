// «Сканировать штрихкод» for «Мои продукты»: the phone's camera reads the code (built into Chrome on Android,
// no library), the site's server looks the product up in the free Open Food Facts base, and the name is matched
// to a product of the recipes. Shown only where the browser can read barcodes.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiUrl, ingredientOptions, searchIngredients } from "../engine";
import { cue } from "../app/feedback";

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorClass = new (o: { formats: string[] }) => Detector;
const Native = (globalThis as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;

export const canScan = () => !!Native && !!navigator.mediaDevices?.getUserMedia;

/** «Молоко ультрапастеризованное 3,2%» → milk: the whole name first, then each word. */
export function matchProduct(name: string): string | null {
  const ids = ingredientOptions().map((o) => o.id).filter((id) => id !== "water");
  const whole = searchIngredients(name, ids, 1)[0];
  if (whole) return whole;
  for (const w of name.toLowerCase().split(/[^а-яёa-z]+/).filter((x) => x.length > 3)) {
    const hit = searchIngredients(w, ids, 1)[0];
    if (hit) return hit;
  }
  return null;
}

export function BarcodeScan({ onFound, onClose }: { onFound: (r: { id: string | null; name: string | null }) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"start" | "look" | "ask" | "error">("start");
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stop = false;
    let timer = 0;
    const detector = new Native!({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    const look = async () => {
      if (stop || !video.current) return;
      try {
        const [hit] = await detector.detect(video.current);
        if (hit && /^\d{8,14}$/.test(hit.rawValue)) return void found(hit.rawValue);
      } catch { /* a frame that could not be read */ }
      timer = window.setTimeout(look, 250);
    };
    const found = async (code: string) => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
      setState("ask");
      try {
        const r = await fetch(apiUrl("barcode"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), credentials: "same-origin" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Не получилось узнать продукт.");
        const name = typeof j.name === "string" ? j.name : null;
        const id = name ? matchProduct(name) : null;
        cue(id ? "scan" : "error");
        onFound({ id, name });
      } catch (e) {
        cue("error"); setError(e instanceof Error ? e.message : "Не получилось узнать продукт."); setState("error");
      }
    };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stop) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) { video.current.srcObject = s; void video.current.play(); }
        setState("look");
        look();
      })
      .catch(() => { setError("Нет доступа к камере. Разрешите его в настройках сайта или найдите продукт поиском."); setState("error"); });
    return () => { stop = true; window.clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // «Назад» on Android (and Esc) closes the camera.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onClose]);

  return (
    <div className="anim-fade fixed inset-0 z-[60] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Сканировать штрихкод">
      <div className="flex items-center justify-between px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <p className="text-body">Наведите камеру на штрихкод</p>
        <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15" onClick={onClose} aria-label="Закрыть"><X size={22} /></button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} className="h-full w-full object-cover" playsInline muted />
        <span aria-hidden className="absolute left-1/2 top-1/2 h-32 w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-card border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" />
      </div>
      <p className="min-h-[72px] px-6 pt-4 text-center text-body-sm text-white/85" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }} role="status">
        {state === "start" ? "Включаю камеру…" : state === "look" ? "Держите ровно, на расстоянии ладони" : state === "ask" ? "Ищу продукт…" : error}
      </p>
    </div>
  );
}
