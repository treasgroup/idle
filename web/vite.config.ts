import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const assets = fileURLToPath(new URL("../server/assets/", import.meta.url));
// PREVIEW_OUT: build into another folder (local previews); the hosting folder is left alone then.
const previewOut = process.env.PREVIEW_OUT;

/** Removes the previous build's bundles, so old files do not pile up on the hosting (assets/legacy stays). */
const cleanOldBundles = (): Plugin => ({
  name: "clean-old-bundles",
  apply: "build",
  buildStart() {
    if (previewOut) return;
    for (const f of readdirSync(assets)) if (/^(app|chunk)-[\w-]+\.(js|css)$/.test(f)) rmSync(assets + f);
  },
});

// Files without a hash in the name (boot.js, intent-model.json): the hosting tells browsers to keep them for 45 days,
// so they are asked for with their content's hash (?v=…) — a changed file is a new address.
const fileHash = (name: string) => {
  try { return createHash("sha1").update(readFileSync(fileURLToPath(new URL("../server/" + name, import.meta.url)))).digest("hex").slice(0, 8); } catch { return "0"; }
};
const versionedBoot = (): Plugin => ({
  name: "versioned-boot",
  transformIndexHtml: (html) => html.replace('src="./boot.js"', 'src="./boot.js?v=' + fileHash("boot.js") + '"'),
});

// Every path is relative: the same build works at the site root (shefly.ru) and in a subfolder (the old treas.su/cook/).
// The build goes straight into ../server — the folder that is uploaded to the hosting.
export default defineConfig({
  base: "./",
  plugins: [react(), cleanOldBundles(), versionedBoot()],
  define: { __INTENT_V__: JSON.stringify(fileHash("intent-model.json")) },
  build: {
    outDir: previewOut ?? "../server",
    emptyOutDir: false,
    // Vite 6 builds for Chrome 107+ by default; old phones keep an older WebView, so the Vite 5 range stays.
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
    assetsDir: "assets",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app-[hash].js",
        chunkFileNames: "assets/chunk-[hash].js",
        assetFileNames: "assets/app-[hash][extname]",
      },
    },
  },
  server: {
    proxy: { "/api": { target: process.env.COOK_API ?? "https://shefly.ru", changeOrigin: true } },
  },
});
