// Puts the text recogniser (Tesseract, free, runs on the phone) next to the site: server/ocr/.
// The Russian language file is kept in the repository (server/ocr/lang), the engine comes from node_modules.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.env.PREVIEW_OUT) process.exit(0);
const from = (p) => fileURLToPath(new URL("../node_modules/" + p, import.meta.url));
const to = fileURLToPath(new URL("../../server/ocr/", import.meta.url));
mkdirSync(to, { recursive: true });
const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
];
for (const [src, name] of files) {
  const a = from(src), b = to + name;
  if (!existsSync(b) || statSync(a).size !== statSync(b).size) copyFileSync(a, b);
}
if (!existsSync(to + "lang/rus.traineddata.gz")) console.warn("server/ocr/lang/rus.traineddata.gz is missing — recognition will not work");
