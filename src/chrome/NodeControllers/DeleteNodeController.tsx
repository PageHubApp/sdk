import { useEditor, useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { AiChatAttachedNodesAtom, ClippyOpenAtom } from "utils/atoms";
import { useSetAtomState } from "../../utils/atoms";
import { useSDK } from "../../context";
import RenderNodeControlInline from "../RenderNodeControlInline";
import { DeleteNodeButton } from "./Tools/DeleteNodeButton";
import { NodeInlineTooltip } from "./Tools/NodeInlineTooltip";

export const DeleteNodeController = () => {
  const { id, displayName, canDelete } = useNode(node => ({
    id: node.id,
    canDelete: node.data.props?.canDelete !== false,
    displayName:
      (node.data.custom?.displayName as string | undefined) ||
      (node.data.displayName as string | undefined) ||
      String(node.data.name || "Element"),
  }));

  const { config } = useSDK();
  const aiEnabled = useAiEnabled();
  const renderContext = config.editorChromeSlots?.renderNodeAiContextButton;
  const [, setAttachedNodes] = useAtomState(AiChatAttachedNodesAtom);
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  const canPinContext = id !== "ROOT";

  const handleAddToContext = () => {
    if (!canPinContext) return;
    setAttachedNodes(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, displayName }];
    });
    setClippyOpen({ nodeId: id });
  };

  if (!isActive) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-delete`}
      position="top"
      align="end"
      className="pointer-events-auto! items-center whitespace-nowrap select-none"
    >
      <div
        className="node-control pointer-events-auto relative z-110 flex items-center gap-0.5"
        onMouseDown={e => e.stopPropagation()}
        onMouseDownCapture={e => e.stopPropagation()}
      >
        {aiEnabled && canPinContext && renderContext ? (
          <NodeInlineTooltip variant="strip" content="Include in AI chat">
            {renderContext({
              onClick: handleAddToContext,
              className: "tool-button",
            })}
          </NodeInlineTooltip>
        ) : null}
        <NodeInlineTooltip variant="strip" content={canDelete ? "Delete" : "Cannot delete"}>
          <DeleteNodeButton className="tool-button" suppressNativeTitle />
        </NodeInlineTooltip>
      </div>
    </RenderNodeControlInline>
  );
};
