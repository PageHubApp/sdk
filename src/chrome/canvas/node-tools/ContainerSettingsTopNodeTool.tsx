import { useEditor, useNode } from "@craftjs/core";
import { NodeToolWrapper } from "./NodeDialog";
import { EditModifiersAtom } from "../../toolbar/Label";
import { ViewAtom } from "../../viewport/state/atoms";
import { getPropFinalValue } from "../../viewport/state/viewportExports";
import { AddElement } from "../../viewport/toolbox/toolboxUtils";
import { NodeInlineTooltip } from "./NodeInlineTooltip";
import { TbContainer, TbPlus } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useAtomState } from "@zedux/react";
import { useSetAtomState } from "../../../utils/atoms";
import { AiChatAttachedNodesAtom, AssistantOpenAtom } from "../../../utils/atoms";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { useSlot } from "../../../registry";
import { useAiEnabled } from "../../../utils/hooks/useAiEnabled";
import { DeleteNodeButton } from "./DeleteNodeButton";
import { DuplicateNodeButton } from "./DuplicateNodeButton";

export function ContainerSettingsTopNodeTool({ direction = "horizontal" }) {
  const aiEnabled = useAiEnabled();
  const aiGenerateSlot = useSlot<{ onClick: () => void; className?: string }>(
    "node/ai-generate-button",
    undefined
  );
  const aiContextSlot = useSlot<{ onClick: () => void; className?: string }>(
    "node/ai-context-button",
    undefined
  );
  const [, setAttachedNodes] = useAtomState(AiChatAttachedNodesAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
  const { nodeProps, id, displayName } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
    displayName:
      (node.data.custom?.displayName as string | undefined) ||
      (node.data.displayName as string | undefined) ||
      String(node.data.name || "Container"),
  }));

  /** Basic layout containers suppress extra chrome (AI, duplicate, add-components). */
  const suppressContainerChromeTools =
    !nodeProps.type || nodeProps.type === "container" || nodeProps.type === "section";
  /** Match `DeleteNodeController` strip: tight gap, no segment padding on anchors. */
  const compactToolbar = suppressContainerChromeTools && direction === "horizontal";
  const segmentBorder = "border-r border-base-300 pr-2";
  const deleteSegmentBorder = "border-l border-base-300 pl-2";

  const { value } = getPropFinalValue(
    {
      propKey: "flexDirection",
      propType: "class",
    },
    view,
    nodeProps,
    classDark
  );

  const { actions, query } = useEditor();

  const { open: openPanel } = usePanelUrl();

  const match =
    ["flex-row", "flex-row-reverse"].includes(value) ||
    ["flex-col", "flex-col-reverse"].includes(value);
  const isSideBySide = ["flex-row", "flex-row-reverse"].includes(value);

  const addStructureChild = async () => {
    const { Container } = await import("../../../components/Container/Container");

    const childDisplayName = isSideBySide ? "Column" : "Block";
    const childClassName = isSideBySide
      ? "flex min-w-0 w-full flex-col gap-4"
      : "flex w-full flex-col gap-4";

    AddElement({
      element: (
        <Container
          canDelete={true}
          className={childClassName}
          custom={{ displayName: childDisplayName, layoutChild: true }}
        />
      ),
      actions,
      query,
    });
  };

  const pinNodeInAiChat = () => {
    setAttachedNodes(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, displayName }];
    });
    setAssistantOpen({ nodeId: id, revealPanel: true });
  };

  return (
    <NodeToolWrapper col={direction !== "horizontal"} dense={compactToolbar}>
      {direction === "horizontal" && !suppressContainerChromeTools && aiEnabled && aiGenerateSlot && (
        <NodeInlineTooltip
          variant="container"
          content="Add something with AI"
          className={segmentBorder}
        >
          {aiGenerateSlot.render({
            onClick: () => setAssistantOpen({ nodeId: id, mode: "create", revealPanel: true }),
            className: "tool-button",
          })}
        </NodeInlineTooltip>
      )}

      {direction === "horizontal" &&
        aiEnabled &&
        aiContextSlot &&
        id !== "ROOT" &&
        (compactToolbar ? (
          <NodeInlineTooltip variant="strip-compact" content="Include in AI chat">
            {aiContextSlot.render({
              onClick: pinNodeInAiChat,
              className: "tool-button",
            })}
          </NodeInlineTooltip>
        ) : (
          <NodeInlineTooltip
            variant="container"
            content="Include in AI chat"
            className={segmentBorder}
          >
            {aiContextSlot.render({
              onClick: pinNodeInAiChat,
              className: "tool-button",
            })}
          </NodeInlineTooltip>
        ))}

      {direction === "horizontal" && !suppressContainerChromeTools && (
        <NodeInlineTooltip variant="container" content="Duplicate">
          <DuplicateNodeButton className="tool-button" />
        </NodeInlineTooltip>
      )}

      {match && (
        <NodeInlineTooltip
          variant="container"
          content={isSideBySide ? "Add another column" : "Add another block"}
        >
          <button className="tool-button" onClick={addStructureChild}>
            <TbPlus />
          </button>
        </NodeInlineTooltip>
      )}

      {match && (
        <NodeInlineTooltip variant="container" content="Insert from components">
          <button className="tool-button" onClick={() => openPanel("components")}>
            <TbContainer />
          </button>
        </NodeInlineTooltip>
      )}

      {direction === "horizontal" &&
        (compactToolbar ? (
          <NodeInlineTooltip variant="strip-compact" content="Delete container">
            <DeleteNodeButton
              title="Delete container"
              titleDisabled="Cannot delete"
              className="tool-button"
              suppressNativeTitle
            />
          </NodeInlineTooltip>
        ) : (
          <NodeInlineTooltip
            variant="container"
            content="Delete container"
            className={deleteSegmentBorder}
          >
            <DeleteNodeButton
              title="Delete container"
              titleDisabled="Cannot delete"
              className="tool-button"
              suppressNativeTitle
            />
          </NodeInlineTooltip>
        ))}
    </NodeToolWrapper>
  );
}
