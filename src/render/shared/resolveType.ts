/**
 * Component name of a serialized node (`type.resolvedName`, or the legacy
 * string form). Shared by the static walker and the email validator, which is
 * editor-side and must not import the walker.
 */
export function resolveType(node: { type: { resolvedName: string } | string }): string {
  if (typeof node.type === "string") return node.type;
  return node.type?.resolvedName || "Container";
}
