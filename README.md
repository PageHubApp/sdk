# @pagehub/sdk

> Drop a full visual page builder into any web app.

A drag-and-drop page editor SDK built on [CraftJS](https://craft.js.org/). Includes a visual canvas, component toolbox, settings panels, responsive preview, multi-page support, AI generation, SEO controls, and static HTML export — all configured through a single config object.

## Install

`@pagehub/sdk` ships three sub-path entry points so you only pay for what you use:

| Use case | Import | Extras to install |
|---|---|---|
| **Editor** (drag-and-drop builder) | `@pagehub/sdk` | the editor-extras snippet below |
| **React viewer** (render a published site in a React app) | `@pagehub/sdk/react` | none (just React) |
| **Static HTML** (render to an HTML string in Workers / Deno / Bun / Node) | `@pagehub/sdk/html` | none |

### Viewer / static-only install

```bash
npm install @pagehub/sdk react react-dom
```

### Editor install (adds chrome deps as optional peers)

```bash
npm install @pagehub/sdk react react-dom \
  @tiptap/core @tiptap/pm @tiptap/react @tiptap/starter-kit \
  @tiptap/extension-bold @tiptap/extension-code @tiptap/extension-color \
  @tiptap/extension-document @tiptap/extension-font-family \
  @tiptap/extension-font-size@3.0.0-next.3 @tiptap/extension-highlight \
  @tiptap/extension-image @tiptap/extension-italic @tiptap/extension-link \
  @tiptap/extension-placeholder @tiptap/extension-strike \
  @tiptap/extension-subscript @tiptap/extension-superscript \
  @tiptap/extension-text-align @tiptap/extension-text-style \
  @tiptap/extension-underline \
  @codemirror/autocomplete @codemirror/lang-css @codemirror/lang-html \
  @codemirror/lang-javascript @codemirror/language @codemirror/lint \
  @codemirror/view @uiw/react-codemirror @lezer/highlight \
  @tailwindcss/browser @floating-ui/react-dom @headlessui/react \
  @hello-pangea/color-picker use-eye-dropper react-window swr \
  gsap framer-motion
```

### Component-level optional peers

Only install if your site actually uses these components:

```bash
# Map component
npm install leaflet react-leaflet

# Video component (YouTube provider)
npm install react-youtube
```

**Developing inside the monorepo:** see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions.

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

| Option       | Type                    | Default    | Description                                             |
| ------------ | ----------------------- | ---------- | ------------------------------------------------------- |
| `container`  | `string \| HTMLElement` | —          | DOM selector or element to mount into (vanilla JS only) |
| `apiKey`     | `string`                | —          | PageHub Cloud API key (optional for self-hosted)        |
| `apiBaseUrl` | `string`                | `""`       | API base URL (for AI, uploads, forms)                   |
| `pageId`     | `string`                | —          | Initial page ID to load                                 |
| `readOnly`   | `boolean`               | `false`    | Start in viewer mode                                    |
| `callbacks`  | `PageHubCallbacks`      | _required_ | Your integration hooks (see below)                      |
| `theme`      | `PageHubTheme`          | —          | Visual theming                                          |
| `features`   | `PageHubFeatures`       | —          | Feature toggles                                         |
| `ai`         | `PageHubAIConfig`       | —          | AI generation config                                    |
| `locale`     | `PageHubLocale`         | —          | Localization overrides                                  |

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

**Adopting host design tokens (shadcn / Tailwind v4):** if your app already defines a shadcn-style palette under `--color-*` vars, add one import to rebind PageHub's DaisyUI tokens to the host vars:

```ts
import "@pagehub/sdk/editor.css";
import "@pagehub/sdk/themes/shadcn.css";   // load AFTER editor.css
```

Maps `--color-background → --base-100`, `--color-foreground → --base-content`, `--color-primary → --primary`, `--radius → --radius-box/-field/-selector`, etc. Each binding falls back to the DaisyUI default if the host hasn't defined the matching shadcn var. See [docs/sdk/theme.md](../../docs/sdk/theme.md#adopting-host-design-tokens-shadcn--tailwind-v4) for the full mapping table.

### Features

Toggle editor capabilities on or off:

```ts
features: {
  sidebar: true,                  // component panel
  toolbar: true,                  // top toolbar
  saveButton: true,               // save/publish button in top toolbar
  aiGeneration: false,            // AI content generation (requires ai config)
  multiPage: true,                // multi-page site editing
  responsivePreview: true,        // device preview toggle
  seoPanel: true,                 // SEO settings
  importExport: true,             // Import/Export row in More menu
  settingsPanelSwitcher: true,    // "Left/Right Settings Panel" row in More menu
  darkModeSwitcher: true,         // "Switch to Dark/Light Theme" row in More menu
  customCSS: false,               // CSS editor panel
  restrictedComponents: [],       // component names to hide from toolbox
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

## Three runtimes — import only what you need

The SDK ships as three independent entry points. Pages built in the full editor render identically through all three:

| Entry                          | Use for                                          | Ships                                                                | Doesn't ship                                              |
| ------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------- |
| `@pagehub/sdk`                 | The visual editor                                | Full editor chrome, toolbox, inspector, TipTap, CodeMirror, GSAP    | —                                                         |
| `@pagehub/sdk/viewer`          | Live published pages (React)                     | React render runtime, theme + animation presets, action handlers     | Editor chrome, TipTap, CodeMirror, GSAP editor harness    |
| `@pagehub/sdk/static-renderer` | SSG / Node / edge / email HTML / build scripts   | Pure string-based HTML walker, theme CSS, class collector            | React, ReactDOM, any browser API                          |

Use the editor on `/edit/[id]`, the viewer on `/preview/[id]`, and the static renderer in `getStaticProps`, an edge function, or a Node export script. Mix and match — same `content` payload everywhere.

---

## Viewer — read-only React mode

Render saved pages with interactivity (forms, modals, scroll animations, conditional visibility) but without the editor:

```tsx
import { PageHubViewer } from "@pagehub/sdk/viewer";

<PageHubViewer content={savedContent} resolver={resolver} />;
```

- **No editor chrome.** Toolbox, inspector, settings panels, and the `pagehub-sdk-root` shell are all gone — just the page.
- **No heavy editor deps.** TipTap, CodeMirror, GSAP editor harness, and the prop-system UI are tree-shaken out.
- **Tailwind injected at runtime.** No stylesheet import needed; pass your own theme CSS via the host page if you want SSR-correct styling.
- **Same `content` payload.** Whatever `onSave` gave you is what the viewer reads — no transform step.

Good fit for: live published sites, preview routes, in-app page rendering, A/B test variants.

---

## Static HTML Renderer — no React, no browser

Render pages to a plain HTML string from anywhere a function can run — Node scripts, edge workers, `getStaticProps`, email-template pipelines, search-engine snapshots:

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

- **Zero React dependency.** Walks the node tree and emits strings directly — runs in Cloudflare Workers, Deno, Bun, and Node without polyfills.
- **Returns everything you need to ship.** `html` for the body, `classes` for Tailwind compilation/purging, `fontUrls` for `<link>` tags.
- **Identical output to the viewer.** Same theme, same component registry, same action wiring — interactive scripts are inlined into the HTML where needed.
- **`document: true`** wraps the output in a full `<html><head>...</head><body>` document, ready to write to disk or pipe into an email.

Good fit for: SSG (Next.js / Astro / 11ty), `next export`, on-publish HTML uploads to a CDN, email rendering, search-engine prerender, static site exports for hosting elsewhere.

> **Note on `Container.overflow.*`** — when a container uses `overflow.dragScroll`, `overflow.autoHide`, `overflow.wheelHorizontal`, `overflow.smoothing`, or `overflow.hideDelay`, both the viewer and `renderToHTML` add `overflow-x-auto` to `className` (unless another `overflow-x-*` utility is already set) and inline a small script that enables pointer-drag and wheel-to-horizontal scrolling. These are CSS overflow UX options, not the GSAP `scrollEffect` (`horizontal-scroll` / `scroll-timeline`).

---

## Built-in Components

The SDK ships with these drag-and-drop components out of the box:

| Component        | Description                               |
| ---------------- | ----------------------------------------- |
| `Container`      | Flex/grid layout wrapper                  |
| `Header`         | Page header with nav                      |
| `Footer`         | Page footer                               |
| `Text`           | Rich text with inline editing             |
| `Image`          | Responsive images                         |
| `Button`         | CTA button with variants                  |
| `Video`          | Video embed (YouTube, Vimeo, self-hosted) |
| `Audio`          | Audio player                              |
| `Embed`          | Raw HTML / iframe embed                   |
| `Form`           | Form container                            |
| `FormElement`    | Input, select, textarea, etc.             |
| `Background`     | Full-bleed background section             |

### Custom Components

Register your own draggable component with [`defineComponent`](../../docs/sdk/registration-host.md). One file, one function call, no SDK fork — the same `components` array is read by the editor, viewer, and static renderer.

```tsx
import { PageHubEditor, defineComponent } from "@pagehub/sdk";

const PricingCard = ({ title, price, period }) => (
  <div className="rounded-box border p-6">
    <h3>{title}</h3>
    <p>${price}/{period}</p>
  </div>
);

const PricingCardDef = defineComponent({
  name: "PricingCard",
  category: "Marketing",
  component: PricingCard,
  defaultProps: { title: "Pro", price: 29, period: "mo" },
  props: {
    title: { type: "text", label: "Plan Name" },
    price: { type: "number", label: "Price", min: 0 },
    period: { type: "select", label: "Period", options: [
      { label: "Month", value: "mo" },
      { label: "Year", value: "yr" },
    ]},
  },
  toHTML: ({ props }) =>
    `<div class="rounded-box border p-6"><h3>${props.title}</h3><p>$${props.price}/${props.period}</p></div>`,
});

<PageHubEditor
  components={[PricingCardDef]}
  callbacks={{ onLoad, onSave }}
/>;
```

Vanilla JS is the same — pass `components: [PricingCardDef]` into `PageHub.init()`.

**Working starter:** [`examples/hello-component/`](./examples/hello-component) — copy/paste to get a custom component running in a few minutes.

**Full reference:** [`docs/sdk/registration-host.md`](../../docs/sdk/registration-host.md) — every field on `defineComponent`, custom inspector UIs, `toHTML` rules, viewer/static parity, common gotchas.

> If you're modifying the SDK itself to add a new **built-in** (alongside Container / Text / Button), the surface is different — 8 registrations inside `packages/sdk`. See [`docs/sdk/registration.md`](../../docs/sdk/registration.md). Host-app custom components do **not** need that checklist.

---

## CSS

Import the editor stylesheet in your app:

```ts
import "@pagehub/sdk/editor.css";
```

Vite bundles `src/css/editor.css` into **`dist/editor.css`** (same public path: `@pagehub/sdk/editor.css`). Source is split under `src/css/editor-partials/*.css` for maintainability; the entry file only wires Tailwind (`@import 'tailwindcss'`), `@reference` / `@source`, and an `@import` chain.

**Scoping:** Almost all editor chrome rules are prefixed with **`.pagehub-sdk-root`** so generic selectors (`button`, `.input`, `#viewport`, `[data-enabled]`, scrollbars, etc.) do not hit the host page when the builder is embedded. **`ph-anim-*` / `ph-hover-*` / `css-*` keyframes** stay global so saved page content and static export still work. Mobile preview toggles **`mobile-preview`** on `.pagehub-sdk-root` (not `<html>`). Portaled listboxes set **`pagehub-sdk-root ph-select-content`** on the panel so dropdown styles apply after teleport.

### Theming (variables first)

- Prefer **theme tokens** from your host: load shared design CSS (for PageHub apps this is your design system CSS) so `--base-100`, `--primary`, `--border`, etc. match the editor chrome.
- **`config.theme.cssVariables`** and **`config.theme.customCSS`** still apply on top for integration-specific overrides.
- **`@tailwindcss/browser`** (used for in-canvas utilities) compiles from live class attributes; `@source` in `editor.css` scans SDK sources (`../`).

### Editor CSS partials (concern → file)

Partials that use `@apply` / `@utility` rely on **`css/editor-partials/tailwind-theme-reference.css`**, imported immediately after `tailwindcss` in `editor.css`. `@reference` URLs are resolved from **`packages/sdk/src/css/`**, not from the partial file path. Add new `@import` lines only at the top of `editor.css` (PostCSS requires every `@import` before `@source` / other at-rules).

| Concern                                                           | File                                               |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| Tailwind theme `@reference` (single, paths from `src/css/`)       | `css/editor-partials/tailwind-theme-reference.css` |
| Scoped `.btn` / `.input-hover` (not `@utility`)                   | `css/editor-partials/utilities.css`                |
| Google icons + mobile preview overrides                           | `css/editor-partials/icons-and-mobile-preview.css` |
| Canvas selection, drag/drop, `#viewport` handles                  | `css/editor-partials/canvas-interaction.css`       |
| Shell typography on `.pagehub-sdk-root`, scrollbars, range thumbs | `css/editor-partials/base-and-scrollbars.css`      |
| `#viewport` / `[data-renderer]` containment                       | `css/editor-partials/viewport-layout.css`          |
| Toolbar inputs, buttons, sliders                                  | `css/editor-partials/toolbar-forms.css`            |
| Third-party (e.g. Sketch color picker)                            | `css/editor-partials/third-party.css`              |
| HeadlessUI listbox (`ph-select-*`)                                | `css/editor-partials/dropdowns.css`                |
| Scroll/hover presets + `css-*` keyframes                          | `css/styles.css` (animation presets section)       |
| Sequential spotlight presets (chain/grid)                         | `css/styles.css` (spotlight presets section)       |

### Naming contract (integrators & contributors)

- **`pagehub-*`** — Editor shell surface (e.g. `pagehub-sdk-root`). Prefer this prefix for new chrome-only classes.
- **`ph-*`** — Supported shorthand today for dropdowns and motion utilities: `ph-select-*`, `ph-anim-scroll`, `ph-hover-*`, plus `ph-in-view` for scroll-triggered play state. External CSS that targets these may break if we rename them; a future `pagehub-*` migration would be one coordinated release with a changelog note.
- **`data-*` on canvas nodes** — Treat as **stable DOM protocol** (persisted / editor behaviour). Do not rename without a data migration story.

### Dual CSS in this repo

- **`@pagehub/sdk/editor.css`** (SDK dist) — Full editor + Tailwind scan + chrome. Use when embedding the SDK.
- **`styles/editor.css`** (Next app) — App-specific globals that overlap conceptually but are **not** the same artifact; keep SDK changes in `packages/sdk/src/css/editor.css` and `packages/sdk/src/css/editor-partials/`.

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

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, architecture, and PR guidelines.

## License

[MIT](./LICENSE)
