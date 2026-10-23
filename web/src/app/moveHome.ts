// The service moved from treas.su/cook to shefly.ru (2026-10). What a person saved without an account — the plan,
// shopping, favourites, profile, chats — lives in the browser per address, so a plain redirect would leave them with
// an empty site. The old address opens this page once more: it packs what is saved, compresses it and opens
// shefly.ru with it in the link (#move=…, never sent to a server); the new address unpacks it before the app starts.
// Recipe pages, catalog lists and the admin are redirected by the server (.htaccess) — only this page carries data.
import { loadState, normalizeState, saveState } from "../engine";

export const NEW_HOME = "https://shefly.ru/";
// Caches the new address makes again by itself.
const SKIP = /^cook-(catalog-saved|today-server-|weather|ratings|recipe-stats|chunk-reload|offline-photos)/;

/** The old site in a browser (not the Android app, which has its own storage). */
export const isOldHome = (): boolean => /(^|\.)treas\.su$/.test(location.hostname) && !(window as Window & { CookNative?: unknown }).CookNative;

const toB64 = (b: Uint8Array) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const fromB64 = (s: string) => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
}
/** «z» + deflate where the browser can, else «j» + plain JSON; both in base64url. */
export async function pack(v: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(v));
  if (typeof CompressionStream !== "undefined") try { return "z" + toB64(await pipe(json, new CompressionStream("deflate-raw"))); } catch { /* plain below */ }
  return "j" + toB64(json);
}
export async function unpack(s: string): Promise<unknown> {
  const raw = fromB64(s.slice(1));
  const bytes = s[0] === "z" ? await pipe(raw, new DecompressionStream("deflate-raw")) : raw;
  return JSON.parse(new TextDecoder().decode(bytes));
}

type Moved = { v: 1; ls: Record<string, string>; state: unknown; hash: string };

/** On treas.su: to the same page of shefly.ru, with what is saved here. */
export async function moveHome(): Promise<void> {
  const path = location.pathname.replace(/^\/cook\/?/, "").replace(/^\//, "") + location.search;
  const hash = location.hash.startsWith("#move=") ? "" : location.hash;
  const ls: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("cook-") && !SKIP.test(k)) ls[k] = localStorage.getItem(k) ?? "";
    }
  } catch { /* private mode: nothing to carry */ }
  let state: unknown = null;
  try { state = await loadState(); } catch { /* nothing saved */ }
  const s = state as { favorites?: unknown[]; menu?: unknown[]; shopping?: unknown[]; book?: unknown[] } | null;
  const has = Object.keys(ls).length > 0 || !!(s && (s.favorites?.length || s.menu?.length || s.shopping?.length || s.book?.length));
  if (!has) { location.replace(NEW_HOME + path + hash); return; }
  let data = await pack({ v: 1, ls, state, hash } satisfies Moved);
  // A very long link (years of chats) is cut down to what matters: the chats stay behind.
  if (data.length > 1_500_000) { delete ls["cook-chats-v1"]; data = await pack({ v: 1, ls, state, hash } satisfies Moved); }
  location.replace(NEW_HOME + path + "#move=" + data);
}

/** On shefly.ru, before the app starts: takes what came from the old address (once, and only into an empty site). */
export async function takeMove(): Promise<void> {
  if (!location.hash.startsWith("#move=")) return;
  const raw = location.hash.slice(6);
  let moved: Moved | null = null;
  try { moved = (await unpack(raw)) as Moved; } catch { /* a broken link: start as usual */ }
  history.replaceState(null, "", location.pathname + location.search + (moved?.hash ?? ""));
  if (!moved || moved.v !== 1) return;
  let fresh = true;
  try { fresh = !localStorage.getItem("cook-profile-v1"); } catch { /* private mode */ }
  if (!fresh) return; // already used here: nothing is overwritten
  try { for (const [k, v] of Object.entries(moved.ls ?? {})) localStorage.setItem(k, v); } catch { /* storage full */ }
  if (moved.state) try { await saveState(normalizeState(moved.state)); } catch { /* the plan stays empty */ }
}
