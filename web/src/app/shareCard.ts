// «Поделиться картинкой»: a ready picture of the recipe (photo or drawn plate, title, time, the site's address),
// drawn in the browser. People forward pictures more readily than links — and the address on it brings them here.
import { nutritionOf, photoUrl, siteBase, track, type Recipe } from "../engine";
import { dishEmoji, dishTint } from "../components/dishArt";
import { timeShort } from "./recipeTime";

const W = 1080, H = 1350;
const DIFF: Record<string, string> = { easy: "просто", medium: "средне", hard: "сложно" };

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

/** Words onto lines that fit `max` pixels; at most `limit` lines, the last one with «…». */
function lines(ctx: CanvasRenderingContext2D, text: string, max: number, limit: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const next = line ? line + " " + w : w;
    if (ctx.measureText(next).width <= max) { line = next; continue; }
    if (line) out.push(line);
    line = w;
    if (out.length === limit) break;
  }
  if (line && out.length < limit) out.push(line);
  if (out.length === limit && out.join(" ").length < text.length) out[limit - 1] = out[limit - 1].replace(/\s*\S*$/, "") + "…";
  return out;
}

export async function recipeCard(r: Recipe): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  try { await document.fonts.load('600 64px "Golos Text"'); await document.fonts.load('400 36px "Golos Text"'); } catch { /* system font */ }
  const font = (w: number, px: number) => `${w} ${px}px "Golos Text", system-ui, sans-serif`;

  ctx.fillStyle = "#FAF7F0"; ctx.fillRect(0, 0, W, H);
  // Picture: the photo when there is one, otherwise the plate with the dish's emoji over its colour.
  const top = 840;
  const src = photoUrl(r.id);
  const img = src ? await loadImage(src) : null;
  if (img) {
    const k = Math.max(W / img.width, top / img.height);
    const w = img.width * k, h = img.height * k;
    ctx.drawImage(img, (W - w) / 2, (top - h) / 2, w, h);
  } else {
    const [a, b] = dishTint(r);
    const g = ctx.createLinearGradient(0, 0, W, top);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, top);
    ctx.fillStyle = "rgba(255,255,255,.82)"; ctx.beginPath(); ctx.arc(W / 2, top / 2, 290, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.05)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, top / 2, 220, 0, Math.PI * 2); ctx.stroke();
    ctx.font = "260px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(dishEmoji(r), W / 2, top / 2 + 10);
  }
  // Text block.
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#211D1A"; ctx.font = font(600, 68);
  let y = top + 110;
  for (const l of lines(ctx, r.title, W - 128, 2)) { ctx.fillText(l, 64, y); y += 82; }
  const kcal = nutritionOf(r).perServing.kcal;
  ctx.fillStyle = "#5C544D"; ctx.font = font(400, 38);
  ctx.fillText([timeShort(r), DIFF[r.difficulty] ?? "", kcal ? kcal + " ккал" : ""].filter(Boolean).join("  ·  "), 64, y + 6);
  if (r.summary) {
    ctx.fillStyle = "#5C544D"; ctx.font = font(400, 34);
    let yy = y + 72;
    for (const l of lines(ctx, r.summary, W - 128, 2)) { ctx.fillText(l, 64, yy); yy += 46; }
  }
  // Footer: where to find it.
  ctx.fillStyle = "#B7432F"; ctx.fillRect(0, H - 120, W, 120);
  ctx.fillStyle = "#FFFFFF"; ctx.font = font(600, 40);
  ctx.fillText("Шефли", 64, H - 46);
  ctx.font = font(400, 34); ctx.textAlign = "right";
  ctx.fillText(siteBase().replace(/^https?:\/\//, "").replace(/\/$/, ""), W - 64, H - 48);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

/** Shares the picture through the phone's own menu, or saves it where sharing files is not possible. */
export async function shareRecipeCard(r: Recipe, link: string): Promise<"shared" | "saved" | "failed"> {
  const blob = await recipeCard(r);
  if (!blob) return "failed";
  const file = new File([blob], r.id + ".png", { type: "image/png" });
  track({ type: "share", recipeId: r.id });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: r.title, text: "«" + r.title + "» — рецепт: " + link }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "shared"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = r.id + ".png";
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "saved";
}
