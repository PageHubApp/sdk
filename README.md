# @pagehub/sdk

> Drop a full visual page builder into any web app.

A drag-and-drop page editor SDK built on [CraftJS](https://craft.js.org/). Includes a visual canvas, component toolbox, settings panels, responsive preview, multi-page support, AI generation, SEO controls, and static HTML export — all configured through a single config object.

## Install

```bash
npm install @pagehub/sdk
```

**Developing inside the `pagehub.dev` repo:** this package lives at **`packages/sdk`** and is linked with **`workspace:*`**. Use **pnpm from the repository root** only (`pnpm install`, `pnpm run build`). Do not run install only inside `packages/sdk/`. Every dependency imported from `src/` must be listed in this directory’s **`package.json`**. See root **`README.md`**, **`.cursorrules`**, and **`CLAUDE.md`**.

---

## Quick Start

### React / Next.js

```tsx
import { PageHubEditor } from "@pagehub/sdk";
import "@pagehub/sdk/editor.css";

export default function Builder() {
  return (
    <PageHubEditor
      callbacks={{
        onLoad: async () => {
          const res = await fetch("/api/pages/home");
          return res.ok ? res.json() : null; // null = blank canvas
        },
        onSave: async pageData => {
          await fetch("/api/pages/home", {
            method: "PUT",
            body: JSON.stringify(pageData),
          });
        },
      }}
      theme={{ primaryColor: "#2563eb" }}
    />
  );
}
```

> **SSR note:** The editor uses browser APIs. In Next.js, load it with `next/dynamic`:
>
> ```tsx
> const Builder = dynamic(() => import("./Builder"), { ssr: false });
> ```

### Vanilla JS (any framework)

```html
<div id="editor" style="height: 100vh"></div>
<script type="module">
  import PageHub from "@pagehub/sdk";
  import "@pagehub/sdk/editor.css";

  const editor = PageHub.init({
    container: "#editor",
    callbacks: {
      onLoad: async () => {
        const res = await fetch("/api/pages/home");
        return res.ok ? res.json() : null; // null = blank canvas
      },
      onSave: async pageData => {
        await fetch("/api/pages/home", {
          method: "PUT",
          body: JSON.stringify(pageData),
        });
      },
    },
  });
</script>
```

---

## Configuration

### `resolveConfig(config)`

| Option       | Type                    | Default                     | Description                                             |
| ------------ | ----------------------- | --------------------------- | ------------------------------------------------------- |
| `container`  | `string \| HTMLElement` | —                           | DOM selector or element to mount into (vanilla JS only) |
| `apiKey`     | `string`                | —                           | PageHub Cloud API key (optional for self-hosted)        |
| `apiBaseUrl` | `string`                | `"https://pagehub.dev/api"` | API base URL (override for self-hosted)                 |
| `pageId`     | `string`                | —                           | Initial page ID to load                                 |
| `readOnly`   | `boolean`               | `false`                     | Start in viewer mode                                    |
| `callbacks`  | `PageHubCallbacks`      | _required_                  | Your integration hooks (see below)                      |
| `theme`      | `PageHubTheme`          | —                           | Visual theming                                          |
| `features`   | `PageHubFeatures`       | —                           | Feature toggles                                         |
| `ai`         | `PageHubAIConfig`       | —                           | AI generation config                                    |
| `locale`     | `PageHubLocale`         | —                           | Localization overrides                                  |

### Callbacks

The two required callbacks are how you connect PageHub to your backend:

```ts
callbacks: {
  onLoad: (pageId?) => Promise<PageData | null>,  // fetch page — return null for blank canvas
  onSave: (pageData, meta?) => Promise<void>,      // persist page

  // Optional
  onChange: (pageData) => void,            // fires on every edit (debounced) — useful for autosave
  onPublish: (pageData) => Promise<void>,  // user clicked "Publish"
  onMediaUpload: (file) => Promise<string>,// upload a file, return the public URL
  onMediaDelete: (url) => Promise<void>,   // delete a previously uploaded file
}
```

The `pageData` object you receive on save:

```ts
{
  content: string;    // compressed editor state — store this to reload later
  html?: string;      // rendered static HTML — ready to publish
  classes?: string[];  // Tailwind classes used — for CSS purging/compilation
  title?: string;
  seo?: PageSeo;
}
```

### Theme

```ts
theme: {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  accentColor: "#06b6d4",
  colorScheme: "system",    // "light" | "dark" | "system"
  logo: "/your-logo.svg",   // shown in editor toolbar
  cssVariables: { ... },     // custom CSS vars (no -- prefix needed)
  customCSS: "...",           // raw CSS injected into the editor
}
```

### Features

Toggle editor capabilities on or off:

```ts
features: {
  sidebar: true,              // component panel
  toolbar: true,              // top toolbar
  aiGeneration: false,        // AI content generation (requires ai config)
  multiPage: true,            // multi-page site editing
  responsivePreview: true,    // device preview toggle
  seoPanel: true,             // SEO settings
  importExport: false,        // JSON import/export UI
  customCSS: false,           // CSS editor panel
  restrictedComponents: [],   // component names to hide from toolbox
}
```

### AI

```ts
ai: {
  enabled: true,             // requires a PageHub account
}
```

AI features (content generation, assistant) are powered by PageHub's API. Users can configure their own AI provider keys in their PageHub account settings.

---

## Instance API

`PageHub.init()` returns an instance with these methods:

```ts
const editor = PageHub.init({ ... });

// Save & load
editor.save({ isDraft: true });
editor.load("page-id");
editor.getPageData();            // { content, html, classes, ... }

// HTML export
editor.getHTML();                // rendered HTML string
editor.exportHTML({              // full static HTML + metadata
  document: true,               // wrap in <html><head>...</head><body>
  title: "My Page",
  includeThemeVars: true,
});

// JSON import/export
editor.exportJSON();             // raw CraftJS JSON string
editor.importJSON(jsonString);   // load from JSON

// Runtime updates
editor.setReadOnly(true);        // toggle viewer mode
editor.setTheme({ primaryColor: "#e11d48" });
editor.setFeatures({ sidebar: false });

// Events
const off = editor.on("save", (data) => console.log("Saved!", data));
off(); // unsubscribe

// Cleanup
editor.destroy();
```

### Events

| Event               | Payload                | When                             |
| ------------------- | ---------------------- | -------------------------------- |
| `ready`             | —                      | Editor mounted and ready         |
| `save`              | `PageData`             | User or programmatic save        |
| `load`              | `PageData`             | Page loaded                      |
| `change`            | `PageData`             | Editor state changed (debounced) |
| `publish`           | `PageData`             | User published                   |
| `error`             | `Error`                | Something went wrong             |
| `modeChange`        | `"editor" \| "viewer"` | Read-only toggled                |
| `componentSelect`   | node info              | User selected a component        |
| `componentDeselect` | —                      | Selection cleared                |

---

## Viewer

Display saved pages in read-only mode — no editor UI, smaller bundle:

```tsx
import { PageHubViewer } from "@pagehub/sdk/viewer";

<PageHubViewer content={savedContent} resolver={resolver} />;
```

> The viewer injects Tailwind CSS at runtime — no stylesheet import needed.

---

## Static HTML Renderer

Render pages to HTML on the server — no React, no browser required. Works in Node, edge workers, or build scripts:

```ts
import { renderToHTML } from "@pagehub/sdk/static-renderer";

// From compressed content (what onSave gives you)
const { html, classes, fontUrls } = renderToHTML(savedContent);

// From raw JSON
const { html } = renderToHTML(jsonString, { compressed: false });

// Full standalone document
const { html } = renderToHTML(savedContent, {
  document: true,
  title: "My Page",
});
```

---

## Built-in Components

The SDK ships with these drag-and-drop components out of the box:

| Component        | Description                               |
| ---------------- | ----------------------------------------- |
| `Container`      | Flex/grid layout wrapper                  |
| `ContainerGroup` | Grouped layout sections                   |
| `Header`         | Page header with nav                      |
| `Nav`            | Navigation menu                           |
| `Footer`         | Page footer                               |
| `Text`           | Rich text with inline editing             |
| `Image`          | Responsive images                         |
| `ImageList`      | Image gallery / grid                      |
| `Button`         | CTA button with variants                  |
| `ButtonList`     | Button group                              |
| `Video`          | Video embed (YouTube, Vimeo, self-hosted) |
| `Audio`          | Audio player                              |
| `Embed`          | Raw HTML / iframe embed                   |
| `Form`           | Form container                            |
| `FormElement`    | Input, select, textarea, etc.             |
| `Divider`        | Horizontal rule                           |
| `Spacer`         | Vertical spacing                          |
| `Background`     | Full-bleed background section             |

### Custom Components

Pass additional components via the `resolver`:

```tsx
<PageHubEditor resolver={{ ...defaultComponents, MyWidget }} />
```

Or in vanilla JS:

```ts
PageHub.init({
  resolver: { MyWidget },
  // ...
});
```

---

## CSS

Import the editor stylesheet in your app:

```ts
import "@pagehub/sdk/editor.css";
```

Vite bundles `src/editor.css` into **`dist/editor.css`** (same public path: `@pagehub/sdk/editor.css`). Source is split under `src/editor-partials/*.css` for maintainability; the entry file only wires Tailwind (`@import 'tailwindcss'`), `@reference` / `@source`, and an `@import` chain.

**Scoping:** Almost all editor chrome rules are prefixed with **`.pagehub-sdk-root`** so generic selectors (`button`, `.input`, `#viewport`, `[data-enabled]`, scrollbars, etc.) do not hit the host page when the builder is embedded. **`ph-anim-*` / `ph-hover-*` / `css-*` keyframes** stay global so saved page content and static export still work. Mobile preview toggles **`mobile-preview`** on `.pagehub-sdk-root` (not `<html>`). Portaled listboxes set **`pagehub-sdk-root ph-select-content`** on the panel so dropdown styles apply after teleport.

### Theming (variables first)

- Prefer **theme tokens** from your host: load shared design CSS (for PageHub apps this is your design system CSS) so `--base-100`, `--primary`, `--border`, etc. match the editor chrome.
- **`config.theme.cssVariables`** and **`config.theme.customCSS`** still apply on top for integration-specific overrides.
- **`@tailwindcss/browser`** (used for in-canvas utilities) compiles from live class attributes; `@source` in `editor.css` scans SDK sources (`./`).

### Editor CSS partials (concern → file)

Partials that use `@apply` / `@utility` rely on **`editor-partials/tailwind-theme-reference.css`**, imported immediately after `tailwindcss` in `editor.css`. `@reference` URLs are resolved from **`packages/sdk/src/`** (same as the old monolithic `editor.css`), not from the partial file path. Add new `@import` lines only at the top of `editor.css` (PostCSS requires every `@import` before `@source` / other at-rules).

| Concern                                                           | File                                           |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| Tailwind theme `@reference` (single, paths from `src/`)           | `editor-partials/tailwind-theme-reference.css` |
| Scoped `.btn` / `.input-hover` (not `@utility`)                   | `editor-partials/utilities.css`                |
| Google icons + mobile preview overrides                           | `editor-partials/icons-and-mobile-preview.css` |
| Canvas selection, drag/drop, `#viewport` handles                  | `editor-partials/canvas-interaction.css`       |
| Shell typography on `.pagehub-sdk-root`, scrollbars, range thumbs | `editor-partials/base-and-scrollbars.css`      |
| `#viewport` / `[data-renderer]` containment                       | `editor-partials/viewport-layout.css`          |
| Toolbar inputs, buttons, sliders                                  | `editor-partials/toolbar-forms.css`            |
| Third-party (e.g. Sketch color picker)                            | `editor-partials/third-party.css`              |
| HeadlessUI listbox (`ph-select-*`)                                | `editor-partials/dropdowns.css`                |
| Scroll/hover presets + `css-*` keyframes                          | `editor-partials/animations.css`               |

### Naming contract (integrators & contributors)

- **`pagehub-*`** — Editor shell surface (e.g. `pagehub-sdk-root`). Prefer this prefix for new chrome-only classes.
- **`ph-*`** — Supported shorthand today for dropdowns and motion utilities: `ph-select-*`, `ph-anim-scroll`, `ph-hover-*`, plus `ph-in-view` for scroll-triggered play state. External CSS that targets these may break if we rename them; a future `pagehub-*` migration would be one coordinated release with a changelog note.
- **`data-*` on canvas nodes** — Treat as **stable DOM protocol** (persisted / editor behaviour). Do not rename without a data migration story.

### Dual CSS in this repo

- **`@pagehub/sdk/editor.css`** (SDK dist) — Full editor + Tailwind scan + chrome. Use when embedding the SDK.
- **`styles/editor.css`** (Next app) — App-specific globals that overlap conceptually but are **not** the same artifact; keep SDK changes in `packages/sdk/src/editor.css` and `packages/sdk/src/editor-partials/`.

---

## PageHub Cloud Features

Some editor features require a [PageHub](https://pagehub.dev) account or self-hosted backend:

| Feature                      | Requires Backend | Notes                                                         |
| ---------------------------- | ---------------- | ------------------------------------------------------------- |
| Drag-and-drop editor         | No               | Works standalone                                              |
| Viewer / static renderer     | No               | Works standalone                                              |
| AI content generation        | Yes              | Enable with `ai: { enabled: true }`, requires PageHub account |
| Image uploads                | Yes              | Provide `onMediaUpload` callback or use PageHub CDN           |
| Domain settings              | Yes              | Requires PageHub Cloud                                        |
| Multi-tenant / user profiles | Yes              | Requires PageHub Cloud                                        |

The core editor and viewer work fully offline with just the `onLoad`/`onSave` callbacks.

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/pagehub-dev/sdk).

## License

[MIT](./LICENSE)
