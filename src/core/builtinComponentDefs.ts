/**
 * Built-in `defineComponent` definitions only (no Craft resolver / React implementations).
 * Safe for Node-side consumers that need metadata (e.g. clone registry generator) without loading
 * `DEFAULT_CRAFT_RESOLVER` or `SavedComponentLoader`.
 *
 * Keep order in sync with editor toolbox expectations; see {@link ./componentRegistry.ts}.
 */

import {
  AudioDef,
  AutomaticDef,
  BackgroundDef,
  ButtonDef,
  ConditionalContainerDef,
  ContainerDef,
  ContainerGroupDef,
  EmbedDef,
  FormDef,
  FormElementDef,
  GridDef,
  IconDef,
  ImageDef,
  LinkDef,
  ListDef,
  ListItemDef,
  MapDef,
  MapPointDef,
  TableDef,
  TableSectionDef,
  TableRowDef,
  TableCellDef,
  TextDef,
  VideoDef,
} from "../components/definitions";

import type { ResolvedComponentDef } from "../define";
import { setSanitizeBuiltinDefs } from "../utils/sanitizeNodeMap";

/** Built-in `defineComponent` definitions, in toolbox / static-render order. */
export const BUILTIN_COMPONENT_DEFS: ResolvedComponentDef[] = [
  AutomaticDef,
  ContainerDef,
  ConditionalContainerDef,
  ContainerGroupDef,
  GridDef,
  BackgroundDef,
  TextDef,
  ImageDef,
  IconDef,
  ButtonDef,
  LinkDef,
  ListDef,
  ListItemDef,
  TableDef,
  TableSectionDef,
  TableRowDef,
  TableCellDef,
  FormDef,
  FormElementDef,
  VideoDef,
  AudioDef,
  EmbedDef,
  MapDef,
  MapPointDef,
];

/** Lookup built-in `defineComponent` descriptor by PascalCase name (e.g. `"Button"`). */
export function getBuiltinComponentDef(name: string): ResolvedComponentDef | undefined {
  if (!name) return undefined;
  return BUILTIN_COMPONENT_DEFS.find(d => d.name === name);
}

// Register defs with sanitizeNodeMap so modifier expansion has access to them
// without sanitizeNodeMap importing this file (which would re-form the cycle).
setSanitizeBuiltinDefs(BUILTIN_COMPONENT_DEFS);
