import { useEditor, useNode } from "@craftjs/core";
import { ToolbarItem } from "../../toolbar/ToolbarItem";
import { FlexDirectionInput } from "../../toolbar/inputs/layout/FlexDirectionInput";
import { NodeToolWrapper } from "../../inline-tools/NodeDialog";
import { ViewSelectionAtom } from "../../toolbar/Label";
import { ViewAtom } from "../../viewport/atoms";
import { getPropFinalValue } from "../../viewport/viewportExports";
import { AddElement } from "../../viewport/toolbox/toolboxUtils";
import { NodeInlineTooltip } from "./NodeInlineTooltip";
import {
  TbLayoutAlignBottom,
  TbLayoutAlignCenter,
  TbLayoutAlignLeft,
  TbLayoutAlignMiddle,
  TbLayoutAlignRight,
  TbLayoutAlignTop,
  TbNavigation,
  TbPlus,
  TbRowInsertTop,
} from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useAtomState } from "@zedux/react";
import { useSetAtomState } from "../../../utils/atoms";
import { AiChatAttachedNodesAtom, AssistantOpenAtom } from "../../../utils/atoms";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { useSDK } from "../../../core/context";
import { useAiEnabled } from "../../../utils/hooks/useAiEnabled";
import { DeleteNodeButton } from "./DeleteNodeButton";
import { DuplicateNodeButton } from "./DuplicateNodeButton";
import SelectParentNodeTool from "./SelectParentNodeTool";

// Helper function to get alignment options based on direction and value
const getAlignmentOptions = (direction, value) => {
  const isHorizontal = direction === "horizontal";
  const horizontal = isHorizontal ? "items" : "justify";
  const vertical = isHorizontal ? "justify" : "items";

  if (isHorizontal) {
    return [
      {
        value: `${horizontal}-start`,
        label: value === "flex-row-reverse" ? <TbLayoutAlignRight /> : <TbLayoutAlignLeft />,
      },
      { value: `${horizontal}-center`, label: <TbLayoutAlignCenter /> },
      {
        value: `${horizontal}-end`,
        label: value === "flex-row-reverse" ? <TbLayoutAlignLeft /> : <TbLayoutAlignRight />,
      },
    ];
  } else {
    return [
      {
        value: `${vertical}-start`,
        label: value === "flex-col-reverse" ? <TbLayoutAlignBottom /> : <TbLayoutAlignTop />,
      },
      { value: `${vertical}-center`, label: <TbLayoutAlignMiddle /> },
      {
        value: `${vertical}-end`,
        label: value === "flex-col-reverse" ? <TbLayoutAlignTop /> : <TbLayoutAlignBottom />,
      },
    ];
  }
};

// Helper function to determine the propKey based on direction and value
const determinePropKey = (direction, value) => {
  if (direction === "horizontal") {
    return ["flex-row", "flex-row-reverse"].includes(value) ? "justifyContent" : "alignItems";
  } else {
    return ["flex-row", "flex-row-reverse"].includes(value) ? "alignItems" : "justifyContent";
  }
};

export function ContainerSettingsTopNodeTool({ direction = "horizontal" }) {
  const { config } = useSDK();
  const aiEnabled = useAiEnabled();
  const renderNodeAi = config.editorChromeSlots?.renderNodeAiGenerateButton;
  const renderNodeContext = config.editorChromeSlots?.renderNodeAiContextButton;
  const [, setAttachedNodes] = useAtomState(AiChatAttachedNodesAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const { nodeProps, id, displayName, craftName } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
    craftName: node.data.name as string | undefined,
    displayName:
      (node.data.custom?.displayName as string | undefined) ||
      (node.data.displayName as string | undefined) ||
      String(node.data.name || "Container"),
  }));

  /** Layout `Container` only — keep insert/add-components on `ContainerGroup` etc. */
  const suppressContainerChromeTools = craftName === "Container";
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

  const propKey = determinePropKey(direction, value);
  const options = getAlignmentOptions(direction, value);

  const { actions, query } = useEditor();
  const {
    actions: { setProp },
  } = useEditor();

  const { open: openPanel } = usePanelUrl();

  const match =
    ["flex-row", "flex-row-reverse"].includes(value) ||
    ["flex-col", "flex-col-reverse"].includes(value);

  const pinNodeInAiChat = () => {
    setAttachedNodes(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, displayName }];
    });
    setAssistantOpen({ nodeId: id });
  };

  return (
    <NodeToolWrapper col={direction !== "horizontal"} dense={compactToolbar}>
      {direction == "horizontal" && (
        <>
          <SelectParentNodeTool
            parentType="Nav"
            icon={
              <NodeInlineTooltip
                variant={compactToolbar ? "strip-compact" : "container"}
                content="Select navigation"
                className={compactToolbar ? "" : segmentBorder}
              >
                <TbNavigation />
              </NodeInlineTooltip>
            }
          ></SelectParentNodeTool>
        </>
      )}

      {direction === "horizontal" && !suppressContainerChromeTools && aiEnabled && renderNodeAi && (
        <NodeInlineTooltip
          variant="container"
          content="Add something with AI"
          className={segmentBorder}
        >
          {renderNodeAi({
            onClick: () => setAssistantOpen({ nodeId: id, mode: "create" }),
            className: "tool-button",
          })}
        </NodeInlineTooltip>
      )}

      {direction === "horizontal" &&
        aiEnabled &&
        renderNodeContext &&
        id !== "ROOT" &&
        (compactToolbar ? (
          <NodeInlineTooltip variant="strip-compact" content="Include in AI chat">
            {renderNodeContext({
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
            {renderNodeContext({
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

      {!suppressContainerChromeTools && (
        <div className="hidden">
          <div className="tool-button">
            <ToolbarItem
              propKey={propKey}
              type="toggleNext"
              label=""
              labelHide={true}
              cols={direction === "horizontal"}
              wrap="control"
              options={options}
              propType="class"
              inline={false}
            />
          </div>
        </div>
      )}

      {direction == "horizontal" && (
        <div className="tool-button hidden">
          <FlexDirectionInput wrap="control" inline={false} />
        </div>
      )}

      {match && !suppressContainerChromeTools && (
        <NodeInlineTooltip
          variant="container"
          content={`Add ${["flex-row", "flex-row-reverse"].includes(value) ? "column" : "row"} container`}
        >
          <button
            className={`tool-button ${["flex-row", "flex-row-reverse"].includes(value) ? "-rotate-90" : ""}`}
            onClick={async () => {
              const { Container } = await import("../../../components/Container");
              const isRow = ["flex-row", "flex-row-reverse"].includes(value);
              AddElement({
                element: (
                  <Container
                    canDelete={true}
                    className={`flex w-full justify-center ${isRow ? "flex-col" : "flex-row"}`}
                    custom={{ displayName: isRow ? "Column" : "Row" }}
                  />
                ),
                actions,
                query,
              });
            }}
          >
            <TbRowInsertTop />
          </button>
        </NodeInlineTooltip>
      )}

      {match && !suppressContainerChromeTools && (
        <NodeInlineTooltip variant="container" content="Add components">
          <button
            className={`tool-button ${direction == "horizontal" ? "-rotate-90" : ""}`}
            onClick={() => openPanel("components")}
          >
            <TbPlus />
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
