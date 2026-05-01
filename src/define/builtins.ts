import { viewerResolver } from "../components/resolvers/viewer";

/** Built-in component names — derived from `viewerResolver` (single source of truth). Used for collision detection in `defineComponent`. */
export const BUILT_IN_NAMES = new Set(Object.keys(viewerResolver));
