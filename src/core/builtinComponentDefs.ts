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
  ButtonListDef,
  ConditionalContainerDef,
  ContainerDef,
  ContainerGroupDef,
  DividerDef,
  DropdownDef,
  EmbedDef,
  FormDef,
  FormElementDef,
  GridDef,
  IconDef,
  ImageDef,
  ImageListDef,
  LinkDef,
  ListDef,
  ListItemDef,
  MapDef,
  MapPointDef,
  NavDef,
  SpacerDef,
  TableDef,
  TableSectionDef,
  TableRowDef,
  TableCellDef,
  TextDef,
  VideoDef,
} from "../components/definitions";

import type { ResolvedComponentDef } from "../define";

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
  ImageListDef,
  IconDef,
  ButtonDef,
  ButtonListDef,
  LinkDef,
  ListDef,
  ListItemDef,
  TableDef,
  TableSectionDef,
  TableRowDef,
  TableCellDef,
  DividerDef,
  SpacerDef,
  FormDef,
  FormElementDef,
  DropdownDef,
  VideoDef,
  AudioDef,
  EmbedDef,
  MapDef,
  MapPointDef,
  NavDef,
];

/** Lookup built-in `defineComponent` descriptor by PascalCase name (e.g. `"Button"`). */
export function getBuiltinComponentDef(name: string): ResolvedComponentDef | undefined {
  if (!name) return undefined;
  return BUILTIN_COMPONENT_DEFS.find(d => d.name === name);
}
