import { createContext, useContext } from "react";

/**
 * Set when rendering through the walker (`<RenderTree>` from
 * `packages/sdk/src/render/`). Components and hooks check this to skip
 * Craft-only paths and read from walker contexts instead.
 *
 * Lives in `utils/` so both `render/*` files AND `utils/*` hooks
 * (e.g. `useDataSource`) can import it without creating a render→utils
 * circular dep.
 */
const InWalkerContext = createContext<boolean>(false);

export const InWalkerProvider = InWalkerContext.Provider;

export function useInWalker(): boolean {
  return useContext(InWalkerContext);
}

/**
 * Set by editor panels that mount a nested read-only `<Editor enabled={false}>`
 * — the side-by-side mirror, the preview panel and the component preview.
 * Those renders take the published code path but run on the host app's origin,
 * signed in as the editing user, so the site's markup is rendered inert there:
 * rich text and SVG through `editorSafeHtml`, embeds in a sandboxed frame,
 * `props.handlers` not compiled, and `inject` limited to styles. The published
 * viewer (`/view`, static export, customer domains) never sets it.
 */
const UntrustedRenderContext = createContext<boolean>(false);

export const UntrustedRenderProvider = UntrustedRenderContext.Provider;

export function useUntrustedRender(): boolean {
  return useContext(UntrustedRenderContext);
}
