/**
 * Built-in canvas components — single source of truth for:
 * - CraftJS resolver (React implementations)
 * - defineComponent() definitions live in {@link ./builtinComponentDefs.ts} (editor toolbox, static HTML, viewer)
 *
 * Consumers: {@link ./index.ts}, {@link ./editor.tsx}, {@link ./viewer.tsx}, {@link ./static-renderer.ts}
 */

import type { ComponentType } from "react";

import { viewerResolver } from "../components/resolvers/viewer";
import { SavedComponentLoader } from "./savedComponents";

export { BUILTIN_COMPONENT_DEFS } from "./builtinComponentDefs";
export { getBuiltinComponentDef } from "./builtinDefsLookup";

/** Craft / viewer resolver: `resolvedName` from serialized nodes → React component. */
export type BuiltInCraftResolver = Record<string, ComponentType<any>>;

/**
 * Editor resolver = viewer resolver + editor-only entries.
 * `viewerResolver` is the single source of truth for the component list;
 * adding a new component only requires touching `components/resolvers/viewer.ts`.
 */
export const DEFAULT_CRAFT_RESOLVER: BuiltInCraftResolver = {
  ...viewerResolver,
  SavedComponentLoader,
};

export {
  getSpatialMainAxisForComponentName,
  getSuppressCrossAxisAlignForComponentName,
} from "./builtinDefsLookup";
