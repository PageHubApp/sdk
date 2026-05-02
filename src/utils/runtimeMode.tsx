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
