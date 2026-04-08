import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const globals = {
  react: "React",
  "react-dom": "ReactDOM",
  "react-dom/client": "ReactDOM",
  "react/jsx-runtime": "jsxRuntime",
};

const assetFileNames = (isViewer: boolean) => (assetInfo: { name?: string }) => {
  const name = assetInfo.name || "";
  if (name.endsWith(".css")) {
    return isViewer ? "viewer.css" : "editor.css";
  }
  return name || "asset-[hash].[ext]";
};

export default defineConfig(({ mode, command }) => {
  const isViewer = mode === "viewer";
  const isDev = command === "build" && process.argv.includes("--watch");

  const entry = isViewer
    ? resolve(__dirname, "src/viewer.tsx")
    : resolve(__dirname, "src/index.ts");
  const libName = isViewer ? "PageHubViewer" : "PageHub";
  const baseName = isViewer ? "pagehub-viewer" : "pagehub";

  return {
    plugins: [
      react(),
      ...(!isDev
        ? [
            dts({
              include: ["src/**/*.ts", "src/**/*.tsx"],
              exclude: ["src/vite-editor-css-entry.ts"],
              outDir: "dist",
              rollupTypes: false,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@pagehub/ui": resolve(__dirname, "../ui/src/index.ts"),
        "@": resolve(__dirname, "src"),
        // Map original main app import patterns to SDK locations
        "components/layout": resolve(__dirname, "src/chrome/shared/layout"),
        "utils/icons.json": resolve(__dirname, "src/utils/data/icons.json"),
        "utils/googleIcons.json": resolve(__dirname, "src/utils/data/googleIcons.json"),
        "utils": resolve(__dirname, "src/utils"),
        "lodash": resolve(__dirname, "../../node_modules/lodash-es"),
        // Stub Node.js polyfills pulled in by lzutf8
        "readable-stream": resolve(__dirname, "src/shims/empty.ts"),
        "stream": resolve(__dirname, "src/shims/empty.ts"),
        // Framework stubs
        "next/link": resolve(__dirname, "src/shims/next.tsx"),
        "next/image": resolve(__dirname, "src/shims/next.tsx"),
        "next/router": resolve(__dirname, "src/shims/next.tsx"),
        "next-auth/react": resolve(__dirname, "src/shims/next.tsx"),
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      minify: true,
      lib: {
        entry,
        name: libName,
        formats: isDev ? ["umd"] : ["es", "umd"],
        fileName: (format) => `${baseName}.${format === "es" ? "js" : "umd.cjs"}`,
      },
      rollupOptions: {
        external: (id) => /^react(-dom)?(\/|$)/.test(id),
        output: [
          // ES — code-split heavy deps into lazy chunks
          {
            format: "es" as const,
            globals,
            entryFileNames: `${baseName}.js`,
            chunkFileNames: "chunks/[name]-[hash].js",
            assetFileNames: assetFileNames(isViewer),
          },
          // UMD — single file for CDN/script-tag usage
          {
            format: "umd" as const,
            name: libName,
            inlineDynamicImports: true,
            globals,
            entryFileNames: `${baseName}.umd.cjs`,
            assetFileNames: assetFileNames(isViewer),
          },
        ],
      },
      cssCodeSplit: false,
      sourcemap: false,
      emptyOutDir: !isViewer, // Only clean on the main build, not the viewer build
    },
  };
});
