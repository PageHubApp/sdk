# Contributing to @pagehub/sdk

## Prerequisites

- Node.js 20.16+
- pnpm 9+

## Setup

The SDK lives in the PageHub monorepo as a git submodule (`packages/sdk`). Install from the monorepo root, never from this folder:

```bash
pnpm install
pnpm typecheck -- -p packages/sdk   # from the monorepo root
```

## Build (the npm tarball)

The monorepo uses `src/` directly. The published package is built by `scripts/build.mjs` into `dist/` (JS, `.d.ts`, CSS, icon registries) and `publishConfig.exports` points the tarball at it. From `packages/sdk` after `pnpm gen:icons` at the root:

```bash
pnpm pack --pack-destination /tmp/out   # runs the build via prepack
```

Each module compiles to its own file at the same path, so the `__dirname`-relative reads in `compile-css/` keep working. The build fails if `dist` imports an npm package that is not in `dependencies` or `peerDependencies`. When you add a `exports` entry, add its `dist` twin under `publishConfig.exports`.

## Project Structure

```
packages/sdk/src/
  chrome/               # Dashboard chrome
    floating/           # Modal, modal presence
    popovers/           # anchored popover hooks, overlay z-index scale
    primitives/layout/  # ConfirmDialog, useConfirm, AutoHideScrollbar, tooltip surface
    shell/              # MarkdownText
    toolbar/            # image crop dialog, media list / delete / upload helpers, code inputs
  compile-css/          # Server-side Tailwind + DaisyUI compile
  css/                  # theme.css, styles.css, chrome.css (+ chrome/ partials), themes/
  data/                 # generated icon registries, animation presets
  page-settings/        # page-settings field contract
  render/email/         # email CSS, text and shell helpers
  utils/                # design tokens and theme, icons, media, cdn, page slug, seo, state
```

## Import Convention

Internal SDK imports use the `@/` alias (`src/`) or short relative paths:

```ts
import { resolveTheme } from "@/utils/design/resolveTheme";
import { useScrollLock } from "../../utils/hooks/useScrollLock";
```

## Code Quality

- **No `@ts-ignore`**: fix the actual type issue.
- **No `as any`** in new code: type it properly.
- **600 LOC hard cap**: split large files into hooks, sub-components, or utils.
- **Search before creating**: check existing utils and hooks before writing new ones.
- No `@craftjs` import: nothing in the SDK may depend on a node-tree editor.

## Generated files (do NOT hand-edit)

| File | Generator | Regen / Verify |
| --- | --- | --- |
| `src/data/icon-svgs/*.json`, `src/data/icon-manifests/*.json` | `scripts/generate-react-icons-svg-registry.mjs` | `pnpm gen:icons` |
| `src/css/theme.css` | `scripts/generate-theme-css.mjs` | `pnpm gen:tokens` / `pnpm verify:tokens` |

Run these from the monorepo root.

## Pull Requests

1. Fork the repo and create a branch from `main`.
2. Run the typecheck: it must pass with zero errors.
3. Keep PRs focused: one feature or fix per PR.
4. Describe what changed and why in the PR description.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
