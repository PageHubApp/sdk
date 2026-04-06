import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { TailwindStyles } from "utils/tailwind";
import { removeClass } from "../../../../utils/tailwind/className";

import { AiOutlineAlignRight } from "react-icons/ai";
import {
  TbAlignCenter,
  TbAlignJustified,
  TbAlignLeft,
  TbAlignRight,
  TbClearAll,
  TbTypography,
} from "react-icons/tb";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { FontFamilyInput } from "./FontFamilyInput";
import { TailwindInput } from "../advanced/TailwindInput";

export const FontInput = () => {
  const { query } = useEditor();
  const {
    actions: { setProp },
    helpers,
  } = useNode(node => ({
    helpers: node.data.props.helpers || "",
  }));

  const applyTypographyPreset = (font: any) => {
    if (!font || !font.name) return;

    // Generate the CSS class name for this typography preset
    const toCSSVarName = (name: string): string => {
      return name
        .replace(/([A-Z])/g, "-$1")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .replace(/^-/, "");
    };

    const className = `ph-${toCSSVarName(font.name)}`;

    // Get all typography presets to remove any existing typography classes
    const rootNode = query.node(ROOT_NODE).get();
    const typography = rootNode?.data?.props?.typography || [];
    const allTypographyClasses = typography.map((f: any) => `ph-${toCSSVarName(f.name)}`);

    setProp((props: any) => {
      // Store the typography class reference
      props.typographyClass = className;

      // Remove old typography classes from helpers, add new one
      const helperClasses = (props.helpers || "").split(" ").filter((c: string) => c.trim());
      const cleanedHelpers = helperClasses.filter((c: string) => !allTypographyClasses.includes(c));
      cleanedHelpers.push(className);
      props.helpers = cleanedHelpers.join(" ").trim();

      // Remove font classes from className so the typography preset takes effect
      props.className = removeClass(props.className || "", "fontSize");
      props.className = removeClass(props.className || "", "fontWeight");
      props.className = removeClass(props.className || "", "lineHeight");
      props.className = removeClass(props.className || "", "tracking");
      props.className = removeClass(props.className || "", "fontFamily");
    }, 500);
  };

  return (
    <ToolbarSection
      title="Typography"
      icon={<TbTypography />}
      help="Font family, size, weight, and text alignment."
      footer={
        <ItemAdvanceToggle propKey="font" title="More typography properties">
          <ToolbarSection full={1} collapsible={false}>
            <ToolbarItem
              propKey="lineHeight"
              type="select"
              label="Line Height"
              max={TailwindStyles.lineHeight.length - 1}
              min={0}
              valueLabels={TailwindStyles.lineHeight}
            />

            <ToolbarItem
              propKey="tracking"
              type="select"
              label="Tracking"
              max={TailwindStyles.tracking.length - 1}
              min={0}
              valueLabels={TailwindStyles.tracking}
            />
            <TailwindInput propKey="transform" label="Transform" prop="transform" type="select" />

            <TailwindInput propKey="wordBreak" label="Word Break" prop="wordBreak" type="select" />

            <TailwindInput
              propKey="textOverflow"
              label="Text Overflow"
              prop="textOverflow"
              type="select"
            />
            <TailwindInput propKey="indent" label="Indent" prop="indent" />
            <TailwindInput
              propKey="textDecoration"
              label="Decoration"
              prop="textDecoration"
              type="select"
            />
            <TailwindInput
              propKey="decorationStyle"
              label="Decoration Style"
              prop="decorationStyle"
              type="select"
            />
            <TailwindInput
              propKey="decorationThickness"
              label="Decoration Size"
              prop="decorationThickness"
              type="select"
            />
            <TailwindInput propKey="fontStyle" label="Italic" prop="fontStyle" type="select" />
            <TailwindInput propKey="whiteSpace" label="White Space" prop="whiteSpace" type="select" />
            <TailwindInput propKey="textWrap" label="Text Wrap" prop="textWrap" type="select" />
            <TailwindInput propKey="hyphens" label="Hyphens" prop="hyphens" type="select" />
            <TailwindInput propKey="verticalAlign" label="Vertical Align" prop="verticalAlign" type="select" />
            <TailwindInput propKey="fontSmoothing" label="Smoothing" prop="fontSmoothing" type="select" />
            <TailwindInput propKey="float" label="Float" prop="float" type="select" />
          </ToolbarSection>
        </ItemAdvanceToggle>
      }
    >
      <ToolbarItem
        propKey="textAlign"
        type="radio"
        label="Align"
        cols={true}
        options={[
          { label: <TbClearAll />, value: "" },
          { value: "text-left", label: <TbAlignLeft /> },
          { value: "text-center", label: <TbAlignCenter /> },
          { value: "text-right", label: <AiOutlineAlignRight /> },
          { value: "text-justify", label: <TbAlignJustified /> },
          { value: "text-start", label: <TbAlignLeft /> },
          { value: "text-end", label: <TbAlignRight /> },
        ]}
      />

      <FontFamilyInput />

      <ToolbarItem
        propKey="fontSize"
        type="select"
        label="Size"
        max={TailwindStyles.fontSize.length - 1}
        min={0}
        valueLabels={TailwindStyles.fontSize}
        showVarSelector={true}
        varSelectorPrefix="text"
      />

      <ToolbarItem
        propKey="fontWeight"
        type="select"
        label="Weight"
        max={TailwindStyles.fontWeight.length - 1}
        min={0}
        valueLabels={TailwindStyles.fontWeight}
        showVarSelector={true}
        varSelectorPrefix="font"
      />

      {/* Typography Presets */}
      {(() => {
        const rootNode = query.node(ROOT_NODE).get();
        const typography = rootNode?.data?.props?.typography || [];

        if (typography.length > 0) {
          // Helper to convert font name to class name
          const toCSSVarName = (name: string): string => {
            return name
              .replace(/([A-Z])/g, "-$1")
              .replace(/\s+/g, "-")
              .toLowerCase()
              .replace(/^-/, "");
          };

          // Check which preset is currently active
          const isActive = (font: any): boolean => {
            const className = `ph-${toCSSVarName(font.name)}`;
            return helpers.includes(className);
          };

          return (
            <div className="mb-3">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                Presets
              </span>
              <div className="scrollbar-light max-h-[140px] overflow-auto">
                <div className="flex flex-col gap-1.5">
                  {typography.map((font: any, index: number) => {
                    const active = isActive(font);
                    return (
                      <button
                        key={index}
                        onClick={() => applyTypographyPreset(font)}
                        className={`rounded-lg border px-3 py-2 text-left transition-all ${
                          active
                            ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                            : "border-border bg-background hover:border-primary hover:bg-accent"
                        }`}
                        title={`${font.fontFamily} • ${font.fontSize} • ${font.fontWeight}`}
                      >
                        <div
                          className={`truncate ${active ? "text-primary" : "text-foreground"}`}
                          style={{
                            fontFamily: font.fontFamily,
                            fontSize: font.fontSize,
                            fontWeight: font.fontWeight,
                            lineHeight: font.lineHeight,
                            letterSpacing: font.letterSpacing || "normal",
                            textTransform: (font.textTransform || "none") as any,
                          }}
                        >
                          {font.name}
                        </div>
                        <div
                          className={`mt-0.5 truncate text-[10px] ${active ? "text-primary/70" : "text-muted-foreground"}`}
                        >
                          {font.fontFamily} • {font.fontSize}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </ToolbarSection>
  );
};
