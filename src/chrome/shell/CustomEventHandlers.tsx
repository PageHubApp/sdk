import { DefaultEventHandlers, NodeId } from "@craftjs/core";
import type { DragTarget, Indicator } from "@craftjs/core";
import { onBesideDrop } from "./besideDrop";
import {
  getDragOrigin,
  setDragOrigin,
  getCommittedAlignment,
  getLastResolvedIntent,
  resetSpatialState,
} from "./findPosition2D";
import { executeSpatialDrop } from "./spatial/executeSpatialDrop";
import { setDragCopyIntent } from "./spatial/spatialSession";
import { Container } from "../../components/Container";

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => console.log(`[drag] ${label}`, data ?? "")
  : () => {};

// ── Handler ──────────────────────────────────────────────────────────

export default class CustomEventHandlers extends DefaultEventHandlers {
  protected executeDrop(dragTarget: DragTarget, indicator: Indicator): void {
    const { actions, query } = this.options.store;
    const where = indicator.placement.where;
    const isBeside = where === "beside-left" || where === "beside-right";

    const origin = getDragOrigin();
    const committed = getCommittedAlignment();

    const index = indicator.placement.index + (where === "after" ? 1 : 0);
    const parentId = indicator.placement.parent.id;
    const parentNodes = query.node(parentId).get()?.data?.nodes || [];
    const currentIndex = dragTarget.type === "existing" ? parentNodes.indexOf(dragTarget.nodes[0]) : -1;

    if (isBeside) {
      log("drop-beside", { where, placementIntent: getLastResolvedIntent() });
    } else {
      log("drop-reorder", {
        where,
        placementIntent: getLastResolvedIntent(),
        rawIndex: indicator.placement.index,
        targetIndex: index,
        parentId,
        currentIndex,
        parentChildCount: parentNodes.length,
        nodeId: dragTarget.type === "existing" ? dragTarget.nodes[0] : "new",
        sameParent: dragTarget.type === "existing" && origin?.parentId === parentId,
      });
    }

    if (!isBeside && committed && dragTarget.type === "existing") {
      const targetId = origin?.nodeId || dragTarget.nodes[0];
      if (targetId) {
        log("drop-align", {
          zone: committed.intent.zone,
          axis: committed.intent.axis,
          targetId,
        });
      }
    }

    executeSpatialDrop(Container, dragTarget, indicator, actions, query, { origin, committed });
    resetSpatialState();
  }

  handlers() {
    const defaultHandlers = super.handlers();
    const {
      store: { query },
    } = this.options;

    return {
      ...defaultHandlers,
      drag: (el: HTMLElement, id: NodeId) => {
        if (!query.node(id)?.isDraggable()) return () => {};

        const unbindDefault = defaultHandlers.drag(el, id);

        const unbindDragStart = this.addCraftEventListener(el, "dragstart", e => {
          const nativeEvent = (e as any).nativeEvent || e;

          if (nativeEvent.dataTransfer) {
            const dragPreview = document.createElement("div");
            dragPreview.className =
              "w-5 h-5 bg-blue-500 rounded border border-white/30 absolute -top-[9999px] -left-[9999px] opacity-80 shadow-md";
            document.body.appendChild(dragPreview);
            nativeEvent.dataTransfer.setDragImage(dragPreview, 10, 10);
            nativeEvent.dataTransfer.effectAllowed = "copyMove";
            requestAnimationFrame(() => {
              if (dragPreview.parentNode) dragPreview.parentNode.removeChild(dragPreview);
            });
          }

          const applyCopyIntentFromModifiers = (shift: boolean) => {
            setDragCopyIntent(shift);
            if (shift) {
              document.body.setAttribute("data-ph-drag-copy", "true");
            } else {
              document.body.removeAttribute("data-ph-drag-copy");
            }
          };
          applyCopyIntentFromModifiers(nativeEvent.shiftKey === true);

          // During native HTML5 drag, keydown/keyup often do not fire. Modifier state must be read from
          // DragEvent.shiftKey on dragover (continuous) and drag (periodic on the source).
          const syncCopyFromDragEvent = (de: DragEvent) => {
            applyCopyIntentFromModifiers(de.shiftKey === true);
          };
          document.addEventListener("dragover", syncCopyFromDragEvent, true);
          el.addEventListener("drag", syncCopyFromDragEvent);

          const syncShiftDuringDrag = (ke: KeyboardEvent) => {
            applyCopyIntentFromModifiers(ke.shiftKey === true);
          };
          document.addEventListener("keydown", syncShiftDuringDrag, true);
          document.addEventListener("keyup", syncShiftDuringDrag, true);

          (el as HTMLElement & { __phShiftDragCleanup?: () => void }).__phShiftDragCleanup = () => {
            document.removeEventListener("dragover", syncCopyFromDragEvent, true);
            el.removeEventListener("drag", syncCopyFromDragEvent);
            document.removeEventListener("keydown", syncShiftDuringDrag, true);
            document.removeEventListener("keyup", syncShiftDuringDrag, true);
            delete (el as HTMLElement & { __phShiftDragCleanup?: () => void }).__phShiftDragCleanup;
          };

          el.setAttribute("data-dragging", "true");
          document.body.setAttribute("data-is-dragging", "true");

          const node = query.node(id).get();
          const dom = node?.dom as HTMLElement | undefined;
          const rect = dom?.getBoundingClientRect();
          const startX = rect ? rect.left + rect.width / 2 : 0;
          const startY = rect ? rect.top + rect.height / 2 : 0;
          setDragOrigin(id, node?.data?.parent, startX, startY);
          log("start", { nodeId: id, parentId: node?.data?.parent });

          const nodeType = node?.data?.props?.type || "";
          if (nodeType) document.body.setAttribute("data-dragging-type", nodeType);
        });

        const unbindDragEnd = this.addCraftEventListener(el, "dragend", () => {
          const cleanup = (el as HTMLElement & { __phShiftDragCleanup?: () => void }).__phShiftDragCleanup;
          cleanup?.();
          document.body.removeAttribute("data-ph-drag-copy");
          setDragCopyIntent(false);
          el.removeAttribute("data-dragging");
          document.body.removeAttribute("data-is-dragging");
          document.body.removeAttribute("data-dragging-type");
          resetSpatialState();
        });

        return () => {
          el.setAttribute("draggable", "false");
          (el as HTMLElement & { __phShiftDragCleanup?: () => void }).__phShiftDragCleanup?.();
          document.body.removeAttribute("data-ph-drag-copy");
          setDragCopyIntent(false);
          unbindDefault();
          unbindDragStart();
          unbindDragEnd();
        };
      },
    };
  }
}
