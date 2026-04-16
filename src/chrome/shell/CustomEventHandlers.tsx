import { DefaultEventHandlers, NodeId } from "@craftjs/core";
import {
  getAlignmentDropContext,
  clearAlignmentIntent,
  applyAlignmentOnDrop,
  setDragOrigin,
  getDragOrigin,
} from "./alignmentInference";

export default class CustomEventHandlers extends DefaultEventHandlers {
  handlers() {
    const defaultEventHandlers = super.handlers();
    const {
      store: { query, actions },
    } = this.options;

    return {
      ...defaultEventHandlers,
      drag: (el: HTMLElement, id: NodeId) => {
        if (!query.node(id)?.isDraggable()) return () => {};

        const unbindDefaultDragHandlers = defaultEventHandlers.drag(el, id);

        // Capture original state at drag start (before CraftJS moves the node)
        let originalParentId: NodeId | undefined;
        let originalNodeId: NodeId = id;

        const unbindDragStart = this.addCraftEventListener(el, "dragstart", e => {
          const nativeEvent = (e as any).nativeEvent || e;

          if (nativeEvent.dataTransfer) {
            const dragPreview = document.createElement("div");
            dragPreview.className =
              "w-5 h-5 bg-blue-500 rounded border border-white/30 absolute -top-[9999px] -left-[9999px] opacity-80 shadow-md";

            document.body.appendChild(dragPreview);
            nativeEvent.dataTransfer.setDragImage(dragPreview, 10, 10);
            nativeEvent.dataTransfer.effectAllowed = "move";

            setTimeout(() => {
              if (dragPreview.parentNode) {
                document.body.removeChild(dragPreview);
              }
            }, 0);
          }

          el.setAttribute("data-dragging", "true");
          document.body.setAttribute("data-is-dragging", "true");

          const node = query.node(id).get();
          originalParentId = node?.data?.parent;
          setDragOrigin(id, originalParentId);
          console.log("[alignment-dragstart]", {
            id,
            nodeName: node?.data?.name,
            displayName: node?.data?.custom?.displayName,
            parent: originalParentId,
          });
          const nodeType = node?.data?.props?.type || "";
          if (nodeType) {
            document.body.setAttribute("data-dragging-type", nodeType);
          }
        });

        const unbindDragEnd = this.addCraftEventListener(el, "dragend", e => {
          el.removeAttribute("data-dragging");
          document.body.removeAttribute("data-is-dragging");
          document.body.removeAttribute("data-dragging-type");

          // Apply alignment intent if one was detected during drag
          // Use drag origin (first/innermost node) — CraftJS may promote drag to wrapper
          const ctx = getAlignmentDropContext();
          if (ctx) {
            const origin = getDragOrigin();
            const targetId = origin?.nodeId || id;
            const origParent = origin?.parentId || originalParentId;

            console.log("[alignment-dragend]", {
              zone: ctx.intent.zone,
              handlerId: id,
              targetId,
              origParent,
            });

            requestAnimationFrame(() => {
              applyAlignmentOnDrop(actions, targetId, ctx.intent, ctx.view, ctx.classDark, query, origParent);
              clearAlignmentIntent();
            });
          }
        });

        return () => {
          el.setAttribute("draggable", "false");
          unbindDefaultDragHandlers();
          unbindDragStart();
          unbindDragEnd();
        };
      },
    };
  }
}
