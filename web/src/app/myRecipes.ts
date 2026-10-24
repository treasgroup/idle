// «Семейная книга»: own recipes, kept with everything else (and on the person's other devices), and sent to the
// family as a link that carries the recipe itself — no server needed to share it.
import { shortName, siteBase, type EngineState, type MyRecipe, type RecipeIngredient } from "../engine";
import { matchProduct } from "./typedList";

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

const UNITS: Record<string, string> = { г: "г", гр: "г", грамм: "г", кг: "кг", мл: "мл", л: "л", литр: "л", шт: "шт.", штук: "шт.", штуки: "шт." };

/**
 * «Продукты в покупки» for a family recipe: «Мука — 300 г», «Яйца 2 шт», «2 луковицы», «соль по вкусу» → rows with
 * the product and, when it is said in grams, litres or pieces, the amount. Spoons and glasses are left to the person;
 * what is always at home (`skip`: salt, pepper, water, oil) and «по вкусу» are not added.
 */
export function ingredientRows(r: MyRecipe, ids: string[], skip: Set<string>): RecipeIngredient[] {
  const out: RecipeIngredient[] = [];
  for (const raw of lines(r.ingredients)) {
    // A list mark («- », «• », «1. », «2) »), not «2 луковицы».
    const l = raw.replace(/^(?:[-•*]\s*|\d+[.)]\s+)/, "").trim();
    if (!l || /по вкусу|для подачи|по желанию/i.test(l) && !/\d/.test(l)) continue;
    // The name: up to a dash, a colon, a bracket, the first figure or «на кончике ножа» («Мука — 300 г», «Яйца 2 шт»).
    const name = l.split(/\s*[—–:(]\s*|\s+\d|\s+(?:на кончике|по вкусу|щепотк)/)[0].replace(/[,.]+$/, "").trim();
    const lead = l.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/); // «2 луковицы»
    const product = lead ? lead[2] : name;
    if (!product || product.length < 2) continue;
    const id = matchProduct(product, ids);
    if (id && skip.has(id)) continue;
    const m = l.match(/(\d+(?:[.,]\d+)?)\s*(кг|гр|грамм|г|мл|литр|л|шт|штук|штуки)(?![\p{L}])/u);
    const amount = m ? Number(m[1].replace(",", ".")) : lead ? Number(lead[1].replace(",", ".")) : 1;
    const unit = m ? UNITS[m[2]] : "шт.";
    out.push({ id: id ?? "custom-" + Math.random().toString(36).slice(2, 9), name: id ? shortName(id) : product.charAt(0).toUpperCase() + product.slice(1), amount, unit, optional: false } as RecipeIngredient);
  }
  return out;
}

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
