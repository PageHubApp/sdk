/**
 * Craft-free walker — recurses a serialized CraftJS NodeMap and renders
 * directly through `@pagehub/sdk` `*Render.tsx` components. Replaces
 * `<Editor enabled={false}><Frame data={...}>` for viewer routes.
 *
 * Walks `[...node.nodes, ...Object.values(node.linkedNodes ?? {})]` in
 * mount order (header/footer linkedNodes after canvas children). For
 * `Data` / scope-bearing nodes the per-item ItemContext wrap is delegated
 * to `<DataRender>` itself (it owns `useDataSource`).
 *
 * Conditional visibility — each node's `props.conditionGroups` /
 * `props.conditions` are evaluated against the same context the editor
 * HOC built; nodes that fail return `null`. The redirect/fallback
 * page-level fail action is left to the existing
 * `withConditionalVisibility` HOC behavior elsewhere — walker doesn't
 * navigate away on its own.
 */
import React from "react";
import { ItemProvider, useItemContext } from "../utils/itemContext";
import { evaluateConditionGroups } from "../utils/conditions/evaluate";
import { buildClientContext } from "../utils/conditions/context";
import { getConnectorData } from "../utils/design/variables";
import type { ConditionGroup } from "../utils/conditions/types";
import { WalkerNodeProvider, useTreeRoot, type WalkerNodeCtx } from "./contexts";
import { uiResolver, type UiResolver } from "./resolver";
import { sdkLog } from "../utils/logger";

export interface SerializedNode {
  type: { resolvedName: string };
  isCanvas?: boolean;
  props: Record<string, any>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  parent?: string | null;
  hidden?: boolean;
  custom?: { displayName?: string };
  displayName?: string;
}

export type SerializedNodes = Record<string, SerializedNode>;

export interface RenderTreeProps {
  /** Flat NodeMap from `prepareViewerProps` (server-side decompressed). */
  nodes: SerializedNodes;
  /** Entry node id — almost always `"ROOT"`. */
  rootNodeId?: string;
  /** Optional resolver override; defaults to the SDK's Craft-free uiResolver. */
  resolver?: UiResolver;
  /** Wrapped components (CartDrawer, AgentChat, etc.) — host app extras. */
  extraResolver?: UiResolver;
}

interface NodeRendererProps {
  id: string;
  nodes: SerializedNodes;
  resolver: UiResolver;
  parentClassName?: string;
}

function evalNodeVisibility(
  node: SerializedNode,
  rootProps: Record<string, any>,
  itemContext: any
): boolean {
  const conditionGroups = (node.props.conditionGroups || null) as ConditionGroup[] | null;
  if (!conditionGroups || conditionGroups.length === 0) return true;
  // Use static-ish context for SSR; the runtime evaluator on mount inside
  // each component (via useEffect listeners) keeps client-only conditions
  // accurate. The walker's job here is to skip nodes whose server-resolvable
  // conditions are definitively false.
  const ctx = {
    ...buildClientContext(rootProps, itemContext),
    connectorData: getConnectorData(),
  };
  const result = evaluateConditionGroups(conditionGroups, ctx);
  return result !== false;
}

function NodeRenderer({ id, nodes, resolver, parentClassName }: NodeRendererProps) {
  const node = nodes[id];
  const tree = useTreeRoot();
  // Item context flows in via DataRender's ItemProvider for repeater children.
  // Without this, `item.*` conditions on Buttons/Text/etc. inside a repeater
  // evaluate against a null item and fall through to visible.
  const itemContext = useItemContext();

  if (!node) {
    if (process.env.NODE_ENV !== "production") {
      sdkLog.warn(`[RenderTree] node id "${id}" not in NodeMap`);
    }
    return null;
  }
  if (node.hidden) return null;

  const visible = evalNodeVisibility(node, tree?.rootProps ?? {}, itemContext);
  if (!visible) return null;

  const Component = resolver[node.type.resolvedName];
  if (!Component) {
    if (process.env.NODE_ENV !== "production") {
      sdkLog.warn(
        `[RenderTree] no resolver for "${node.type.resolvedName}" (node ${id})`
      );
    }
    return null;
  }

  // Build child render order: canvas children first, then linkedNodes.
  let childIds = [...(node.nodes ?? []), ...Object.values(node.linkedNodes ?? {})];

  // ROOT-level chrome suppression: a page can opt out of the global header
  // and/or footer via `hideHeader` / `hideFooter` on its own props. With
  // sharding only the active page sits in ROOT.nodes, so we read its flags
  // and strip the matching header/footer siblings before recursing.
  if (id === "ROOT") {
    const activePage = childIds
      .map(cid => ({ id: cid, n: nodes[cid] }))
      .find(({ n }) => n?.props?.type === "page");
    const hideHeader = activePage?.n?.props?.hideHeader === true;
    const hideFooter = activePage?.n?.props?.hideFooter === true;
    const hideChrome = activePage?.n?.props?.hideChrome === true;
    if (hideHeader || hideFooter || hideChrome) {
      childIds = childIds.filter(cid => {
        const t = nodes[cid]?.props?.type;
        if (hideChrome && t !== "page") return false;
        if (hideHeader && t === "header") return false;
        if (hideFooter && t === "footer") return false;
        return true;
      });
    }
  }
  // Accumulate ancestor classNames so descendants can infer responsive image
  // `sizes` from any fixed-width ancestor (e.g. `<img w-full>` inside a chain
  // like `w-64 > div > div > img` should still emit `sizes="256px"`).
  const ownClassName = (node.props?.className as string) || "";
  const childParentClassName = parentClassName
    ? `${parentClassName} ${ownClassName}`
    : ownClassName;
  const children = childIds.map(cid => (
    <NodeRenderer
      key={cid}
      id={cid}
      nodes={nodes}
      resolver={resolver}
      parentClassName={childParentClassName}
    />
  ));

  // Special-case Map: pre-compute childPoints from MapPoint children.
  let injectedProps: Record<string, any> = {};
  if (node.type.resolvedName === "Map") {
    const childPoints = (node.nodes ?? [])
      .map(cid => {
        const c = nodes[cid];
        if (!c || c.type.resolvedName !== "MapPoint") return null;
        return {
          id: cid,
          lat: parseFloat(c.props.lat) || 0,
          lng: parseFloat(c.props.lng) || 0,
          title: c.props.title || "",
          description: c.props.description || "",
        };
      })
      .filter(Boolean);
    injectedProps.childPoints = childPoints;
  }

  // Filter out pages that aren't the active page. The walker doesn't yet
  // know the active page; viewer routes pass it via props.* on the node
  // (server-side single-page sharding) so non-active pages don't appear in
  // `nodes`. As a safety net: skip any extra `type === "page"` siblings
  // beyond the first one if we ever see them.
  const ctx: WalkerNodeCtx = {
    id,
    isCanvas: !!node.isCanvas,
    displayName: node.custom?.displayName || node.displayName,
    childIds,
    parentClassName,
  };

  // For Data nodes with `dataSource.scope`, ItemProvider wrapping happens
  // inside DataRender via useDataSource. For plain Container, no wrap.
  return (
    <WalkerNodeProvider value={ctx}>
      {React.createElement(Component, { ...node.props, ...injectedProps }, children)}
    </WalkerNodeProvider>
  );
}

export function RenderTree({
  nodes,
  rootNodeId = "ROOT",
  resolver,
  extraResolver,
}: RenderTreeProps) {
  const merged = React.useMemo(
    () => ({ ...uiResolver, ...(extraResolver || {}), ...(resolver || {}) }),
    [resolver, extraResolver]
  );
  // Always-on Suspense boundary covers the React.lazy entries in `uiResolver`
  // (Map / Video / Form / Embed). When a page has none of those node types,
  // nothing suspends and the boundary is a cheap no-op.
  return (
    <React.Suspense fallback={null}>
      <NodeRenderer id={rootNodeId} nodes={nodes} resolver={merged} />
    </React.Suspense>
  );
}

// Re-export ItemProvider so route code can wrap if needed without pulling
// from `utils/`.
export { ItemProvider };
