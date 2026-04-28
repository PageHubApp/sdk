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

/**
 * Resolves the DOM-discoverable anchor id for a CraftJS node — the same id
 * Container.tsx and the show-hide picker use as a state-registry key.
 * Overlay-style nodes (`custom.overlay === true`) own their id via
 * `props.anchor`; everything else prefers `attrs.id` then `props.id` then
 * `props.anchor`. Returns undefined when the node has no usable id.
 */
export function getNodeAnchor(node: any): string | undefined {
  if (!node?.data) return undefined;
  const p = node.data?.props || {};
  const isOverlay = node.data.custom?.overlay === true;
  const attrsId = typeof p.attrs?.id === "string" ? p.attrs.id : undefined;
  const propsId = typeof p.id === "string" ? p.id : undefined;
  const anchor = typeof p.anchor === "string" ? p.anchor : undefined;
  return isOverlay ? anchor || attrsId || propsId : attrsId || propsId || anchor;
}

export function useElementPicker(filter: PickerFilter): PickerOption[] {
  // CraftJS `useEditor` spreads the selector return into its hook return — if
  // the selector returns a bare array it surfaces as an object with numeric
  // keys (and `.map` blows up). Wrap in an object and destructure.
  const { options } = useEditor(state => {
    const options: PickerOption[] = [];

    for (const [nodeId, node] of Object.entries(state.nodes)) {
      if (!node?.data) continue;

      const displayName = node.data.displayName || node.data.name || "";
      const isOverlay = node.data.custom?.overlay === true;
      const targetId = getNodeAnchor(node);
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
