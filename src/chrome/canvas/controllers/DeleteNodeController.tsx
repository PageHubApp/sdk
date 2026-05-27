import { useEditor, useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { useAiEnabled } from "../../../utils/hooks/useAiEnabled";
import { AiChatAttachedNodesAtom, AssistantOpenAtom } from "../../../utils/atoms";
import { useSetAtomState } from "../../../utils/atoms";
import { useSlot } from "../../../registry";
import RenderNodeControlInline from "../../rendering/RenderNodeControlInline";
import { DeleteNodeButton } from "../node-tools/DeleteNodeButton";
import { NodeInlineTooltip } from "../node-tools/NodeInlineTooltip";

export const DeleteNodeController = () => {
  const { id, displayName, canDelete } = useNode(node => {
    const t = node.data.props?.type;
    return {
      id: node.id,
      canDelete:
        node.data.props?.canDelete !== false &&
        node.data.custom?.permissions?.canDelete !== false &&
        t !== "page" &&
        t !== "header" &&
        t !== "footer",
      displayName:
        (node.data.custom?.displayName as string | undefined) ||
        (node.data.displayName as string | undefined) ||
        String(node.data.name || "Element"),
    };
  });

  const aiEnabled = useAiEnabled();
  const aiContextSlot = useSlot<{ onClick: () => void; className?: string }>(
    "node/ai-context-button",
    undefined
  );
  const [, setAttachedNodes] = useAtomState(AiChatAttachedNodesAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);

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
    setAssistantOpen({ nodeId: id, revealPanel: true });
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
        {aiEnabled && canPinContext && aiContextSlot ? (
          <NodeInlineTooltip variant="strip" content="Include in AI chat">
            {aiContextSlot.render({
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
