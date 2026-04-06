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

        const unbindDragStart = this.addCraftEventListener(el, "dragstart", e => {
          const nativeEvent = (e as any).nativeEvent || e;

          if (nativeEvent.dataTransfer) {
            const dragPreview = document.createElement("div");
            dragPreview.className = "w-5 h-5 bg-blue-500 rounded border border-white/30 absolute -top-[9999px] -left-[9999px] opacity-80 shadow-md";

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
          const nodeType = node?.data?.props?.type || "";
          if (nodeType) {
            document.body.setAttribute("data-dragging-type", nodeType);
          }
        });

        const unbindDragEnd = this.addCraftEventListener(el, "dragend", e => {
          el.removeAttribute("data-dragging");
          document.body.removeAttribute("data-is-dragging");
          document.body.removeAttribute("data-dragging-type");
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
