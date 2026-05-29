import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "../../../utils/tailwind/className";
import { EditModifiersAtom } from "../../toolbar/Label";
import { ViewAtom } from "../../viewport/state/atoms";
import { PaddingOverlay } from "./PaddingOverlay";

export function ContainerPaddingOverlay() {
  const { id, dom } = useNode(node => ({ dom: node.dom }));
  const { isSelected } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
  }));
  const {
    actions: { setProp },
  } = useNode();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
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
