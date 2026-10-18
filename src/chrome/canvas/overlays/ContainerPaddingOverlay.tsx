import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useEditorActive } from "../../../core/context";
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
  // Its position timer keeps ticking while shown, so it steps aside while the
  // host keeps the editor hidden (the selection itself stays).
  const editorActive = useEditorActive();

  if (!dom || !isSelected || !editorActive) return null;

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
