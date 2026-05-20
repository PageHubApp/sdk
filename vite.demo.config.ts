import { defineConfig } from "vite";

/**
 * Dev server for the SDK demo.
 *
 * Serves the SDK root so demo/index.html can reference ../dist/ naturally.
 * Run: pnpm run demo → opens http://localhost:4400/demo/
 *
 * The demo has no real backend, so we stub the host-app REST endpoints the SDK
 * polls on mount (components / patterns / fonts). Returning empty payloads keeps
 * the console clean without changing SDK behavior — these features just stay empty.
 */
const stubEndpoints: Record<string, unknown> = {
  // Shapes match the host-app endpoints. /api/fonts/list proxies Google Fonts
  // which returns `{ items: [...] }`; the SDK calls `.items.filter(...)`.
  "/api/v1/components": { components: [] },
  "/api/patterns": { patterns: [] },
  "/api/fonts/list": { items: [] },
};

export default defineConfig({
  server: {
    port: 4400,
    open: "/demo/",
  },
  publicDir: false,
  plugins: [
    {
      name: "pagehub-demo-api-stubs",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split("?")[0] ?? "";
          if (Object.prototype.hasOwnProperty.call(stubEndpoints, url)) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(stubEndpoints[url]));
            return;
          }
          next();
        });
      },
    },
  ],
});
