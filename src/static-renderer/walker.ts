import { buildStaticContext } from "../utils/conditions/context";
import { evaluateConditionGroups, evaluateConditions } from "../utils/conditions/evaluate";
import type { StaticRenderContext, ToHTMLFn } from "../utils/staticHtml";
import type { SerializedNode, SerializedNodes } from "./types";

export function resolveType(node: SerializedNode): string {
  if (typeof node.type === "string") return node.type;
  return node.type?.resolvedName || "Container";
}

export function renderNode(
  nodeId: string,
  nodes: SerializedNodes,
  resolver: Record<string, ToHTMLFn>,
  ctx: StaticRenderContext
): string {
  const node = nodes[nodeId];
  if (!node || node.hidden) return "";

  // Evaluate per-node conditions
  const conditionGroups = node.props?.conditionGroups;
  const conditions = node.props?.conditions;
  const hasConditions =
    (conditionGroups && conditionGroups.length > 0) || (conditions && conditions.length > 0);

  if (hasConditions) {
    const rootProps = nodes["ROOT"]?.props || {};
    const condCtx = buildStaticContext(rootProps, null, ctx.connectorData ?? null);

    // Prefer conditionGroups (new format), fall back to flat conditions
    const result =
      conditionGroups && conditionGroups.length > 0
        ? evaluateConditionGroups(conditionGroups, condCtx)
        : evaluateConditions(conditions, node.props.conditionLogic || "all", condCtx);

    if (result === false) return ""; // definitively hidden

    if (result === null) {
      // Client-only conditions: render content but wrap hidden for client eval
      ctx.hasClientConditions = true;
      const typeName = resolveType(node);
      const toHTML = resolver[typeName];
      const childIds = [...(node.nodes || []), ...Object.values(node.linkedNodes || {})];
      const childrenHTML = childIds
        .map(id => renderNode(id as string, nodes, resolver, ctx))
        .filter(Boolean)
        .join("\n");
      let inner = "";
      if (toHTML) {
        const prevId = ctx.renderingNodeId;
        ctx.renderingNodeId = nodeId;
        try {
          inner = toHTML(node.props || {}, childrenHTML, ctx);
        } finally {
          ctx.renderingNodeId = prevId;
        }
      } else if (childrenHTML) {
        inner = `<div>${childrenHTML}</div>`;
      }
      if (!inner) return "";
      const condData = JSON.stringify(conditions || []).replace(/"/g, "&quot;");
      const logic = node.props.conditionLogic || "all";
      return `<div data-ph-conditions="${condData}" data-ph-condition-logic="${logic}" style="display:none">${inner}</div>`;
    }
    // result === true: render normally, fall through
  }

  const typeName = resolveType(node);
  const toHTML = resolver[typeName];

  // Render children + linked nodes
  const childIds = [...(node.nodes || []), ...Object.values(node.linkedNodes || {})];
  const childrenHTML = childIds
    .map(id => renderNode(id as string, nodes, resolver, ctx))
    .filter(Boolean)
    .join("\n");

  if (toHTML) {
    const prevId = ctx.renderingNodeId;
    ctx.renderingNodeId = nodeId;
    try {
      return toHTML(node.props || {}, childrenHTML, ctx);
    } finally {
      ctx.renderingNodeId = prevId;
    }
  }

  // Fallback: unknown component
  console.warn(`[renderToHTML] No .toHTML.ts for "${typeName}" — rendering children as <div>`);
  return childrenHTML ? `<div>${childrenHTML}</div>` : "";
}
