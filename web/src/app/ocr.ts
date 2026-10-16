// Text from a photo (a notebook page, a cookbook, a card) — recognised on the phone itself by Tesseract, free and
// from the site's own server (ocr/). Loaded only when someone uses it: the first time ~5 MB, then from the cache.
// Neat handwriting and print come out well; scrawl less so — the text is always shown for correcting.

/** The photo made smaller and plainer before recognition: faster, and better on phones. */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const ctx = c.getContext("2d")!;
    ctx.filter = "grayscale(1) contrast(1.25)";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

export async function recognize(file: Blob, progress: (share: number, what: string) => void): Promise<string> {
  progress(0.02, "Готовлю распознавание…");
  const { createWorker } = await import("tesseract.js");
  const base = new URL("./ocr/", location.href).href;
  const worker = await createWorker("rus", 1, {
    workerPath: base + "worker.min.js",
    corePath: base,
    langPath: base + "lang",
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === "recognizing text") progress(0.3 + m.progress * 0.7, "Читаю текст…");
      else if (/load|initializ/i.test(m.status)) progress(0.05 + m.progress * 0.25, "Загружаю распознавание (только в первый раз)…");
    },
  });
  try {
    const canvas = await prepare(file);
    const { data } = await worker.recognize(canvas);
    progress(1, "Готово");
    return data.text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  } finally { void worker.terminate(); }
}

const UNIT = /\d|(?<![а-яё])(г|гр|кг|мл|л|шт|ст|ч\.?\s?л|ст\.?\s?л|стакан\w*|ложк\w*|щепот\w*|пуч\w*|зубчик\w*|по вкусу)(?![а-яё])/i;
const STEPS_HEAD = /^(приготовление|способ приготовления|готовим|как готовить|рецепт)\s*:?\s*$/i;
const PRODUCTS_HEAD = /^(ингредиенты|продукты|состав|нужно|понадобится)\s*:?\s*$/i;

/** A recognised page split the way a recipe is written: the title, the products (short lines with amounts), the steps. */
export function splitRecipe(text: string): { title: string; ingredients: string; steps: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { title: "", ingredients: "", steps: "" };
  let title = "";
  if (lines[0].length <= 60 && !UNIT.test(lines[0])) title = lines.shift()!.replace(/[.:]+$/, "");
  const products: string[] = [], steps: string[] = [];
  let mode: "auto" | "products" | "steps" = "auto";
  for (const l of lines) {
    if (PRODUCTS_HEAD.test(l)) { mode = "products"; continue; }
    if (STEPS_HEAD.test(l)) { mode = "steps"; continue; }
    if (mode === "products" || (mode === "auto" && l.length <= 45 && UNIT.test(l) && !steps.length)) products.push(l.replace(/^[-–•*]\s*/, ""));
    else steps.push(l);
  }
  // A sentence that went on to the next line on paper is one step again.
  const joined: string[] = [];
  for (const l of steps) {
    const prev = joined[joined.length - 1];
    if (prev && !/[.!?:;]$/.test(prev) && /^[a-zа-яё(,]/.test(l)) joined[joined.length - 1] = prev + " " + l;
    else joined.push(l);
  }
  return { title, ingredients: products.join("\n"), steps: joined.join("\n") };
}
