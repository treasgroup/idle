// The search pages (recipe.php) in the app's words: products in pieces and spoons («4 зубчика», «2,1 л»), «110 мл воды»
// instead of «одной двадцатой воды», plain checks instead of degrees, «35 мин у плиты, потом ждать 2 ч». The rules live
// here in the app, so they are worked out in the owner's browser — quietly, once each time the panel opens — and only
// the recipes whose texts changed go to the server (admin.seo.texts, kept one file per recipe in seo.php).
import { buildCatalog, displayName, recipes, scaleIngredient, useCatalog, type Recipe } from "../engine";
import { homeQuantity, mergeSame } from "../app/amounts";
import { timeLong } from "../app/recipeTime";
import { withAmounts } from "../app/stepAmounts";
import { get, post } from "./api";

interface Texts {
  id: string; hash: string; time: string; summary: string; tips: string[];
  ing: { id: string; name: string; opt: boolean; text: string; more: string }[];
  steps: { text: string; timer: number }[];
}

/** A short hash of the texts: the server keeps it, so unchanged recipes are not sent again. */
function hashOf(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/** One recipe as its page in the app shows it, for the number of servings it is written for. */
export function searchTexts(r: Recipe): Texts {
  const rows = mergeSame(r.ingredients).map((i) => scaleIngredient(i, r, r.servings));
  const body = {
    id: r.id,
    time: timeLong(r),
    summary: r.summary,
    tips: r.tips,
    ing: rows.map((i) => {
      const q = homeQuantity(i);
      return { id: i.id, name: displayName(i.id, i.name), opt: !!i.optional, text: q.text, more: q.grams ?? (q.hint ? "≈ " + q.hint : "") };
    }),
    steps: r.steps.map((s) => ({ text: withAmounts(s.text, rows), timer: s.timerSeconds ?? 0 })),
  };
  return { ...body, hash: hashOf(JSON.stringify(body)) };
}

let started = false;
/** Once per visit of the panel, after logging in; a failure only waits for the next visit. */
export function prepareSearchTexts(): void {
  if (started) return;
  started = true;
  const run = async () => {
    const [cat, state] = await Promise.all([
      get<{ files: { name: string; data?: unknown; error?: string }[] }>("catalog"),
      get<{ have: Record<string, string> }>("admin.seo.texts"),
    ]);
    const built = buildCatalog(cat.files);
    // The products' names and weights come from the loaded catalog; a tab that loaded its own (without hidden
    // recipes) keeps it.
    if (!recipes().length) useCatalog(built);
    const changed = built.recipes.map(searchTexts).filter((t) => state.have[t.id] !== t.hash);
    for (let i = 0; i < changed.length; i += 100) await post("admin.seo.texts", { items: changed.slice(i, i + 100) });
  };
  const later = (window as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 3000));
  later(() => { run().catch(() => { started = false; }); });
}
