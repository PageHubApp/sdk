# hello-component — minimal custom component

The smallest possible end-to-end example of adding your own draggable component to `<PageHubEditor>` via [`defineComponent`](../../../../docs/sdk/registration-host.md).

Three files. Copy them into your own host app — adjust the import paths and you have a working `PricingCard` in the editor's toolbox under the **Marketing** category.

## Files

| File                                       | Role                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [`PricingCard.tsx`](./PricingCard.tsx)     | Plain React component. No PageHub imports. Same code renders in editor + viewer + static. |
| [`PricingCardDef.tsx`](./PricingCardDef.tsx) | The `defineComponent({...})` call — declares name, defaults, inspector schema, `toHTML`. |
| [`Builder.tsx`](./Builder.tsx)             | Host wiring — `<PageHubEditor components={[PricingCardDef]} ... />`.                     |

The **same** `components` array goes into `<PageHubViewer>` and `renderToHTML()` — define once, render everywhere. See [registration-host.md → Viewer / static renderer](../../../../docs/sdk/registration-host.md#viewer--static-renderer).

## How it works

1. `defineComponent(...)` returns a frozen def with a `toHTML` fallback baked in.
2. You pass an array of defs into `PageHubConfig.components`.
3. The SDK merges them with the built-in catalog. They appear in the toolbox under whatever `category` you set (default: `"Custom"`).
4. The auto-generated inspector renders inputs from the `props` schema. For richer inputs (custom React widgets, conditional fields) you can pass `settings` instead — see [registration-host.md → Custom inspector UIs](../../../../docs/sdk/registration-host.md#custom-inspector-uis).
5. The `toHTML` serializer powers the static renderer, the viewer's SSR pass, and `editor.exportHTML()`.

## What this example does NOT cover

- **Adding a new built-in to the SDK itself** — that requires touching 8 files inside `packages/sdk` and is a different surface. See [`docs/sdk/registration.md`](../../../../docs/sdk/registration.md). You almost certainly don't need this — `defineComponent` covers the same use cases without forking.
- **Components that hold child nodes** — set `canvas: true` on the def. See the field table in `registration-host.md`.
- **Custom inspector React panels** — pass `settings: MyPanel` instead of `props`.
- **Inspector property registries** that span multiple components (e.g. an "Analytics" section that shows on every Button + Link) — see [`extensibility.md` → `registerProperties`](../../../../docs/sdk/extensibility.md#registerproperties--registersectiondef).

## Naming

`defineComponent` throws at register time if `name` collides with a built-in (`Container`, `Text`, `Button`, etc.). Pick a host-specific prefix if you're unsure (`MyApp_Card`, `Acme_Pricing`).
