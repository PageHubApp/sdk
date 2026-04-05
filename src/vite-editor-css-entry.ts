/**
 * Vite library build entry only — pulls in {@link ./editor.css} so `dist/editor.css` is emitted.
 * Not imported from `index.ts` so Next.js and other frameworks can consume `@pagehub/sdk` without
 * tripping global-CSS rules (hosts should `import "@pagehub/sdk/editor.css"` once in `_app` / layout).
 */

import "./editor.css";
