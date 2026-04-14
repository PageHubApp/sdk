import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { TailwindStyles } from "@/utils/tailwind";
import { getClass, removeClass } from "@/utils/tailwind/className";
import {
  parseGoogleFontFromArbitraryClass,
  tailwindTokenBase,
} from "@/utils/tailwind/fontFamilyClass";
import { resolveTheme, writeTheme } from "@/utils/design/resolveTheme";

import { AiOutlineAlignRight } from "react-icons/ai";
import {
  TbAlignCenter,
  TbAlignJustified,
  TbAlignLeft,
  TbAlignRight,
  TbClearAll,
  TbPlus,
  TbTypography,
} from "react-icons/tb";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { ItemAdvanceToggle } from "../../helpers/ItemSelector";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { Wrap } from "../../ToolbarStyle";
import { FontFamilyInput } from "./FontFamilyInput";
import { TypographyPresetSelect } from "./TypographyPresetSelect";
import { TailwindInput } from "../advanced/TailwindInput";
import { ColorInput } from "../color/ColorInput";

// ─── Tailwind class → CSS value maps ───

const FONT_SIZE_MAP: Record<string, string> = {
  "text-xs": "0.75rem",
  "text-sm": "0.875rem",
  "text-base": "1rem",
  "text-lg": "1.125rem",
  "text-xl": "1.25rem",
  "text-2xl": "1.5rem",
  "text-3xl": "1.875rem",
  "text-4xl": "2.25rem",
  "text-5xl": "3rem",
  "text-6xl": "3.75rem",
  "text-7xl": "4.5rem",
  "text-8xl": "6rem",
  "text-9xl": "8rem",
};

const FONT_WEIGHT_MAP: Record<string, string> = {
  "font-thin": "100",
  "font-extralight": "200",
  "font-light": "300",
  "font-normal": "400",
  "font-medium": "500",
  "font-semibold": "600",
  "font-bold": "700",
  "font-extrabold": "800",
  "font-black": "900",
};

const LINE_HEIGHT_MAP: Record<string, string> = {
  "leading-3": "0.75rem",
  "leading-4": "1rem",
  "leading-5": "1.25rem",
  "leading-6": "1.5rem",
  "leading-7": "1.75rem",
  "leading-8": "2rem",
  "leading-9": "2.25rem",
  "leading-10": "2.5rem",
  "leading-none": "1",
  "leading-tight": "1.25",
  "leading-snug": "1.375",
  "leading-normal": "1.5",
  "leading-relaxed": "1.625",
  "leading-loose": "2",
};

const TRACKING_MAP: Record<string, string> = {
  "tracking-tighter": "-0.05em",
  "tracking-tight": "-0.025em",
  "tracking-normal": "normal",
  "tracking-wide": "0.025em",
  "tracking-wider": "0.05em",
  "tracking-widest": "0.1em",
};

function readNodeFontValues(className: string): {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
} {
  const get = (key: string) => getClass(className, key) || "";

  // Font family — parse arbitrary class like font-['Playfair_Display']
  const fontFamilyToken = get("fontFamily");
  const base = fontFamilyToken ? tailwindTokenBase(fontFamilyToken) : "";
  const fontFamily = base ? parseGoogleFontFromArbitraryClass(base) || "" : "";

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

/** CSS class suffix for a typography preset name (e.g. `ph-hero-heading`). */
function toTypographyPresetClassName(name: string): string {
  const slug = name
    .replace(/([A-Z])/g, "-$1")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/^-/, "");
  return `ph-${slug}`;
}

function SaveAsFontPreset({
  className,
  query,
  actions,
  hasPresets,
}: {
  className: string;
  query: any;
  actions: any;
  hasPresets: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [savedBanner, setSavedBanner] = useState("");
  const [duplicateError, setDuplicateError] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const flashSaved = (label: string) => {
    setSavedBanner(label);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      setSavedBanner("");
      savedTimerRef.current = null;
    }, 2000);
  };

  if (!open) {
    return (
      <div className="space-y-1.5">
        {savedBanner ? (
          <p className="text-primary text-[11px]" role="status">
            Saved &ldquo;{savedBanner}&rdquo;
          </p>
        ) : null}
        {hasPresets ? (
          <button
            type="button"
            onClick={() => {
              setDuplicateError(false);
              setOpen(true);
            }}
            className="border-base-300 bg-base-200/80 text-base-content hover:border-primary hover:bg-accent flex w-full items-center justify-center gap-1.5 rounded-md border border-solid px-2 py-1.5 text-[11px] transition-colors"
          >
            <TbPlus size={12} aria-hidden />
            Add font preset
          </button>
        ) : (
          <ToolbarDashedButton
            onClick={() => {
              setDuplicateError(false);
              setOpen(true);
            }}
          >
            Save as font preset
          </ToolbarDashedButton>
        )}
      </div>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const rootNode = query.node(ROOT_NODE).get();
    const theme = resolveTheme(rootNode?.data?.props || {});
    const existing = theme.typography || [];
    if (existing.some((f: any) => f.name === trimmed)) {
      setDuplicateError(true);
      return;
    }
    setDuplicateError(false);

    const values = readNodeFontValues(className);
    const newFont = { name: trimmed, ...values };

    actions.setProp(ROOT_NODE, (props: any) => {
      const t = resolveTheme(props);
      const fonts = [...(t.typography || [])];
      fonts.push(newFont);
      writeTheme(props, { ...t, typography: fonts });
    });

    setName("");
    setOpen(false);
    flashSaved(trimmed);
  };

  return (
    <div className="border-base-300 bg-neutral/50 mt-2 space-y-2 rounded-lg border p-2.5">
      <div>
        <label className="text-neutral-content mb-1 block text-[11px] font-medium">
          Preset Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setDuplicateError(false);
          }}
          placeholder="e.g. Hero Heading"
          className="border-base-300 bg-base-200 h-7 w-full rounded border px-2 text-xs"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setName("");
              setDuplicateError(false);
              setOpen(false);
            }
          }}
        />
        {duplicateError ? (
          <p className="text-error mt-1 text-[10px]" role="alert">
            A preset with that name already exists.
          </p>
        ) : null}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          className="bg-primary text-primary-content h-7 rounded px-3 text-xs"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setName("");
            setDuplicateError(false);
            setOpen(false);
          }}
          className="border-base-300 h-7 rounded border px-3 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export const FontInput = () => {
  // Collector must return a plain object — returning an array breaks useCollector's
  // `{ ...collected, actions, query }` merge (arrays spread to numeric keys) and
  // can prevent reliable updates / break `.map` on the presets list.
  const {
    query,
    actions: editorActions,
    typography,
  } = useEditor(state => ({
    typography: resolveTheme(state.nodes[ROOT_NODE]?.data?.props || {}).typography || [],
  }));
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
  const helperTokens = helpers.split(/\s+/).filter(Boolean);

  const activePresetName =
    typography.find((f: any) => helperTokens.includes(toTypographyPresetClassName(f.name)))?.name ??
    null;

  const clearTypographyPreset = () => {
    const rootNode = query.node(ROOT_NODE).get();
    const theme = resolveTheme(rootNode?.data?.props || {});
    const allTypographyClasses = (theme.typography || []).map((f: any) =>
      toTypographyPresetClassName(f.name)
    );

    setProp((props: any) => {
      props.typographyClass = "";
      const helperClasses = (props.helpers || "").split(/\s+/).filter((c: string) => c.trim());
      props.helpers = helperClasses
        .filter((c: string) => !allTypographyClasses.includes(c))
        .join(" ")
        .trim();
    }, 500);
  };

  const applyTypographyPreset = (font: any) => {
    if (!font || !font.name) return;

    const presetClass = toTypographyPresetClassName(font.name);

    // Get all typography presets to remove any existing typography classes
    const rootNode = query.node(ROOT_NODE).get();
    const theme = resolveTheme(rootNode?.data?.props || {});
    const allTypographyClasses = (theme.typography || []).map((f: any) =>
      toTypographyPresetClassName(f.name)
    );

    setProp((props: any) => {
      // Store the typography class reference
      props.typographyClass = presetClass;

      // Remove old typography classes from helpers, add new one
      const helperClasses = (props.helpers || "").split(" ").filter((c: string) => c.trim());
      const cleanedHelpers = helperClasses.filter((c: string) => !allTypographyClasses.includes(c));
      cleanedHelpers.push(presetClass);
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
            <TailwindInput
              propKey="whiteSpace"
              label="White Space"
              prop="whiteSpace"
              type="select"
            />
            <TailwindInput propKey="textWrap" label="Text Wrap" prop="textWrap" type="select" />
            <TailwindInput propKey="hyphens" label="Hyphens" prop="hyphens" type="select" />
            <TailwindInput
              propKey="verticalAlign"
              label="Vertical Align"
              prop="verticalAlign"
              type="select"
            />
            <TailwindInput
              propKey="fontSmoothing"
              label="Smoothing"
              prop="fontSmoothing"
              type="select"
            />
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

      {typography.length > 0 ? (
        <div className="mb-2">
          <Wrap
            props={{ label: "Preset", labelHide: false }}
            lab=""
            viewValue="mobile"
            propType="class"
            propKey="typographyPreset"
            inline={true}
            inputWidth="flex-1"
          >
            <TypographyPresetSelect
              presets={typography}
              selectedName={activePresetName}
              onSelect={preset => {
                if (!preset) clearTypographyPreset();
                else applyTypographyPreset(preset);
              }}
              id="input-typographyPreset"
            />
          </Wrap>
        </div>
      ) : null}

      <SaveAsFontPreset
        className={nodeClassName}
        query={query}
        actions={editorActions}
        hasPresets={typography.length > 0}
      />
    </ToolbarSection>
  );
};
