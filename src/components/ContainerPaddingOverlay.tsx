import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "../utils/tailwind/className";
import { ViewSelectionAtom } from "../chrome/toolbar/Label";
import { ViewAtom } from "../chrome/viewport/atoms";
import { PaddingOverlay } from "../chrome/canvas/PaddingOverlay";

export function ContainerPaddingOverlay() {
  const { id, dom } = useNode(node => ({ dom: node.dom }));
  const { isSelected } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
  }));
  const {
    actions: { setProp },
  } = useNode();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  if (!dom || !isSelected) return null;

  return (
    <PaddingOverlay
      targetElement={dom as HTMLElement}
      isActive={isSelected}
      setProp={setProp}
      classPrefixView={classPrefixView}
      classDark={classDark}
    />
  );
}
