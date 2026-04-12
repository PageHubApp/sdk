/**
 * Hook to enumerate page elements for action target pickers.
 * Walks the CraftJS node tree and returns options filtered by type.
 */
import { useEditor } from "@craftjs/core";
import { getDisplayName } from "../../Tools/Layers/utils";

export interface PickerOption {
  nodeId: string;
  label: string;
  anchor: string;
  componentType: string;
}

export type PickerFilter = "modal" | "section" | "all";

export function useElementPicker(filter: PickerFilter): PickerOption[] {
  return useEditor(state => {
    const options: PickerOption[] = [];

    for (const [nodeId, node] of Object.entries(state.nodes)) {
      if (!node?.data) continue;

      const displayName = node.data.displayName || node.data.name || "";
      const p = node.data.props || {};
      /** DOM id for targeting (Element ID); Modal still uses `anchor` only */
      const targetId = displayName === "Modal" ? p.anchor : p.id || p.anchor;
      const label = getDisplayName(node);

      if (filter === "modal") {
        if (displayName === "Modal" && targetId) {
          options.push({ nodeId, label, anchor: targetId, componentType: "Modal" });
        }
      } else if (filter === "section") {
        // Top-level containers (direct children of a page) with an id or legacy anchor
        if (displayName === "Container" && targetId) {
          const parent = node.data.parent ? state.nodes[node.data.parent] : null;
          const isTopLevel = parent?.data?.props?.type === "page";
          if (isTopLevel) {
            options.push({ nodeId, label, anchor: targetId, componentType: "Section" });
          }
        }
      } else {
        // "all" — any element with a target id (Element ID or legacy anchor; Modal: anchor)
        if (targetId) {
          options.push({ nodeId, label, anchor: targetId, componentType: displayName });
        }
      }
    }

    return options;
  });
}
