export interface SerializedNode {
  props?: Record<string, any>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
}

const REF_PREFIX = "ref-icon:";

function walk(value: unknown, out: Set<string>): void {
  if (!value) return;
  if (typeof value === "string") {
    if (value.startsWith(REF_PREFIX)) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walk(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) walk(v, out);
  }
}

export function collectIconRefs(nodes: Record<string, SerializedNode>): string[] {
  const refs = new Set<string>();
  for (const node of Object.values(nodes || {})) {
    if (node?.props) walk(node.props, refs);
  }
  return [...refs].sort();
}

export function parseIconRef(ref: string): { set: string; name: string } | null {
  if (!ref.startsWith(REF_PREFIX)) return null;
  const body = ref.slice(REF_PREFIX.length);
  const slash = body.indexOf("/");
  if (slash < 1) return null;
  const set = body.slice(0, slash);
  const name = body.slice(slash + 1);
  if (!set || !name) return null;
  return { set, name };
}
