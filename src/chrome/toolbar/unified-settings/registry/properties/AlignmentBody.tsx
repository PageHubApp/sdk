/**
 * Alignment section body — mode-dependent content (flex/grid/block).
 * No ToolbarSection wrapper — PropertySection provides that.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useEffect, useMemo, useState } from "react";
import { TailwindStyles } from "@/utils/tailwind";
import { getPropFinalValue } from "../../../../viewport/viewportExports";
import { ViewAtom } from "../../../../viewport/atoms";
import { ViewSelectionAtom } from "../../../Label";
import { Notice } from "../../../inputs/Notice";
import { FlexDirectionInput } from "../../../inputs/layout/FlexDirectionInput";
import { GapInput } from "../../../inputs/layout/GapInput";
import { useLayoutPreset } from "../../../inputs/layout/hooks/useLayoutPreset";
import { ToolbarDashedButton } from "../../../helpers/ToolbarDashedButton";
import { TailwindInput } from "../../../inputs/advanced/TailwindInput";
import { ToolbarItem } from "../../../ToolbarItem";
import { ToolbarSection } from "../../../ToolbarSection";
import { ItemAdvanceToggle } from "../../../helpers/ItemSelector";

type LayoutMode = "block" | "flex-row" | "flex-col" | "grid";

export function AlignmentBody() {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const { classNameStr, currentLayoutMode } = useNode(node => ({
    classNameStr: node.data?.props.className || "",
    currentLayoutMode: node.data?.props.root?.layoutMode,
  }));

  const nodePropsForRead = useMemo(() => ({ className: classNameStr }), [classNameStr]);
  const currentDisplay = String(
    getPropFinalValue({ propKey: "display", propType: "class" }, view, nodePropsForRead, classDark)
      .value ?? ""
  );
  const currentFlexDirection = String(
    getPropFinalValue(
      { propKey: "flexDirection", propType: "class" },
      view,
      nodePropsForRead,
      classDark
    ).value ?? ""
  );

  const detectLayoutMode = (): LayoutMode => {
    if (currentDisplay.includes("grid")) return "grid";
    if (currentDisplay.includes("flex")) {
      if (currentFlexDirection.includes("flex-col")) return "flex-col";
      return "flex-row";
    }
    if (currentDisplay.includes("block")) return "block";
    if (currentLayoutMode) return currentLayoutMode as LayoutMode;
    return "block";
  };

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(detectLayoutMode());
  useEffect(() => {
    setLayoutMode(detectLayoutMode());
  }, [currentDisplay, currentFlexDirection, currentLayoutMode]);

  const isFlex = layoutMode === "flex-col" || layoutMode === "flex-row";
  const isGrid = layoutMode === "grid";

  const layoutPreset = useLayoutPreset({ propKey: "layoutPreset" });

  return (
    <>
      {isFlex && (
        <>
          <FlexDirectionInput />
          <GapInput />
          <ToolbarItem
            propKey="alignItems"
            type="radio"
            label="Align"
            inline={false}
            cols={true}
            options={[
              { label: "—", value: "" },
              ...TailwindStyles.alignItems.map(v => ({ label: v.replace("items-", ""), value: v })),
            ]}
          />
          <ToolbarItem
            propKey="justifyContent"
            type="radio"
            label="Justify"
            inline={false}
            cols={true}
            options={[
              { label: "—", value: "" },
              ...TailwindStyles.justifyContent.map(v => ({
                label: v.replace("justify-", ""),
                value: v,
              })),
            ]}
          />
          <ItemAdvanceToggle propKey="alignment-flex" title="More alignment properties">
            <ToolbarSection full={1} collapsible={false} nested>
              <ToolbarItem
                propKey="justifyItems"
                type="radio"
                label="Justify Items"
                inline={false}
                cols={true}
                options={[
                  { label: "—", value: "" },
                  ...TailwindStyles.justifyItems.map(v => ({
                    label: v.replace("justify-items-", ""),
                    value: v,
                  })),
                ]}
              />
              <ToolbarItem
                propKey="alignSelf"
                type="radio"
                label="Align Self"
                inline={false}
                cols={true}
                options={[
                  { label: "—", value: "" },
                  ...TailwindStyles.alignSelf.map(v => ({
                    label: v.replace("self-", ""),
                    value: v,
                  })),
                ]}
              />
              <ToolbarItem
                propKey="justifySelf"
                type="radio"
                label="Justify Self"
                inline={false}
                cols={true}
                options={[
                  { label: "—", value: "" },
                  ...TailwindStyles.justifySelf.map(v => ({
                    label: v.replace("justify-self-", ""),
                    value: v,
                  })),
                ]}
              />
              <TailwindInput propKey="flexBase" label="Grow/Shrink" prop="flexBase" />
            </ToolbarSection>
          </ItemAdvanceToggle>
        </>
      )}
      {isGrid && (
        <>
          <ToolbarItem
            propKey="gridCols"
            type="dropdown"
            label="Columns"
            options={TailwindStyles.gridCols}
          />
          <ToolbarItem
            propKey="gridRows"
            type="dropdown"
            label="Rows"
            options={TailwindStyles.gridRows}
          />
          <ToolbarItem
            propKey="gridColSpan"
            type="select"
            label="Col Span"
            options={TailwindStyles.gridColSpan}
          />
          <ToolbarItem
            propKey="gridRowSpan"
            type="select"
            label="Row Span"
            options={TailwindStyles.gridRowSpan}
          />
          <ToolbarItem
            propKey="placeContent"
            type="radio"
            label="Place Content"
            inline={false}
            cols={true}
            options={[
              { label: "—", value: "" },
              ...TailwindStyles.placeContent.map(v => ({
                label: v.replace("place-content-", ""),
                value: v,
              })),
            ]}
          />
          <ItemAdvanceToggle propKey="alignment-grid" title="More alignment properties">
            <ToolbarSection full={1} collapsible={false} nested>
              <ToolbarItem
                propKey="placeItems"
                type="radio"
                label="Place Items"
                inline={false}
                cols={true}
                options={[
                  { label: "—", value: "" },
                  ...TailwindStyles.placeItems.map(v => ({
                    label: v.replace("place-items-", ""),
                    value: v,
                  })),
                ]}
              />
              <ToolbarItem
                propKey="placeSelf"
                type="radio"
                label="Place Self"
                inline={false}
                cols={true}
                options={[
                  { label: "—", value: "" },
                  ...TailwindStyles.placeSelf.map(v => ({
                    label: v.replace("place-self-", ""),
                    value: v,
                  })),
                ]}
              />
            </ToolbarSection>
          </ItemAdvanceToggle>
        </>
      )}
      {!isFlex && !isGrid && (
        <>
          <Notice>Switch to Flex or Grid to configure alignment.</Notice>
          <div className="mt-2 flex flex-col gap-2">
            <ToolbarDashedButton
              icon={null}
              onClick={() => layoutPreset.switchToMode("flex-row")}
            >
              Use flex layout
            </ToolbarDashedButton>
            <ToolbarDashedButton icon={null} onClick={() => layoutPreset.switchToMode("grid")}>
              Use grid layout
            </ToolbarDashedButton>
          </div>
        </>
      )}
    </>
  );
}
