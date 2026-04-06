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
  return useEditor((state) => {
    const options: PickerOption[] = [];

    for (const [nodeId, node] of Object.entries(state.nodes)) {
      if (!node?.data) continue;

      const displayName = node.data.displayName || node.data.name || "";
      const anchor = node.data.props?.anchor;
      const label = getDisplayName(node);

      if (filter === "modal") {
        if (displayName === "Modal" && anchor) {
          options.push({ nodeId, label, anchor, componentType: "Modal" });
        }
      } else if (filter === "section") {
        // Top-level containers (direct children of a page) with anchors
        if (displayName === "Container" && anchor) {
          const parent = node.data.parent ? state.nodes[node.data.parent] : null;
          const isTopLevel = parent?.data?.props?.type === "page";
          if (isTopLevel) {
            options.push({ nodeId, label, anchor, componentType: "Section" });
          }
        }
      } else {
        // "all" — any element with an anchor set
        if (anchor) {
          options.push({ nodeId, label, anchor, componentType: displayName });
        }
      }
    }

    return options;
  });
}
