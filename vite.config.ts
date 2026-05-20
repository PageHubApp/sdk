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
              exclude: ["src/css/vite-editor-css-entry.ts"],
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
        lodash: resolve(__dirname, "../../node_modules/lodash-es"),
        // Stub Node.js polyfills pulled in by lzutf8
        "readable-stream": resolve(__dirname, "src/core/shims/empty.ts"),
        stream: resolve(__dirname, "src/core/shims/empty.ts"),
        // Framework stubs
        "next/link": resolve(__dirname, "src/core/shims/next.tsx"),
        "next/image": resolve(__dirname, "src/core/shims/next.tsx"),
        "next/router": resolve(__dirname, "src/core/shims/next.tsx"),
        "next/dynamic": resolve(__dirname, "src/core/shims/next-dynamic.tsx"),
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      // SDK standalone builds run in browsers where `process` is undefined.
      // Code in utils/cdn.ts references literal `process.env.NEXT_PUBLIC_*`
      // because Next.js requires literal access for client-side inlining;
      // replace them at build time with empty strings so the standalone bundle
      // doesn't crash on `process is not defined`. Hosts that need a CDN call
      // `configureCdn()` at runtime instead of relying on env.
      "process.env.NEXT_PUBLIC_CDN_BASE_URL": JSON.stringify(""),
      "process.env.NEXT_PUBLIC_CDN_ACCOUNT_HASH": JSON.stringify(""),
      "process.env.NEXT_PUBLIC_CDN_VARIANT": JSON.stringify(""),
    },
    build: {
      minify: true,
      lib: {
        entry,
        name: libName,
        formats: isDev ? ["umd"] : ["es", "umd"],
        fileName: format => `${baseName}.${format === "es" ? "js" : "umd.cjs"}`,
      },
      rollupOptions: {
        external: id => /^react(-dom)?(\/|$)/.test(id),
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
