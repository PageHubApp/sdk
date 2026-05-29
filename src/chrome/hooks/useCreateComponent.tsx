import { Element, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomState } from "@zedux/react";
import React from "react";
import { Container } from "../../components/Container/Container";
import { Text } from "../../components/Text/Text";
import { useSetAtomState } from "../../utils/atoms";
import { CanvasIsolateAtom } from "../../utils/component/componentIsolation";
import { ComponentsAtom, ViewModeAtom } from "../../utils/atoms";
import { getAtomExternal, setAtomExternal } from "../../utils/atoms/external";
import { getEditorActions, getEditorQuery } from "../../registry/editorBackref";
import { sdkLog } from "../../utils/logger";

/**
 * Non-hook helper that does the actual work — extracted so the registry
 * command `ph.component.createReusable` can fire it from outside React.
 *
 * Reads the live CraftJS query/actions from the editor backref (set by
 * EditorInner on mount) and the relevant atoms via the external accessors.
 * Falls back to host-passed args when present (so the hook can keep its
 * memoized closure semantics and the helper stays pure).
 */
export function createReusableComponentRun(args?: {
  query?: any;
  actions?: any;
}): void {
  const query = args?.query ?? getEditorQuery();
  const actions = args?.actions ?? getEditorActions();
  if (!query || !actions) {
    sdkLog.warn("[createReusableComponentRun] missing editor backref");
    return;
  }
  try {
    const componentName = "New Component";
    const tree = query
      .parseReactElement(
        <Element
          canvas
          is={Container}
          type="component"
          custom={{ displayName: componentName }}
          className="flex flex-col items-start gap-4 bg-transparent p-6"
        >
          <Text text="Start editing your component..." />
        </Element>
      )
      .toNodeTree();
    actions.addNodeTree(tree, ROOT_NODE);
    const containerId = tree.rootNodeId;
    const contentNodeId = tree.nodes[containerId].data.nodes[0];

    requestAnimationFrame(() => {
      try {
        const contentTree = query.node(contentNodeId).toNodeTree();
        const nodePairs = Object.keys(contentTree.nodes).map(id => [
          id,
          query.node(id).toSerializedNode(),
        ]);
        const components = (getAtomExternal<any[]>(ComponentsAtom) ?? []) as any[];
        setAtomExternal(ComponentsAtom, [
          ...components,
          {
            rootNodeId: contentNodeId,
            nodes: JSON.stringify(Object.fromEntries(nodePairs)),
            name: componentName,
          } as any,
        ]);
        const currentViewMode = getAtomExternal(ViewModeAtom) as unknown as string;
        if (currentViewMode !== "canvas") {
          setAtomExternal(ViewModeAtom, "canvas" as any);
        }
        setAtomExternal(CanvasIsolateAtom, containerId as any);
      } catch (e) {
        sdkLog.error("[createReusableComponentRun] post-frame failed", e);
      }
    });
  } catch (e) {
    sdkLog.error("[createReusableComponentRun] failed to create component", e);
  }
}

/**
 * Create a blank `type: "component"` Container under ROOT, register it in
 * ComponentsAtom, switch to canvas mode (if needed), and isolate it.
 *
 * Single source of truth — used by ComponentSelector, EditorEmptyState, and
 * the canvas viewport's "+ component" toolbar button. Thin wrapper around
 * the non-hook `createReusableComponentRun` so React consumers get a
 * memoized callback bound to the current editor.
 */
export function useCreateComponent(): () => void {
  const { query, actions } = useEditor();
  // Subscribe to atoms so consumers re-render on the same triggers as
  // before; the helper itself reads via external accessors.
  useAtomState(ComponentsAtom);
  useAtomState(ViewModeAtom);
  useSetAtomState(CanvasIsolateAtom);

  return React.useCallback(() => {
    createReusableComponentRun({ query, actions });
  }, [query, actions]);
}
