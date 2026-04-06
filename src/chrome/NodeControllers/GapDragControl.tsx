import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "../../utils/tailwind/className";
import { ViewSelectionAtom } from "../Toolbar/Label";
import { ViewAtom } from "../Viewport/atoms";
import { useElementColor } from "./lib";
import { useGapDrag } from "./gap/useGapDrag";

export function GapDragControl() {
  const { id, dom } = useNode(node => ({
    dom: node.dom,
  }));

  const { isSelected } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
  }));

  const {
    actions: { setProp },
  } = useNode();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  const elementColor = useElementColor(dom as HTMLElement, isSelected);

  const { gapHoverInfo, isDragging, handleMouseDown } = useGapDrag({
    dom: dom as HTMLElement | null,
    isSelected,
    classPrefixView,
    classDark,
    setProp,
  });

  const shouldShow = (gapHoverInfo?.show || isDragging) && gapHoverInfo;

  const container = document?.querySelector('[data-container="true"]');
  if (!container) return null;

  return null;
}
