// The new admin tabs: one file, server/admin/extra.js, loaded by admin/index.html next to the old panel's bundle.
// After the build its address in admin/index.html gets the file's hash (?v=…): the hosting keeps .js in browsers for 45 days.
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../server/admin/", import.meta.url));

const versioned = (): Plugin => ({
  name: "versioned-extra",
  apply: "build",
  writeBundle() {
    const v = createHash("sha1").update(readFileSync(out + "extra.js")).digest("hex").slice(0, 8);
    const page = out + "index.html";
    const html = readFileSync(page, "utf8");
    const tag = `<script type="module" src="./extra.js?v=${v}"></script>`;
    const next = /<script type="module" src="\.\/extra\.js\?v=\w+"><\/script>/.test(html)
      ? html.replace(/<script type="module" src="\.\/extra\.js\?v=\w+"><\/script>/, tag)
      : html.replace("</body>", "  " + tag + "\n</body>");
    if (next !== html) writeFileSync(page, next);
  },
});

export default defineConfig({
  plugins: [react(), versioned()],
  // __ADMIN_V__: the older scripts (insights.js, vk.js, heal.js) are asked for with the build's number, so an updated
  // one is not taken from the browser's 45-day cache.
  define: { "process.env.NODE_ENV": JSON.stringify("production"), __INTENT_V__: JSON.stringify("admin"), __ADMIN_V__: JSON.stringify(Date.now().toString(36)) },
  build: {
    outDir: out,
    emptyOutDir: false,
    copyPublicDir: false,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: fileURLToPath(new URL("./src/admin/main.tsx", import.meta.url)),
      output: { entryFileNames: "extra.js", inlineDynamicImports: true, format: "es" },
    },
  },
});
