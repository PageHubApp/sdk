import { buildStaticContext } from "../../utils/conditions/context";
import { evaluateConditionGroups, hasStateCondition } from "../../utils/conditions/evaluate";
import type { AuthState } from "../../utils/design/variables";
import type { StaticRenderContext, ToHTMLFn } from "../../utils/staticHtml";
import type { SerializedNodes } from "./types";
import { sdkLog } from "../../utils/logger";
import { filterChromeChildren } from "../shared/chromeSuppression";
import { resolveType } from "../shared/resolveType";
import { isSlotItem } from "./slotItem";
import { migrateActions } from "../../utils/action";

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

const ANCHOR_TOKEN_RE = /\{\{anchor\.([a-zA-Z0-9_-]+)\}\}/g;

/**
 * Resolve `{{anchor.X}}` in every string prop against the anchors in scope —
 * the static twin of React components reading `useAnchors()` (Container `id`,
 * action `target`/`key`, `state` condition keys, text). Unknown names resolve
 * to "", matching `resolveAnchors`.
 */
function resolvePropAnchors(
  props: Record<string, any>,
  anchors: StaticRenderContext["anchors"]
): Record<string, any> {
  if (!anchors) return props;
  const json = JSON.stringify(props);
  if (!json || json.indexOf("{{anchor.") === -1) return props;
  return JSON.parse(json.replace(ANCHOR_TOKEN_RE, (_, k) => anchors[k] ?? ""));
}

function hasItemCondition(groups: any[]): boolean {
  return groups.some(
    g => Array.isArray(g?.conditions) && g.conditions.some((c: any) => c?.type === "item")
  );
}

/** Render one node's markup (children + its toHTML), no condition handling. */
function renderBody(
  nodeId: string,
  node: SerializedNodes[string],
  props: Record<string, any>,
  nodes: SerializedNodes,
  resolver: Record<string, ToHTMLFn>,
  ctx: StaticRenderContext
): string {
  const typeName = resolveType(node);
  const toHTML = resolver[typeName];

  if (!ctx.hasChatComposer && migrateActions(props).some(a => a.type === "agent-send")) {
    ctx.hasChatComposer = true;
  }

  // Render children + linked nodes
  let childIds = [...(node.nodes || []), ...Object.values(node.linkedNodes || {})] as string[];

  if (nodeId === "ROOT") {
    childIds = filterChromeChildren(childIds, cid => nodes[cid]?.props);
  }

  // Data nodes own their own iteration — pass raw child IDs through ctx and
  // let Data.toHTML render children per-item (with `ctx.currentItem` set).
  // Pre-rendering once here would lose per-item interpolation.
  if (typeName === "Data" && toHTML) {
    const prevId = ctx.renderingNodeId;
    const prevChildIds = ctx.repeaterChildIds;
    ctx.renderingNodeId = nodeId;
    ctx.repeaterChildIds = childIds;
    try {
      return toHTML(props, "", ctx);
    } finally {
      ctx.renderingNodeId = prevId;
      ctx.repeaterChildIds = prevChildIds;
    }
  }

  const childrenHTML = childIds
    .map(id => renderNode(id, nodes, resolver, ctx))
    .filter(Boolean)
    .join("\n");

  if (toHTML) {
    const prevId = ctx.renderingNodeId;
    ctx.renderingNodeId = nodeId;
    try {
      return toHTML(props, childrenHTML, ctx);
    } finally {
      ctx.renderingNodeId = prevId;
    }
  }

  // Fallback: unknown component
  sdkLog.warn(`[renderToHTML] No .toHTML.ts for "${typeName}" — rendering children as <div>`);
  return childrenHTML ? `<div>${childrenHTML}</div>` : "";
}

export function renderNode(
  nodeId: string,
  nodes: SerializedNodes,
  resolver: Record<string, ToHTMLFn>,
  ctx: StaticRenderContext
): string {
  const node = nodes[nodeId];
  if (!node || node.hidden) return "";

  const props = resolvePropAnchors(node.props || {}, ctx.anchors);

  // A wrapper that opens a scope (anchors / a browser-side item) does so for
  // its whole subtree, including its own condition wrapper and toHTML.
  const scope = resolver[resolveType(node)]?.staticScope?.(nodeId, props);
  const prevAnchors = ctx.anchors;
  const prevStateItem = ctx.stateItem;
  const prevItem = ctx.currentItem;
  if (scope) {
    if (scope.anchors) ctx.anchors = { ...(ctx.anchors || {}), ...scope.anchors };
    if (scope.stateItem) {
      ctx.stateItem = scope.stateItem;
      ctx.currentItem = null;
    }
  }
  try {
    return renderGated(nodeId, node, props, nodes, resolver, ctx);
  } finally {
    ctx.anchors = prevAnchors;
    ctx.stateItem = prevStateItem;
    ctx.currentItem = prevItem;
  }
}

function renderGated(
  nodeId: string,
  node: SerializedNodes[string],
  props: Record<string, any>,
  nodes: SerializedNodes,
  resolver: Record<string, ToHTMLFn>,
  ctx: StaticRenderContext
): string {
  const conditionGroups = props.conditionGroups;
  if (!Array.isArray(conditionGroups) || conditionGroups.length === 0) {
    return renderBody(nodeId, node, props, nodes, resolver, ctx);
  }
  const groupsData = JSON.stringify(conditionGroups).replace(/"/g, "&quot;");

  // Rendering a client item template: item conditions depend on the row, so
  // the runtime's reconciler evaluates them per row (repeater.ts) and drops
  // or unwraps this marker.
  if (isSlotItem(ctx.currentItem) && hasItemCondition(conditionGroups)) {
    const inner = renderBody(nodeId, node, props, nodes, resolver, ctx);
    return inner ? `<div data-ph-item-conditions="${groupsData}">${inner}</div>` : "";
  }

  const rootProps = nodes["ROOT"]?.props || {};
  const condCtx = buildWalkerContext(rootProps, ctx.currentItem ?? null, ctx);
  const result = evaluateConditionGroups(conditionGroups, condCtx);
  // State is empty at render time, so a state-gated result is only the
  // initial one — keep the node and let the client directive re-evaluate.
  const stateGated = hasStateCondition(conditionGroups);

  if (result === false && !stateGated) return ""; // definitively hidden
  if (result === true && !stateGated) {
    return renderBody(nodeId, node, props, nodes, resolver, ctx);
  }

  // Client-only conditions: render content but wrap for client eval.
  ctx.hasClientConditions = true;
  const inner = renderBody(nodeId, node, props, nodes, resolver, ctx);
  if (!inner) return "";
  // Consumed by the Alpine `data-ph-condition-groups` directive registered
  // in staticPublishRuntime.ts.
  const initialStyle = result === true ? "" : ` style="display:none"`;
  return `<div data-ph-condition-groups="${groupsData}"${initialStyle}>${inner}</div>`;
}
