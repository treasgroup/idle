import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const assets = fileURLToPath(new URL("../server/assets/", import.meta.url));

/** Removes the previous build's bundles, so old files do not pile up on the hosting (assets/legacy stays). */
const cleanOldBundles = (): Plugin => ({
  name: "clean-old-bundles",
  apply: "build",
  buildStart() {
    for (const f of readdirSync(assets)) if (/^(app|chunk)-[\w-]+\.(js|css)$/.test(f)) rmSync(assets + f);
  },
});

// The site lives in a subfolder (treas.su/cook/), so every path is relative.
// The build goes straight into ../server — the folder that is uploaded to the hosting.
export default defineConfig({
  base: "./",
  plugins: [react(), cleanOldBundles()],
  build: {
    outDir: "../server",
    emptyOutDir: false,
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
    proxy: { "/api": { target: process.env.COOK_API ?? "https://treas.su/cook", changeOrigin: true } },
  },
});
