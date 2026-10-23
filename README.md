# @pagehub/sdk

PageHub's shared UI chrome and site utilities. The PageHub app (a site is HTML + Liquid files, edited by `@pagehub/editor`) consumes it as source; this package has no editor, no component tree and no renderer.

## What is in it

| Area | Where | What |
|---|---|---|
| Dialogs | `src/chrome/floating/Modal.tsx`, `src/chrome/primitives/layout/{ConfirmDialog,useConfirm}.tsx` | The one modal shell and the promise-based confirm (`await ask({...})`). |
| Popovers, scrollbars, markdown | `src/chrome/popovers/*`, `src/chrome/primitives/layout/AutoHideScrollbar.tsx`, `src/chrome/shell/MarkdownText.tsx` | Anchored popover hooks, overlay z-index scale, the auto-hiding scrollbar. |
| Media library UI | `src/utils/media/*`, `src/chrome/toolbar/inputs/media/*` | Upload pipeline with a host-registered handler and library store; list, delete and upload helpers; the image crop dialog (`src/chrome/toolbar/dialogs/ImageCropModal.tsx`). |
| CSS compile | `@pagehub/sdk/compile-css` | `compileCSS({ classes, themeCSS, ... })`: Tailwind + DaisyUI for the classes a page uses. Server-side only. |
| Theme | `@pagehub/sdk/theme.css`, `@pagehub/sdk/themes/shadcn.css`, `src/utils/design/*` | Design tokens (generated from `tokenSource.ts`), palette and theme resolution, `designVarsFromTheme`. |
| Chrome CSS | `@pagehub/sdk/chrome.css` | Source stylesheet for the chrome above; import it after `tailwindcss` in the host's global CSS. |
| Icons | `src/utils/icons/*`, `src/data/icon-svgs/*` | `ref-icon:<set>/<Name>` resolution to inline SVG, and the generated registries. |
| Email helpers | `@pagehub/sdk/email-renderer` | `buildEmailCss` (compile classes to literal values an email client keeps), `htmlToText`, the shell. |
| Page settings fields | `@pagehub/sdk/page-settings/fields` | The page-settings field contract. |
| Utilities | `src/utils/*` | CDN URLs, page slugs, path patterns, SEO schema, language tags, safe HTML. |

## Use

This package is not published to npm yet. The PageHub monorepo consumes it from source (`exports` point at `src/`, and the app resolves `@pagehub/sdk/*` to `packages/sdk/src/*` through `tsconfig.json` paths), so the host transpiles it (`transpilePackages: ["@pagehub/sdk"]` in Next).

```tsx
import { Modal } from "@pagehub/sdk/chrome/floating/Modal";
import { useConfirm } from "@pagehub/sdk/chrome/primitives/layout/useConfirm";
```

```css
@import "tailwindcss";
@import "@pagehub/sdk/theme.css";
@import "@pagehub/sdk/chrome.css";
```

```ts
import { compileCSS } from "@pagehub/sdk/compile-css";

const css = await compileCSS({ classes, themeCSS });
```

Optional peers: the CodeMirror packages and `prettier` (code inputs), `@floating-ui/react-dom` (popovers). `tailwindcss` and `daisyui` are peers of the CSS compile.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
