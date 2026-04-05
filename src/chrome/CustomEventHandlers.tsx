// @ts-nocheck
import { DefaultEventHandlers, NodeId } from "@craftjs/core";

export default class CustomEventHandlers extends DefaultEventHandlers {
  handlers() {
    const defaultEventHandlers = super.handlers();
    const {
      store: { query },
    } = this.options;

    return {
      ...defaultEventHandlers,
      drag: (el: HTMLElement, id: NodeId) => {
        if (!query.node(id)?.isDraggable()) return () => { };

        const unbindDefaultDragHandlers = defaultEventHandlers.drag(el, id);

        // Customize drag start to show custom drag preview
        const unbindDragStart = this.addCraftEventListener(el, "dragstart", e => {
          // The event is already the native event in Craft.js
          const nativeEvent = (e as any).nativeEvent || e;

          if (nativeEvent.dataTransfer) {
            // Create a tiny square element for the drag image
            const dragPreview = document.createElement("div");
            dragPreview.className = "w-5 h-5 bg-blue-500 rounded border border-white/30 absolute -top-[9999px] -left-[9999px] opacity-80 shadow-md";

            document.body.appendChild(dragPreview);

            // Use the tiny square as the drag image
            nativeEvent.dataTransfer.setDragImage(dragPreview, 10, 10);
            nativeEvent.dataTransfer.effectAllowed = "move";

            // Clean up after drag starts
            setTimeout(() => {
              if (dragPreview.parentNode) {
                document.body.removeChild(dragPreview);
              }
            }, 0);
          }

          // Mark element as dragging and add body class for CSS to handle
          el.setAttribute("data-dragging", "true");
          document.body.setAttribute("data-is-dragging", "true");
        });

        // Reset on drag end
        const unbindDragEnd = this.addCraftEventListener(el, "dragend", e => {
          el.removeAttribute("data-dragging");
          document.body.removeAttribute("data-is-dragging");
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
