/** Shared drag rules for layout canvases (Container, Grid). */

const SECTION_PARENTS = new Set(["page", "component", "header", "footer"]);

export function layoutCanvasCanMoveIn(nodes: any[], into: any): boolean {
  if (!into?.data) return true;
  return nodes.every(node => {
    if (node?.data?.props?.type === "form") {
      if (into.data?.props?.type === "form") return false;
    }
    if (node?.data?.props?.type === "page") {
      return into.id === "ROOT";
    }
    if (node?.data?.props?.type === "section") {
      return SECTION_PARENTS.has(into.data?.props?.type);
    }
    return true;
  });
}
