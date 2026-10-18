/**
 * Settings for the selected element, or the empty state ("Add Blocks", "Add
 * Components", …) when nothing is selected. Fills its parent as a flex column;
 * place it in an `EditorPanelFrame` so its pinned-sections dock can size itself.
 */
import { NodeProvider, useEditor } from "@craftjs/core";
import React from "react";
import { EditorEmptyState } from "./EditorEmptyState";
import { Inspector } from "./inspector/InspectorRegistry";

export function EditorInspector({
  closable = true,
  emptyAlign = "center",
}: {
  /** Show the empty state's "close sidebar" link. Off where the panel can't be closed. */
  closable?: boolean;
  /** Where the empty state's actions sit: centred in the panel, or at its top. */
  emptyAlign?: "center" | "start";
} = {}): React.JSX.Element {
  const { selectedNodeId } = useEditor((state, query) => {
    const id = query.getEvent("selected").first() || null;
    if (id && !state.nodes[id]?.data) return { selectedNodeId: null };
    return { selectedNodeId: id };
  });

  // Mount Inspector ONCE. NodeProvider swaps the context id without
  // remounting children — useNode() inside picks up the new id reactively.
  return selectedNodeId ? (
    <NodeProvider id={selectedNodeId}>
      <Inspector />
    </NodeProvider>
  ) : (
    <EditorEmptyState closable={closable} align={emptyAlign} />
  );
}
