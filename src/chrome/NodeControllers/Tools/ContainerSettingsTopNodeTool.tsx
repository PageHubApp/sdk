import { useEditor, useNode } from "@craftjs/core";
import { ToolbarItem } from "../../Toolbar/ToolbarItem";
import { FlexDirectionInput } from "../../Toolbar/Inputs/layout/FlexDirectionInput";
import { NodeToolWrapper } from "../../Tools/NodeDialog";
import { ViewSelectionAtom } from "../../Toolbar/Label";
import { ViewAtom } from "../../Viewport/atoms";
import { getPropFinalValue } from "../../Viewport/lib";
import { AddElement } from "../../Viewport/Toolbox/lib";
import { Tooltip } from "components/layout/Tooltip";
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
import { useSetAtomState } from "../../../utils/atoms";
import { ClippyOpenAtom, SettingsAtom } from "utils/atoms";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { useSDK } from "../../../context";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
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
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const settings = useAtomValue(SettingsAtom);
  const { nodeProps, id } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
  }));

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
    (["flex-row", "flex-row-reverse"].includes(value)) ||
    (["flex-col", "flex-col-reverse"].includes(value));

  return (
    <NodeToolWrapper col={direction !== "horizontal"}>
      {direction == "horizontal" && (
        <>
          <SelectParentNodeTool
            parentType="Nav"
            icon={
              <Tooltip content="Select Navigation" className="border-r border-base-300 pr-2">
                <TbNavigation />
              </Tooltip>
            }
          ></SelectParentNodeTool>
        </>
      )}

      {direction === "horizontal" && aiEnabled && renderNodeAi && (
        <Tooltip content="Add something with AI" className="border-r border-base-300 pr-2">
          {renderNodeAi({
            onClick: () => setClippyOpen({ nodeId: id, mode: "create" }),
            className: "tool-button",
          })}
        </Tooltip>
      )}

      {direction === "horizontal" && (
        <Tooltip content="Duplicate">
          <DuplicateNodeButton className="tool-button" />
        </Tooltip>
      )}

      <Tooltip
        content={`Align items ${direction === "horizontal" ? "horizontally" : "vertically"}`}
        className="hidden"
      >
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
      </Tooltip>

      {direction == "horizontal" && (
        <div className="tool-button hidden">
          <FlexDirectionInput wrap="control" type="toggleNext" inline={false} />
        </div>
      )}

      {match && (
        <Tooltip
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
                    className={`flex justify-center w-full ${isRow ? "flex-col" : "flex-row"}`}
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
        </Tooltip>
      )}

      {match && (
        <Tooltip content="Add components">
          <button
            className={`tool-button ${direction == "horizontal" ? "-rotate-90" : ""}`}
            onClick={() => openPanel("components")}
          >
            <TbPlus />
          </button>
        </Tooltip>
      )}

      {direction === "horizontal" && (
        <Tooltip content="Delete container" className="border-l border-base-300 pl-2">
          <DeleteNodeButton
            title="Delete container"
            titleDisabled="Cannot delete"
            className="tool-button"
          />
        </Tooltip>
      )}

    </NodeToolWrapper>
  );
}

