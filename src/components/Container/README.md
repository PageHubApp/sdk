# Container

> ⚠️ **Do not use this directory as a starter for your own component.** Container is the SDK's most foundational layout primitive — almost every other component composes it, and it carries a long tail of editor-only chrome (drag scroll, overflow UX, isolation, computed-state bindings, viewport-aware presets). Forking it into "MyContainer" pulls ~40 internal modules with it.
>
> If you want to add a custom component to your host app, use [`defineComponent`](../../../../../docs/sdk/registration-host.md) instead. Working starter: [`packages/sdk/examples/hello-component/`](../../../examples/hello-component).

---

## What lives here

Container is split across ~12 files because it plays four roles at once: the editor canvas item (with drag/drop, overlays, settings panels), the viewer runtime (with show-hide, state modifiers, animations), the static HTML renderer, and the toolbox preset catalog. Each file owns one role.

| File                                         | Role                                                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Container.tsx`                              | Editor entry point. `useContainerRender` builds a `RenderCtx` from CraftJS `useNode` / `useEditor` and delegates to the shared body.                       |
| `Container.body.tsx`                         | **Shared render core.** Pure body — no `@craftjs/core` imports. Used by both editor and viewer paths. Owns ref wiring, event composition, child rendering. |
| `Container.viewerBody.tsx`                   | Viewer entry point. Same body, but skips editor-only chrome (selection, dropzones, settings overlays).                                                     |
| `Container.craft.tsx`                        | `defineComponent({...})` call — name, rules, settings tabs, toolbar layout, default props. The piece you'd write for a host-app component.                 |
| `Container.render.tsx`                       | Thin wrapper used by some preset trees so children can render via `<Container.Render />` without re-entering the Craft node.                               |
| `Container.modifiers.ts`                     | Inspector modifier chips (intent / size / layout). Registered via `registerModifiers("Container", …)`.                                                     |
| `Container.presets.tsx`                      | Toolbox presets ("Hero", "Card", "Section", nav patterns, etc.) — registered via `registerPresets("Container", …)`.                                        |
| `containerPropHelpers.ts`                    | Pure prop-shape helpers (default-prop merging, normalization). Importable from anywhere — no editor deps.                                                  |
| `toHTML.ts`                                  | Static-renderer serializer. Plain Node — no React, no browser. Produces the same DOM the React paths produce.                                              |
| `useContainerScrollEffect.tsx`               | Implements `props.scrollEffect` (`horizontal-scroll`, `scroll-timeline`) via GSAP / IntersectionObserver.                                                   |
| `applyContainerOverflowUX.tsx`               | Implements `props.overflow.*` (drag scroll, wheel-horizontal, auto-hide scrollbars) without GSAP.                                                          |
| `HorizontalOverflowThumbOverlay.tsx`         | Visual thumb overlay shown when overflow auto-hide is active.                                                                                              |

## Adding a feature to Container itself (SDK contributors)

1. Decide whether the feature affects the **shared render core** (touch `Container.body.tsx`) or only one runtime (editor → `Container.tsx`, viewer → `Container.viewerBody.tsx`). If it crosses both, the body is the canonical place.
2. Static export must match — update `toHTML.ts` in the same change. The walker-level rule in [CLAUDE.md](../../../../../CLAUDE.md) applies: features that show up in React paths but not in `toHTML` silently break static-published sites.
3. Inspector inputs are registered through the property registry — see [`docs/sdk/sidebar-property-registry.md`](../../../../../../docs/sdk/sidebar-property-registry.md), not by hand-editing settings panels.
4. Presets and modifiers are catalog entries — add them to `Container.presets.tsx` / `Container.modifiers.ts`. Don't fork the component to ship a styled variant.

## Why this is not a good copy-paste starter

- Imports `useSDKSafe`, `useIsolate`, `usePreview`, `ViewModeAtom`, `applyShowHideOverride`, `applyStateModifiers`, `applyComputedStateBindings`, `motionIt`, `useHorizontalDragScroll`, `RenderCtx`, etc. — each one couples to a different SDK subsystem.
- `Container.craft.tsx` passes `{ __internal: true }` to `defineComponent`, which skips the built-in-name collision check. Host-app components must NOT do this.
- Container is responsible for resolving `props.type` (`"page"` / `"section"` / `"header"` / `"footer"` / `"container"`) into structural roles other parts of the SDK key on. A fork would either re-implement this or break those consumers.

For 95% of host use cases, `defineComponent` with a plain React component is what you actually want.
