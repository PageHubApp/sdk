import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomValue } from "@zedux/react";
import { useCallback } from "react";
import { useSetAtomState } from "../../../utils/atoms";
import { hasPageIsolation, IsolateAtom } from "../../../utils/lib";
import { ToolboxMenu, toolboxMenuInitialState } from "../../rendering/toolboxMenuAtom";

/**
 * Opens the contextual node menu (delete / select / wrap / etc.) at a given
 * screen position for a given node id. Single source of truth — used by the
 * canvas right-click handler and the breadcrumb right-click handler.
 *
 * Returns true if the menu was opened.
 */
export const useOpenNodeContextMenu = () => {
  const { query, actions } = useEditor();
  const isolate = useAtomValue(IsolateAtom);
  const setToolboxMenu = useSetAtomState(ToolboxMenu);

  return useCallback(
    (nodeId: string, x: number, y: number): boolean => {
      let resolvedId = nodeId;

      // Letterboxing / short pages: clicks land on ROOT Background instead of the page surface.
      if (resolvedId === ROOT_NODE && hasPageIsolation(isolate)) {
        try {
          const iso = query.node(isolate).get();
          if (iso?.data?.props?.type === "page") {
            resolvedId = isolate;
          }
        } catch {
          /* ignore */
        }
      }

      let node;
      try {
        node = query.node(resolvedId).get();
      } catch {
        return false;
      }
      if (!node) return false;

      actions.selectNode(resolvedId);

      const parentNode = node.data.parent
        ? (() => {
            try {
              return query.node(node.data.parent).get();
            } catch {
              return null;
            }
          })()
        : null;

      setToolboxMenu({
        ...toolboxMenuInitialState,
        enabled: true,
        x,
        y,
        id: resolvedId,
        name: String(node.data.name || ""),
        parent: parentNode
          ? {
              name: String(parentNode.data.name || ""),
              displayName: String(
                (parentNode.data.custom?.displayName as string) ||
                  (parentNode.data.displayName as string) ||
                  parentNode.data.name ||
                  ""
              ),
              props: parentNode.data.props || {},
            }
          : { ...toolboxMenuInitialState.parent },
      });

      return true;
    },
    [query, actions, isolate, setToolboxMenu]
  );
};
