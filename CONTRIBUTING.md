# Contributing to @pagehub/sdk

## Prerequisites

- Node.js 18+
- pnpm 9+

## Setup

```bash
# Clone the repo
git clone https://github.com/pagehub-dev/sdk.git
cd sdk

# Install dependencies (always from repo root)
pnpm install

# Build the SDK
cd packages/sdk
pnpm run build

# Run type checking
pnpm run typecheck

# Start the demo
pnpm run start:demo
```

## Project Structure

```
packages/sdk/src/
  index.ts              # Public API — PageHub.init(), React components, types
  editor.tsx            # Main editor React component
  viewer.tsx            # Read-only viewer component
  static-renderer.ts   # Server-side HTML renderer (no React/DOM)
  define.ts             # defineComponent() — custom component registration
  config.ts             # Config resolution and defaults
  types.ts              # Public TypeScript types
  store.tsx             # Zedux state store
  events.ts             # Event emitter

  components/           # Built-in drag-and-drop components
    Button.tsx          # Runtime component
    Button.craft.tsx    # CraftJS editor definition (props schema, defaults, rules)
    ...

  chrome/               # Editor UI (toolbar, viewport, panels)
    Toolbar/            # Settings sidebar, inputs, tools
    Viewport/           # Canvas, design system editor, page management
    canvas/             # Selection, dragging, resizing overlays
    shared/             # Shared UI (Tooltip, AutoHideScrollbar, etc.)

  utils/                # Utilities
    design/             # Color system, palette, theme resolution
    tailwind/           # Tailwind class parsing, merging, style maps
    fonts/              # Google Fonts loader
    animations/         # CSS animation presets
    hooks/              # Custom React hooks
    data/               # Static data (icon registry, etc.)
```

## Import Convention

All internal SDK imports use the `@/` alias, which maps to `src/`:

```ts
// Good
import { resolveTheme } from "@/utils/design/resolveTheme";
import { Tooltip } from "@/chrome/primitives/layout/Tooltip";

// Bad — relative paths with 3+ levels
import { resolveTheme } from "../../../../utils/design/resolveTheme";

// Bad — bare aliases (only work in monorepo)
import { resolveTheme } from "utils/design/resolveTheme";
```

Close siblings (1-2 levels) can use relative imports:

```ts
// Fine — same directory or one level up
import { useView } from "./hooks/useView";
import { BaseSelectorProps } from "../selectors";
```

## Component Architecture

Each built-in component has two files:

- **`Component.tsx`** — Runtime React component (used by editor, viewer, and static renderer)
- **`Component.craft.tsx`** — CraftJS definition (props schema, defaults, editor rules, inline tools)

Both are registered via `defineComponent()` in `builtins.ts`.

## Code Quality

- **No `@ts-ignore`** — fix the actual type issue
- **No `as any`** in new code — type it properly
- **600 LOC hard cap** — split large files into hooks, sub-components, or utils
- **Search before creating** — check existing utils/hooks before writing new ones

## Building

```bash
# Full build (ES + UMD + CSS + viewer + demo)
pnpm run build

# Watch mode (UMD only, fast iteration)
pnpm run dev

# Type check only
pnpm run typecheck
```

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Run `pnpm run typecheck` — must pass with zero errors
3. Keep PRs focused — one feature or fix per PR
4. Describe what changed and why in the PR description

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
