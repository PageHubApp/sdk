import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const assetFileNames =
  (isViewer: boolean, isStatic: boolean) => (assetInfo: { name?: string }) => {
    const name = assetInfo.name || "";
    if (name.endsWith(".css")) {
      // The static build appends to dist (emptyOutDir off) — keep any CSS it
      // happens to emit off of editor.css / viewer.css so it can't clobber them.
      if (isStatic) return "render-static.css";
      return isViewer ? "viewer.css" : "editor.css";
    }
    return name || "asset-[hash].[ext]";
  };

export default defineConfig(({ mode }) => {
  const isViewer = mode === "viewer";
  // Standalone static-renderer entry (renderToHTML). Build as its own ES module so
  // `@pagehub/sdk/html` / `@pagehub/sdk/render/static` resolve to a real file —
  // the type-only entry that shipped before (.d.ts, no .js) 404'd for consumers.
  const isStatic = mode === "static";

  const entry = isViewer
    ? resolve(__dirname, "src/viewer.tsx")
    : isStatic
      ? resolve(__dirname, "src/render/static/index.ts")
      : resolve(__dirname, "src/index.ts");
  const libName = isViewer ? "PageHubViewer" : isStatic ? "PageHubStatic" : "PageHub";
  // Nested path keeps the emitted file at dist/render/static/index.js to match exports.
  const entryFileName = isStatic ? "render/static/index.js" : `${isViewer ? "pagehub-viewer" : "pagehub"}.js`;

  return {
    plugins: [
      react(),
      // Types are emitted once, on the main build — it includes all of src/**, so it
      // already produces viewer.d.ts and render/static/index.d.ts. No need to re-run
      // dts on the viewer / static builds.
      ...(!isViewer && !isStatic
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
        // ES only. The SDK is consumed via bundlers (npm) or native ESM (esm.sh
        // import maps for no-build pages); the legacy UMD/script-tag output was
        // removed — it externalized craft.js to a global no CDN provides, so it
        // never worked standalone anyway.
        formats: ["es"],
        fileName: () => entryFileName,
      },
      rollupOptions: {
        // Keep react + craft.js external — they're peer/runtime deps the consumer
        // (bundler or esm.sh) resolves, not bundled into the SDK.
        external: id =>
          /^react(-dom)?(\/|$)/.test(id) || /^@craftjs\//.test(id),
        output: {
          format: "es" as const,
          // code-split heavy deps into lazy chunks shared across entries
          entryFileNames: entryFileName,
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: assetFileNames(isViewer, isStatic),
        },
      },
      cssCodeSplit: false,
      sourcemap: false,
      // Only the main build cleans dist; viewer + static append to it.
      emptyOutDir: !isViewer && !isStatic,
    },
  };
});
