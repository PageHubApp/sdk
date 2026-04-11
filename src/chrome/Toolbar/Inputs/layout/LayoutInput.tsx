import { useNode } from "@craftjs/core";
import { ViewAtom } from "../../../Viewport/atoms";
import React, { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { TailwindStyles } from "utils/tailwind";
import { getPropFinalValue } from "../../../Viewport/lib";
import { Notice } from "../Notice";
import { FlexDirectionInput } from "./FlexDirectionInput";
import { GapInput } from "./GapInput";
import { TailwindInput } from "../advanced/TailwindInput";
import { LayoutPresetInput } from "./LayoutPresetInput";
import { useLayoutPreset } from "./hooks/useLayoutPreset";
import { SizeInput } from "./SizeInput";
import { TbBoxModel, TbBrandTailwind, TbBraces, TbLayoutAlignCenter, TbMathFunction, TbArrowUp, TbArrowDown, TbArrowLeft, TbArrowRight } from "react-icons/tb";
import { UniversalInput } from "../UniversalInput";
import { TypeSelector } from "../UniversalInput/TypeSelector";
import type { ValueType } from "../UniversalInput/types";
import { ViewSelectionAtom } from "../../Label";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { ToolbarDashedButton } from "../../Helpers/ToolbarDashedButton";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";

type LayoutMode = "block" | "flex-row" | "flex-col" | "grid";

/**
 * Combined layout input — fixed section list, content varies by mode.
 */
export function LayoutInput({
  hidePresets,
  mode = "full"
}: { hidePresets?: boolean; mode?: "full" | "spacing" | "alignment" }) {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const { classNameStr, currentLayoutMode } = useNode(node => ({
    classNameStr: node.data.props.className || "",
    currentLayoutMode: node.data.props.root?.layoutMode,
  }));

  const nodePropsForRead = useMemo(() => ({ className: classNameStr }), [classNameStr]);
  const currentDisplay =
    String(
      getPropFinalValue({ propKey: "display", propType: "class" }, view, nodePropsForRead, classDark).value ?? "",
    );
  const currentFlexDirection =
    String(
      getPropFinalValue({ propKey: "flexDirection", propType: "class" }, view, nodePropsForRead, classDark).value ??
        "",
    );

  const detectLayoutMode = (): LayoutMode => {
    if (currentDisplay.includes("grid")) return "grid";
    if (currentDisplay.includes("flex")) {
      // CSS default flex-direction is row; only flex-col* is explicitly column.
      if (currentFlexDirection.includes("flex-col")) return "flex-col";
      return "flex-row";
    }
    if (currentDisplay.includes("block")) return "block";
    if (currentLayoutMode) return currentLayoutMode as LayoutMode;
    return "block";
  };

  /** Match FlexDirectionInput mode to the real main axis (row → L/R, column → T/B). */
  const flexDirectionUIMode = (): "rows" | "columns" => {
    if (currentFlexDirection.includes("flex-col")) return "columns";
    return "rows";
  };

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(detectLayoutMode());

  useEffect(() => {
    setLayoutMode(detectLayoutMode());
  }, [currentDisplay, currentFlexDirection, currentLayoutMode]);

  const isFlex = layoutMode === "flex-col" || layoutMode === "flex-row";
  const isGrid = layoutMode === "grid";

  // Master type selector for spacing box model
  const [spacingType, setSpacingType] = useState<ValueType>("tailwind");
  const spacingTypes = useMemo(() => [
    { id: "tailwind" as ValueType, label: <TbBrandTailwind className="size-3" /> },
    { id: "calc" as ValueType, label: <TbMathFunction className="size-3" /> },
    { id: "var" as ValueType, label: <TbBraces className="size-3" /> },
    { id: "px" as ValueType, label: "px" },
    { id: "em" as ValueType, label: "em" },
    { id: "rem" as ValueType, label: "rem" },
    { id: "%" as ValueType, label: "%" },
  ], []);

  const layoutPreset = useLayoutPreset({ propKey: "layoutPreset" });

  return (
    <>
      {!hidePresets && mode === "full" && <LayoutPresetInput lp={layoutPreset} />}

      {(mode === "full" || mode === "alignment") && (
        <ToolbarSection title="Alignment" icon={<TbLayoutAlignCenter />} help="How child elements are arranged and aligned." footer={
          isFlex ? (
            <ItemAdvanceToggle propKey="alignment-flex" title="More alignment properties">
              <ToolbarSection full={1} collapsible={false}>
                <ToolbarItem
                  propKey="justifyItems"
                  type="radio"
                  label="Justify Items"
                  inline={false}
                  cols={true}
                  options={[
                    { label: "—", value: "" },
                    ...TailwindStyles.justifyItems.map(v => ({ label: v.replace("justify-items-", ""), value: v })),
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
                    ...TailwindStyles.alignSelf.map(v => ({ label: v.replace("self-", ""), value: v })),
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
                    ...TailwindStyles.justifySelf.map(v => ({ label: v.replace("justify-self-", ""), value: v })),
                  ]}
                />
                <TailwindInput propKey="flexBase" label="Grow/Shrink" prop="flexBase" />
              </ToolbarSection>
            </ItemAdvanceToggle>
          ) : isGrid ? (
            <ItemAdvanceToggle propKey="alignment-grid" title="More alignment properties">
              <ToolbarSection full={1} collapsible={false}>
                <ToolbarItem
                  propKey="placeItems"
                  type="radio"
                  label="Place Items"
                  inline={false}
                  cols={true}
                  options={[
                    { label: "—", value: "" },
                    ...TailwindStyles.placeItems.map(v => ({ label: v.replace("place-items-", ""), value: v })),
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
                    ...TailwindStyles.placeSelf.map(v => ({ label: v.replace("place-self-", ""), value: v })),
                  ]}
                />
              </ToolbarSection>
            </ItemAdvanceToggle>
          ) : null
        }>
          {isFlex && (
            <>
              <FlexDirectionInput mode={flexDirectionUIMode()} />
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
                  ...TailwindStyles.justifyContent.map(v => ({ label: v.replace("justify-", ""), value: v })),
                ]}
              />
            </>
          )}
          {isGrid && (
            <>
              <ToolbarItem propKey="gridCols" type="dropdown" label="Columns" options={TailwindStyles.gridCols} />
              <ToolbarItem propKey="gridRows" type="dropdown" label="Rows" options={TailwindStyles.gridRows} />
              <ToolbarItem propKey="gridColSpan" type="select" label="Col Span" options={TailwindStyles.gridColSpan} />
              <ToolbarItem propKey="gridRowSpan" type="select" label="Row Span" options={TailwindStyles.gridRowSpan} />
              <ToolbarItem
                propKey="placeContent"
                type="radio"
                label="Place Content"
                inline={false}
                cols={true}
                options={[
                  { label: "—", value: "" },
                  ...TailwindStyles.placeContent.map(v => ({ label: v.replace("place-content-", ""), value: v })),
                ]}
              />
            </>
          )}
          {!isFlex && !isGrid && (
            <>
              <Notice>Switch to Flex or Grid to configure alignment.</Notice>
              <div className="mt-2 flex flex-col gap-2">
                <ToolbarDashedButton icon={null} onClick={() => layoutPreset.switchToMode("flex-row")}>
                  Use flex layout
                </ToolbarDashedButton>
                <ToolbarDashedButton icon={null} onClick={() => layoutPreset.switchToMode("grid")}>
                  Use grid layout
                </ToolbarDashedButton>
              </div>
            </>
          )}
        </ToolbarSection>
      )}

      {mode === "full" && <SizeInput />}

      {/* Spacing — combined Margin + Padding */}
      {(mode === "full" || mode === "spacing") && (
      <ToolbarSection title="Spacing" icon={<TbBoxModel />} full={1} help="Padding (inner space) and margin (outer space)." header={
        <TypeSelector types={spacingTypes} selectedType={spacingType} onTypeChange={setSpacingType} />
      }>
        {/* Grouped sections using standardized nested ToolbarSections */}
        <div className="flex flex-col gap-1 py-1">
          {/* Padding Group */}
          <ToolbarSection title="Padding" nested full={2} collapsible={false}>
            <UniversalInput propKey="pt" propTag="pt" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Top" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
            <UniversalInput propKey="pb" propTag="pb" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Bottom" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
            <UniversalInput propKey="pl" propTag="pl" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Left" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
            <UniversalInput propKey="pr" propTag="pr" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Right" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
          </ToolbarSection>

          {/* Margin Group */}
          <ToolbarSection title="Margin" nested full={2} collapsible={false}>
            <UniversalInput propKey="mt" propTag="mt" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Top" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
            <UniversalInput propKey="mb" propTag="mb" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Bottom" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
            <UniversalInput propKey="ml" propTag="ml" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Left" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
            <UniversalInput propKey="mr" propTag="mr" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} 
              label="Right" labelWidth="w-12" showVarSelector={true} overrideType={spacingType} inline />
          </ToolbarSection>
        </div>

        {/* Shorthand controls */}
        <ItemAdvanceToggle propKey="spacing" title="Shorthand controls">
          <div className="space-y-1 pt-1">
            <ToolbarSection title="Margin Shorthand" nested full={1} collapsible={false}>
              <UniversalInput propKey="m" propTag="m" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="All Sides" showVarSelector={true} inline />
              <UniversalInput propKey="mx" propTag="mx" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Horizontal (X)" showVarSelector={true} inline />
              <UniversalInput propKey="my" propTag="my" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Vertical (Y)" showVarSelector={true} inline />
            </ToolbarSection>

            <ToolbarSection title="Padding Shorthand" nested full={1} collapsible={false}>
              <UniversalInput propKey="p" propTag="p" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="All Sides" showVarSelector={true} inline />
              <UniversalInput propKey="px" propTag="px" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Horizontal (X)" showVarSelector={true} inline />
              <UniversalInput propKey="py" propTag="py" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Vertical (Y)" showVarSelector={true} inline />
            </ToolbarSection>
          </div>
        </ItemAdvanceToggle>
      </ToolbarSection>
      )}
    </>
  );
}

export default LayoutInput;
