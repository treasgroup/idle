// «Фото и имя»: any picture from the gallery or the camera, moved with a finger into the circle and made smaller
// (a 256 px JPEG, ~20 KB) — kept in the profile on this device, never sent anywhere. The name is for «Добрый вечер, Анна!».
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, ShieldCheck, UserRound, ZoomIn, ZoomOut } from "lucide-react";
import { useStore } from "../app/store";
import { Sheet } from "./ui";
import { feature } from "../app/feature";
import { photoChanged } from "../app/photoSync";

const BOX = 224; // the preview square, px
const INSET = 6; // the circle sits this far inside it
const OUT = 256; // the saved picture, px

/** Where the picture lies in the preview: how much it is enlarged and how far it is moved from the centre. */
type View = { zoom: number; x: number; y: number };

export function PhotoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile, toast } = useStore();
  const [name, setName] = useState(profile.name ?? "");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [moved, setMoved] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

  // Each opening starts from what is saved.
  useEffect(() => {
    if (!open) return;
    setName(profile.name ?? "");
    setView({ zoom: 1, x: 0, y: 0 });
    setMoved(false);
    setImg(null);
    if (profile.photo) load(profile.photo);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function load(src: string, fresh?: boolean) {
    const i = new Image();
    i.onload = () => { setImg(i); setView({ zoom: 1, x: 0, y: 0 }); setMoved(!!fresh); };
    i.onerror = () => toast("Не получилось открыть это фото. Попробуйте другое.");
    i.src = src;
  }
  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast("Это не фото. Выберите картинку.");
    load(URL.createObjectURL(f), true);
  };

  // The picture always covers the circle: the smaller side fills the square, then the zoom.
  const scale = img ? (BOX / Math.min(img.naturalWidth, img.naturalHeight)) * view.zoom : 1;
  const w = img ? img.naturalWidth * scale : BOX, h = img ? img.naturalHeight * scale : BOX;
  const clamp = (v: View): View => {
    const s = img ? (BOX / Math.min(img.naturalWidth, img.naturalHeight)) * v.zoom : 1;
    const mx = img ? (img.naturalWidth * s - BOX) / 2 : 0, my = img ? (img.naturalHeight * s - BOX) / 2 : 0;
    return { zoom: v.zoom, x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) };
  };
  const left = (BOX - w) / 2 + view.x, top = (BOX - h) / 2 + view.y;

  const save = () => {
    let photo = profile.photo;
    if (img && moved) {
      const c = document.createElement("canvas");
      c.width = c.height = OUT;
      const g = c.getContext("2d");
      if (g) {
        g.imageSmoothingQuality = "high";
        g.drawImage(img, (INSET - left) / scale, (INSET - top) / scale, (BOX - 2 * INSET) / scale, (BOX - 2 * INSET) / scale, 0, 0, OUT, OUT);
        photo = c.toDataURL("image/jpeg", 0.85);
        feature("photo_set");
      }
    }
    if (img?.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    const at = photo !== profile.photo ? Date.now() : profile.photoAt;
    if (photo !== profile.photo && at) photoChanged(photo, at);
    setProfile((p) => ({ ...p, name: name.trim().slice(0, 30) || undefined, photo, photoAt: at }));
    onClose();
  };
  const remove = () => {
    const at = Date.now();
    photoChanged(undefined, at);
    setProfile((p) => ({ ...p, photo: undefined, photoAt: at }));
    toast("Фото убрано");
    onClose();
  };
  const r = (BOX - 2 * INSET) / 2;

  return (
    <Sheet open={open} title="Фото и имя" onClose={onClose}
      footer={<button className="btn-primary w-full" onClick={save}>Сохранить</button>}>
      <div className="relative mx-auto mt-1 touch-none select-none overflow-hidden rounded-card bg-sunken" style={{ width: BOX, height: BOX }}
        onPointerDown={(e) => { if (!img) return; (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; setView(clamp({ zoom: view.zoom, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py })); setMoved(true); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        {img
          ? <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left, top, width: w, height: h }} />
          : <button className="absolute inset-0 grid place-items-center text-ink-soft" onClick={() => gallery.current?.click()} aria-label="Выбрать фото"><UserRound size={88} strokeWidth={1.25} /></button>}
        <span className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at center, transparent ${r - 1}px, rgb(var(--paper) / .8) ${r}px)` }} aria-hidden />
        <span className="pointer-events-none absolute rounded-full border-2 border-white shadow-e1" style={{ inset: INSET }} aria-hidden />
      </div>
      {img && <>
        <p className="mt-2 text-center text-caption text-ink-soft">Подвиньте пальцем, чтобы главное было в круге</p>
        <label className="mx-auto mt-2 flex max-w-[280px] items-center gap-2 text-ink-faint">
          <ZoomOut size={18} aria-hidden />
          <input type="range" min={1} max={3} step={0.01} value={view.zoom} aria-label="Увеличить"
            onChange={(e) => { setView(clamp({ ...view, zoom: Number(e.target.value) })); setMoved(true); }} className="flex-1 accent-[rgb(var(--brand))]" />
          <ZoomIn size={18} aria-hidden />
        </label>
      </>}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-body-sm font-semibold">Как к вам обращаться <span className="font-normal text-ink-soft">— необязательно</span></span>
        <input className="input" value={name} maxLength={30} placeholder="Например, Анна" autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-outline" onClick={() => gallery.current?.click()}><ImagePlus size={18} aria-hidden />{touch ? "Из галереи" : "Выбрать фото"}</button>
        {touch ? <button className="btn-outline" onClick={() => camera.current?.click()}><Camera size={18} aria-hidden />Камера</button>
          : profile.photo ? <button className="btn-ghost" onClick={remove}>Убрать фото</button> : <span />}
      </div>
      {touch && profile.photo && <button className="btn-ghost mt-1 w-full" onClick={remove}>Убрать фото</button>}
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <input ref={camera} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <p className="mt-3 flex gap-2 rounded-input bg-herb-soft px-3 py-2.5 text-caption text-ink-soft">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-herb" aria-hidden />Фото уменьшается и хранится в вашем аккаунте — его видите только вы, на своих устройствах.
      </p>
    </Sheet>
  );
}
