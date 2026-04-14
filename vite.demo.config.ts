import { defineConfig } from "vite";

/**
 * Dev server for the SDK demo.
 *
 * Serves the SDK root so demo/index.html can reference ../dist/ naturally.
 * Run: pnpm run demo → opens http://localhost:4400/demo/
 */
export default defineConfig({
  server: {
    port: 4400,
    open: "/demo/",
  },
  publicDir: false,
});
