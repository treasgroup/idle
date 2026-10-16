// «Семейная книга»: own recipes, kept with everything else (and on the person's other devices), and sent to the
// family as a link that carries the recipe itself — no server needed to share it.
import { siteBase, type EngineState, type MyRecipe } from "../engine";

export const newRecipe = (): MyRecipe => ({
  id: "my-" + Math.random().toString(36).slice(2, 10), title: "", from: "", people: 4, minutes: null, ingredients: "", steps: "", note: "", at: Date.now(),
});

export const saveRecipe = (st: EngineState, r: MyRecipe): EngineState => {
  const list = st.myRecipes ?? [];
  const rest = list.filter((x) => x.id !== r.id);
  return { ...st, myRecipes: [...rest, { ...r, at: Date.now() }] };
};
export const removeRecipe = (st: EngineState, id: string): EngineState => ({ ...st, myRecipes: (st.myRecipes ?? []).filter((x) => x.id !== id) });

export const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

// ——— A link that is the recipe ———
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** «z…» = compressed (shorter links for messengers), «j…» = plain where the browser cannot compress. */
export async function shareLink(r: MyRecipe): Promise<string> {
  const { id: _id, at: _at, ...rest } = r;
  const raw = new TextEncoder().encode(JSON.stringify(rest));
  let code = "j" + b64url(raw);
  if (typeof CompressionStream !== "undefined") {
    try { code = "z" + b64url(await pipe(raw, new CompressionStream("deflate-raw"))); } catch { /* plain */ }
  }
  return siteBase() + "#book=" + code;
}

export async function readLink(code: string): Promise<Partial<MyRecipe> | null> {
  try {
    let bytes = fromB64url(code.slice(1));
    if (code[0] === "z") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    const r = JSON.parse(new TextDecoder().decode(bytes));
    return r && typeof r === "object" && typeof r.title === "string" ? r : null;
  } catch { return null; }
}

export function recipeText(r: MyRecipe): string {
  const facts = [r.people ? "на " + r.people + " чел." : "", r.minutes ? r.minutes + " мин" : ""].filter(Boolean).join(", ");
  return [
    r.title + (r.from ? " (" + r.from + ")" : "") + (facts ? " — " + facts : ""),
    lines(r.ingredients).length ? "\nПродукты:\n" + lines(r.ingredients).map((l) => "• " + l).join("\n") : "",
    lines(r.steps).length ? "\nКак готовить:\n" + lines(r.steps).map((l, i) => i + 1 + ". " + l).join("\n") : "",
    r.note ? "\n" + r.note : "",
  ].filter(Boolean).join("\n");
}
