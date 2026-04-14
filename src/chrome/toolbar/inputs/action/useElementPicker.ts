/**
 * Hook to enumerate page elements for action target pickers.
 * Walks the CraftJS node tree and returns options filtered by type.
 */
import { useEditor } from "@craftjs/core";
import { getDisplayName } from "../../dialogs/Layers/utils";

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
      const isOverlay = node.data.custom?.overlay === true;
      const targetId = isOverlay ? p.anchor : p.id || p.anchor;
      const label = getDisplayName(node);

      if (!targetId) continue;

      if (filter === "modal") {
        if (!isOverlay) continue;
      } else if (filter === "section") {
        const parent = node.data.parent ? state.nodes[node.data.parent] : null;
        if (parent?.data?.props?.type !== "page") continue;
      }

      options.push({
        nodeId,
        label,
        anchor: targetId,
        componentType: filter === "section" ? "Section" : displayName,
      });
    }

    return options;
  });
}
