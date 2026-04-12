import { useEditor } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { SectionPickerDialogAtom } from "utils/atoms";
import { SectionPickerDialog } from "./NodeControllers/SectionPickerDialog";
import { AddElement } from "./Viewport/Toolbox/lib";

export const GlobalSectionPickerDialog = () => {
  const [dialogState, setDialogState] = useAtomState(SectionPickerDialogAtom);
  const { query, actions } = useEditor();

  const handleClose = () => {
    setDialogState({
      isOpen: false,
      nodeId: null,
      position: null,
      parent: null,
    });
  };

  const handleSelectSection = element => {
    if (!dialogState.nodeId || !dialogState.parent) return;

    // Get the parent node
    const parentNodeData = query.node(dialogState.parent).get();
    const currentIndex = parentNodeData.data.nodes.indexOf(dialogState.nodeId);
    const newIndex = dialogState.position === "bottom" ? currentIndex + 1 : currentIndex;

    const newElement = AddElement({
      element,
      actions,
      query,
      addTo: dialogState.parent,
      index: newIndex,
    });

    // Scroll to the new element first, then select it
    if (newElement && newElement.rootNodeId) {
      setTimeout(() => {
        // Get DOM from CraftJS instead of querySelector
        const node = query.node(newElement.rootNodeId).get();
        if (node && node.dom) {
          node.dom.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
    }

    handleClose();
  };

  return (
    <SectionPickerDialog
      isOpen={dialogState.isOpen}
      onClose={handleClose}
      onSelectSection={handleSelectSection}
    />
  );
};
