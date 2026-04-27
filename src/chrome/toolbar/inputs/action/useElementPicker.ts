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
  // CraftJS `useEditor` spreads the selector return into its hook return — if
  // the selector returns a bare array it surfaces as an object with numeric
  // keys (and `.map` blows up). Wrap in an object and destructure.
  const { options } = useEditor(state => {
    const options: PickerOption[] = [];

    for (const [nodeId, node] of Object.entries(state.nodes)) {
      if (!node?.data) continue;

      const displayName = node.data.displayName || node.data.name || "";
      const p = node.data?.props || {};
      const isOverlay = node.data.custom?.overlay === true;
      const attrsId = typeof p.attrs?.id === "string" ? p.attrs.id : undefined;
      // Match Container.tsx's show-hide target resolution: attrs.id first, then
      // props.id, then props.anchor. Overlay components (Modal, CookieConsent)
      // own their id via `props.anchor`, so keep that primary for them.
      const propsId = typeof p.id === "string" ? p.id : undefined;
      const targetId = isOverlay
        ? p.anchor || attrsId || propsId
        : attrsId || propsId || p.anchor;
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

    return { options };
  });
  return options;
}
