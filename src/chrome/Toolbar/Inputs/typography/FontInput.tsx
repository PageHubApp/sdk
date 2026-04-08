import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { useState } from "react";
import { TailwindStyles } from "utils/tailwind";
import { getClass, removeClass } from "../../../../utils/tailwind/className";
import { parseGoogleFontFromArbitraryClass, tailwindTokenBase } from "../../../../utils/tailwind/fontFamilyClass";
import { resolveTheme, writeTheme } from "../../../../utils/design/resolveTheme";

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
import { ColorInput } from "../color/ColorInput";

// ─── Tailwind class → CSS value maps ───

const FONT_SIZE_MAP: Record<string, string> = {
  "text-xs": "0.75rem", "text-sm": "0.875rem", "text-base": "1rem", "text-lg": "1.125rem",
  "text-xl": "1.25rem", "text-2xl": "1.5rem", "text-3xl": "1.875rem", "text-4xl": "2.25rem",
  "text-5xl": "3rem", "text-6xl": "3.75rem", "text-7xl": "4.5rem", "text-8xl": "6rem", "text-9xl": "8rem",
};

const FONT_WEIGHT_MAP: Record<string, string> = {
  "font-thin": "100", "font-extralight": "200", "font-light": "300", "font-normal": "400",
  "font-medium": "500", "font-semibold": "600", "font-bold": "700", "font-extrabold": "800", "font-black": "900",
};

const LINE_HEIGHT_MAP: Record<string, string> = {
  "leading-3": "0.75rem", "leading-4": "1rem", "leading-5": "1.25rem", "leading-6": "1.5rem",
  "leading-7": "1.75rem", "leading-8": "2rem", "leading-9": "2.25rem", "leading-10": "2.5rem",
  "leading-none": "1", "leading-tight": "1.25", "leading-snug": "1.375",
  "leading-normal": "1.5", "leading-relaxed": "1.625", "leading-loose": "2",
};

const TRACKING_MAP: Record<string, string> = {
  "tracking-tighter": "-0.05em", "tracking-tight": "-0.025em", "tracking-normal": "normal",
  "tracking-wide": "0.025em", "tracking-wider": "0.05em", "tracking-widest": "0.1em",
};

function readNodeFontValues(className: string): {
  fontFamily: string; fontSize: string; fontWeight: string;
  lineHeight: string; letterSpacing: string; textTransform: string;
} {
  const get = (key: string) => getClass(className, key) || "";

  // Font family — parse arbitrary class like font-['Playfair_Display']
  const fontFamilyToken = get("fontFamily");
  const base = fontFamilyToken ? tailwindTokenBase(fontFamilyToken) : "";
  const fontFamily = base ? (parseGoogleFontFromArbitraryClass(base) || "") : "";

  const sizeClass = get("fontSize");
  const weightClass = get("fontWeight");
  const lhClass = get("lineHeight");
  const trackClass = get("tracking");

  return {
    fontFamily,
    fontSize: FONT_SIZE_MAP[sizeClass] || "1rem",
    fontWeight: FONT_WEIGHT_MAP[weightClass] || "400",
    lineHeight: LINE_HEIGHT_MAP[lhClass] || "1.5",
    letterSpacing: TRACKING_MAP[trackClass] || "normal",
    textTransform: "none", // not commonly in className, default
  };
}

function SaveAsFontPreset({ className, query, actions }: {
  className: string;
  query: any;
  actions: any;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xxs mx-auto flex w-full items-center justify-center gap-1 rounded-lg px-2 text-center hover:underline"
      >
        + Save as Font preset
      </button>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const values = readNodeFontValues(className);
    const newFont = { name: trimmed, ...values };

    actions.setProp(ROOT_NODE, (props: any) => {
      const theme = resolveTheme(props);
      const fonts = [...(theme.typography || [])];
      // Don't duplicate by name
      if (fonts.some((f: any) => f.name === trimmed)) return;
      fonts.push(newFont);
      writeTheme(props, { ...theme, typography: fonts });
    });

    setName("");
    setOpen(false);
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-base-300 bg-neutral/50 p-2.5">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-neutral-content">Preset Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Hero Heading"
          className="h-7 w-full rounded border border-base-300 bg-base-100 px-2 text-xs"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setName(""); setOpen(false); }
          }}
        />
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={submit} className="h-7 rounded bg-primary px-3 text-xs text-primary-content">
          Save
        </button>
        <button type="button" onClick={() => { setName(""); setOpen(false); }} className="h-7 rounded border border-base-300 px-3 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}

export const FontInput = () => {
  const { query, actions: editorActions } = useEditor();
  const {
    actions: { setProp },
    helpers,
    tagName,
    nodeClassName,
  } = useNode(node => ({
    helpers: node.data.props.helpers || "",
    tagName: node.data.props.tagName,
    nodeClassName: node.data.props.className || "",
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
    const theme = resolveTheme(rootNode?.data?.props || {});
    const allTypographyClasses = (theme.typography || []).map((f: any) => `ph-${toCSSVarName(f.name)}`);

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

      <ColorInput propKey="color" label="Color" prefix="text" inline />

      {tagName === "Textfit" && (
        <ToolbarItem propKey="textFitMode" type="select" label="Fit Mode" propType="component">
          <option value="oneline">One Line</option>
          <option value="multiline">Multi Line</option>
          <option value="box">Box</option>
          <option value="boxoneline">Box One Line</option>
        </ToolbarItem>
      )}

      {/* Typography Presets */}
      {(() => {
        const rootNode = query.node(ROOT_NODE).get();
        const typography = resolveTheme(rootNode?.data?.props || {}).typography || [];

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
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-base-content">
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
                            : "border-base-300 bg-base-100 hover:border-primary hover:bg-accent"
                        }`}
                        title={`${font.fontFamily} • ${font.fontSize} • ${font.fontWeight}`}
                      >
                        <div
                          className={`truncate ${active ? "text-primary" : "text-base-content"}`}
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
                          className={`mt-0.5 truncate text-[10px] ${active ? "text-primary/70" : "text-neutral-content"}`}
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

      <SaveAsFontPreset className={nodeClassName} query={query} actions={editorActions} />
    </ToolbarSection>
  );
};
