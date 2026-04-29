import { expandModifiersInNodes } from "./modifierUtils";

// Registry: builtin defs are registered by core/builtinComponentDefs.ts at load
// time. Avoids a static import here, which would form a cycle:
//   utils/lib → sanitizeNodeMap → builtinComponentDefs → definitions →
//   <Component>.craft → ./<Component> (TDZ).
let _registeredBuiltinDefs: any[] | undefined;
export function setSanitizeBuiltinDefs(defs: any[]) {
  _registeredBuiltinDefs = defs;
}

/** Craft's renderer expects every node to have a plain object `props`; missing props crashes DefaultRender. */
function ensurePlainCraftProps(node: Record<string, any>) {
  const p = node.props;
  if (p == null || typeof p !== "object" || Array.isArray(p)) {
    node.props = {};
  }
}

/**
 * Drop dangling child / linkedNode ids so Craft <Frame> does not traverse missing nodes
 * (can throw "Cannot read properties of undefined (reading 'children')").
 */
export function sanitizeCraftNodeReferences(
  nodes: Record<string, any> | null | undefined
): Record<string, any> {
  if (!nodes || typeof nodes !== "object") return {};
  const copy = JSON.parse(JSON.stringify(nodes)) as Record<string, any>;
  for (const node of Object.values(copy)) {
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;
    ensurePlainCraftProps(node);
    if (Array.isArray(node.nodes)) {
      node.nodes = node.nodes.filter((id: string) => typeof id === "string" && id && copy[id]);
    }
    if (node.linkedNodes && typeof node.linkedNodes === "object") {
      const ln: Record<string, string> = { ...node.linkedNodes };
      for (const [k, id] of Object.entries(ln)) {
        if (typeof id !== "string" || !id || !copy[id]) delete ln[k];
      }
      node.linkedNodes = ln;
    }
  }
  return copy;
}

/**
 * Drop nodes whose `type.resolvedName` is not in `validTypes`, then clean up
 * dangling parent.nodes / linkedNodes refs. CraftJS's deserialize destructures
 * the resolver lookup result and crashes with a cryptic "Cannot destructure
 * 'type' of undefined" in production builds (where tiny-invariant is a noop)
 * when a saved node references a component that no longer exists in the
 * resolver. Mutates in place.
 */
export function pruneUnknownComponentNodes(
  nodes: Record<string, any>,
  validTypes: Set<string> | string[]
): { dropped: string[] } {
  const valid = validTypes instanceof Set ? validTypes : new Set(validTypes);
  const dropped: string[] = [];
  for (const [id, node] of Object.entries(nodes)) {
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;
    const resolved =
      typeof node.type === "object" && node.type
        ? node.type.resolvedName
        : typeof node.type === "string"
          ? node.type
          : null;
    if (id === "ROOT") continue;
    if (resolved && !valid.has(resolved)) {
      dropped.push(`${id}:${resolved}`);
      delete nodes[id];
    }
  }
  if (dropped.length) {
    for (const node of Object.values(nodes)) {
      if (!node || typeof node !== "object" || Array.isArray(node)) continue;
      if (Array.isArray(node.nodes)) {
        node.nodes = node.nodes.filter(
          (cid: string) => typeof cid === "string" && cid && nodes[cid]
        );
      }
      if (node.linkedNodes && typeof node.linkedNodes === "object") {
        for (const [k, cid] of Object.entries(node.linkedNodes)) {
          if (typeof cid !== "string" || !cid || !nodes[cid]) delete node.linkedNodes[k];
        }
      }
    }
  }
  return { dropped };
}

/**
 * Best-effort sanitizer for serialized Craft content.
 * If the payload parses to a node map, strip dangling references before it
 * reaches Craft's deserializer/renderer. Invalid JSON is returned unchanged.
 *
 * Pass `validTypes` (resolver keys) to ALSO drop nodes whose component name
 * isn't in the resolver — required for previews, where a stale saved site may
 * reference components that no longer exist.
 */
export function sanitizeCraftSerializedContent(
  serialized: string | null | undefined,
  validTypes?: Set<string> | string[]
): string | null | undefined {
  if (typeof serialized !== "string" || !serialized.trim()) return serialized;

  try {
    const parsed = JSON.parse(serialized) as Record<string, any>;
    const sanitized = sanitizeCraftNodeReferences(parsed);
    if (validTypes) {
      const { dropped } = pruneUnknownComponentNodes(sanitized, validTypes);
      if (dropped.length && typeof console !== "undefined") {
        console.warn(
          `[sanitizeCraftSerializedContent] dropped ${dropped.length} node(s) with unknown component types:`,
          dropped.slice(0, 8)
        );
      }
    }
    expandModifiersInNodes(sanitized, _registeredBuiltinDefs);
    return JSON.stringify(sanitized);
  } catch {
    return serialized;
  }
}
