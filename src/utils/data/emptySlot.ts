/**
 * Empty-state slot for `Data` (repeater) nodes.
 *
 * A `Data` node's children split into two roles by node-level
 * `custom.dataRole`:
 *   - template children (`dataRole !== "empty"`) — repeated once per item.
 *   - empty children   (`dataRole === "empty"`)  — rendered once, WITHOUT item
 *     context, in place of the rows when the binding resolves to definitively
 *     empty (see `useDataSource`'s renderChildren).
 *
 * Each render path (React viewer walker, static walker, CraftJS editor) reads a
 * child's role from a different place, so they share this partition via a
 * `getRole(id)` accessor rather than duplicating the split logic.
 */

/** Node-level `custom.dataRole` value that marks a Data child as the empty slot. */
export const DATA_EMPTY_ROLE = "empty";

export interface PartitionedDataChildIds {
  /** Children repeated per item. */
  templateChildIds: string[];
  /** Children rendered once when the binding is definitively empty. */
  emptyChildIds: string[];
}

/**
 * Split a Data node's child ids into template vs empty-slot children.
 * `getRole` returns the child's node-level `custom.dataRole` (or undefined).
 */
export function partitionDataChildIds(
  childIds: string[],
  getRole: (id: string) => string | null | undefined
): PartitionedDataChildIds {
  const templateChildIds: string[] = [];
  const emptyChildIds: string[] = [];
  for (const id of childIds) {
    if (getRole(id) === DATA_EMPTY_ROLE) emptyChildIds.push(id);
    else templateChildIds.push(id);
  }
  return { templateChildIds, emptyChildIds };
}
