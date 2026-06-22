import { buildStaticContext } from "../../utils/conditions/context";
import { evaluateConditionGroups } from "../../utils/conditions/evaluate";
import type { AuthState } from "../../utils/design/variables";
import type { StaticRenderContext, ToHTMLFn } from "../../utils/staticHtml";
import type { SerializedNode, SerializedNodes } from "./types";
import { sdkLog } from "../../utils/logger";
import { filterChromeChildren } from "../shared/chromeSuppression";

export function resolveType(node: SerializedNode): string {
  if (typeof node.type === "string") return node.type;
  return node.type?.resolvedName || "Container";
}

/**
 * Build a ConditionContext for a node, layering `requestContext` hints from
 * the host (Next.js page) onto the base static context so `auth` / `device` /
 * `url-param` conditions can resolve definitively at SSR.
 *
 * Hint mapping:
 *  - `isAuthenticated` → `auth = { status: "logged-in" | "logged-out" }`
 *  - `userAgentClass`  → `viewportWidth` (375 mobile, 768 tablet, 1280 desktop)
 *  - `urlParams`       → `URLSearchParams`
 */
function buildWalkerContext(
  rootProps: Record<string, any>,
  item: Record<string, any> | null,
  ctx: StaticRenderContext
) {
  const base = buildStaticContext(rootProps, item, ctx.connectorData ?? null);
  const hints = ctx.requestContext;
  if (!hints) return base;
  if (typeof hints.isAuthenticated === "boolean") {
    const auth: AuthState = { status: hints.isAuthenticated ? "logged-in" : "logged-out" };
    base.auth = auth;
  }
  if (hints.userAgentClass) {
    base.viewportWidth =
      hints.userAgentClass === "mobile" ? 375 : hints.userAgentClass === "tablet" ? 768 : 1280;
  }
  if (hints.urlParams) {
    base.urlParams = new URLSearchParams(hints.urlParams);
  }
  return base;
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
  const hasConditions = conditionGroups && conditionGroups.length > 0;

  if (hasConditions) {
    const rootProps = nodes["ROOT"]?.props || {};
    const condCtx = buildWalkerContext(rootProps, ctx.currentItem ?? null, ctx);

    const result = evaluateConditionGroups(conditionGroups, condCtx);

    if (result === false) return ""; // definitively hidden

    if (result === null) {
      // Client-only conditions: render content but wrap hidden for client eval
      ctx.hasClientConditions = true;
      const typeName = resolveType(node);
      const toHTML = resolver[typeName];
      const childIds = [...(node.nodes || []), ...Object.values(node.linkedNodes || {})];
      const isRepeater = typeName === "Data";
      let inner = "";
      if (isRepeater && toHTML) {
        const prevId = ctx.renderingNodeId;
        const prevChildIds = ctx.repeaterChildIds;
        ctx.renderingNodeId = nodeId;
        ctx.repeaterChildIds = childIds as string[];
        try {
          inner = toHTML(node.props || {}, "", ctx);
        } finally {
          ctx.renderingNodeId = prevId;
          ctx.repeaterChildIds = prevChildIds;
        }
      } else {
        const childrenHTML = childIds
          .map(id => renderNode(id as string, nodes, resolver, ctx))
          .filter(Boolean)
          .join("\n");
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
      }
      if (!inner) return "";
      // Consumed by the Alpine `data-ph-condition-groups` directive registered
      // in staticPublishRuntime.ts.
      const groupsData = JSON.stringify(conditionGroups).replace(/"/g, "&quot;");
      return `<div data-ph-condition-groups="${groupsData}" style="display:none">${inner}</div>`;
    }
    // result === true: render normally, fall through
  }

  const typeName = resolveType(node);
  const toHTML = resolver[typeName];

  // Render children + linked nodes
  let childIds = [...(node.nodes || []), ...Object.values(node.linkedNodes || {})];

  if (nodeId === "ROOT") {
    childIds = filterChromeChildren(childIds, cid => nodes[cid]?.props);
  }

  // Data nodes own their own iteration — pass raw child IDs through ctx and
  // let Data.toHTML render children per-item (with `ctx.currentItem` set).
  // Pre-rendering once here would lose per-item interpolation.
  const isRepeater = typeName === "Data";
  if (isRepeater && toHTML) {
    const prevId = ctx.renderingNodeId;
    const prevChildIds = ctx.repeaterChildIds;
    ctx.renderingNodeId = nodeId;
    ctx.repeaterChildIds = childIds as string[];
    try {
      return toHTML(node.props || {}, "", ctx);
    } finally {
      ctx.renderingNodeId = prevId;
      ctx.repeaterChildIds = prevChildIds;
    }
  }

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
  sdkLog.warn(`[renderToHTML] No .toHTML.ts for "${typeName}" — rendering children as <div>`);
  return childrenHTML ? `<div>${childrenHTML}</div>` : "";
}
