/**
 * Second pass after the main library build: emit `dist/editor.css` from
 * {@link ./src/vite-editor-css-entry.ts} without importing global CSS from `index.ts`
 * (Next.js disallows package global CSS outside `_app`).
 */
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

const resolveAliases = {
  "@pagehub/ui": path.resolve(dir, "../ui/src/index.ts"),
  "@": path.resolve(dir, "src"),
  "components/layout": path.resolve(dir, "src/chrome/shared/layout"),
  "utils/icons.json": path.resolve(dir, "src/utils/data/icons.json"),
  "utils/googleIcons.json": path.resolve(dir, "src/utils/data/googleIcons.json"),
  utils: path.resolve(dir, "src/utils"),
  lodash: path.resolve(dir, "node_modules/lodash-es"),
  "readable-stream": path.resolve(dir, "src/shims/empty.ts"),
  stream: path.resolve(dir, "src/shims/empty.ts"),
  "next/link": path.resolve(dir, "src/shims/next.tsx"),
  "next/image": path.resolve(dir, "src/shims/next.tsx"),
  "next/router": path.resolve(dir, "src/shims/next.tsx"),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias: resolveAliases },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: path.resolve(dir, "src/vite-editor-css-entry.ts"),
      name: "PageHubSdkEditorCss",
      formats: ["es"],
      fileName: () => "sdk-editor-css-stub",
    },
    rollupOptions: {
      output: {
        assetFileNames: info => {
          const name = info.name || "";
          if (name.endsWith(".css")) return "editor.css";
          return name || "assets/[name]-[hash][extname]";
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
  },
});
