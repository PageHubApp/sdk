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
    if (!node || typeof node !== "object") continue;
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
