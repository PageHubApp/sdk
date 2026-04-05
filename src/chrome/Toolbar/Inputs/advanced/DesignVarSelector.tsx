// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { changeProp } from "../../../Viewport/lib";
import { getRect } from "../../../Viewport/useRect";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { TbSearch, TbVariable } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { resolveColorForDisplay } from "utils/design/colorSystem";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "utils/defaults";
import { ViewSelectionAtom } from "../../Label";
import { DesignVarDialogAtom } from "../../Tools/DesignVarDialog";
import { useDialog } from "../../Tools/lib";

interface DesignVar {
  name: string;
  varName: string; // --primary
  value: string; // The actual value
  category: "palette" | "typography" | "spacing" | "colors" | "other";
  label: string; // Display name
}

interface DesignVarSelectorProps {
  propKey: string;
  propType: string;
  viewValue: string;
  prefix?: string; // Like "text", "bg", "border", "font"
}

// Simple color resolution function
const resolveColor = (color: string): string => {
  // Use the centralized color system utility
  const resolved = resolveColorForDisplay(color, "");
  return resolved.backgroundColor || color;
};

export const DesignVarSelector: React.FC<DesignVarSelectorProps> = ({
  propKey,
  propType,
  viewValue,
  prefix = "",
}) => {
  const [dialog, setDialog] = useAtomState(DesignVarDialogAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef<HTMLButtonElement>(null);

  const {
    actions: { setProp },
    id,
  } = useNode(node => ({
    id: node.id,
  }));

  const { query, actions } = useEditor();

  useDialog(dialog, setDialog, ref, propKey);

  // Get design system vars - start with defaults, then merge runtime overrides
  const designVarsResult = useEditor(state => {
    const rootNode = state.nodes[ROOT_NODE];
    const runtimePalette = rootNode?.data?.props?.pallet || [];
    const runtimeTypography = rootNode?.data?.props?.typography || [];
    const runtimeStyleGuide = rootNode?.data?.props?.styleGuide || {};

    const vars: DesignVar[] = [];

    // Use runtime palette if available, otherwise use defaults
    const palette = runtimePalette.length > 0 ? runtimePalette : DEFAULT_PALETTE;

    // Palette colors
    palette.forEach((item: any) => {
      if (item?.name && item?.color) {
        const varName = item.name
          .replace(/([A-Z])/g, "-$1")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .replace(/^-/, "");

        vars.push({
          name: item.name,
          varName: `--${varName}`,
          value: resolveColor(item.color),
          category: "palette",
          label: `${item.name} (Palette)`,
        });
      }
    });

    // Custom typography fonts
    runtimeTypography.forEach((font: any, index: number) => {
      if (font?.name) {
        const varName = font.name
          .replace(/([A-Z])/g, "-$1")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .replace(/^-/, "");

        // Add font family variable
        vars.push({
          name: `${font.name} Font Family`,
          varName: `--${varName}-font-family`,
          value: font.fontFamily || "Inter",
          category: "typography",
          label: `${font.name} Font Family`,
        });

        // Add font size variable
        vars.push({
          name: `${font.name} Font Size`,
          varName: `--${varName}-font-size`,
          value: font.fontSize || "1rem",
          category: "typography",
          label: `${font.name} Font Size`,
        });

        // Add font weight variable - convert numeric weights to Tailwind classes
        let fontWeightValue = font.fontWeight || "font-normal";
        // Convert numeric weights to Tailwind classes if needed
        const fontWeightMap: Record<string, string> = {
          "100": "font-thin",
          "200": "font-extralight",
          "300": "font-light",
          "400": "font-normal",
          "500": "font-medium",
          "600": "font-semibold",
          "700": "font-bold",
          "800": "font-extrabold",
          "900": "font-black",
        };
        if (fontWeightMap[fontWeightValue]) {
          fontWeightValue = fontWeightMap[fontWeightValue];
        }

        vars.push({
          name: `${font.name} Font Weight`,
          varName: `--${varName}-font-weight`,
          value: fontWeightValue,
          category: "typography",
          label: `${font.name} Font Weight`,
        });

        // Add line height variable
        vars.push({
          name: `${font.name} Line Height`,
          varName: `--${varName}-line-height`,
          value: font.lineHeight || "1.5",
          category: "typography",
          label: `${font.name} Line Height`,
        });

        // Add letter spacing variable
        vars.push({
          name: `${font.name} Letter Spacing`,
          varName: `--${varName}-letter-spacing`,
          value: font.letterSpacing || "normal",
          category: "typography",
          label: `${font.name} Letter Spacing`,
        });

        // Add text transform variable
        vars.push({
          name: `${font.name} Text Transform`,
          varName: `--${varName}-text-transform`,
          value: font.textTransform || "none",
          category: "typography",
          label: `${font.name} Text Transform`,
        });
      }
    });

    // Merge default style guide with runtime overrides
    const styleGuide = { ...DEFAULT_STYLE_GUIDE, ...runtimeStyleGuide };

    // Style guide vars with categories and labels
    const styleVarMap: Record<string, { category: string; label: string }> = {
      headingFontFamily: {
        category: "typography",
        label: "Heading Font Family",
      },
      bodyFontFamily: { category: "typography", label: "Body Font Family" },
      headingFont: { category: "typography", label: "Heading Font Weight" },
      bodyFont: { category: "typography", label: "Body Font Weight" },
      containerPadding: { category: "spacing", label: "Container Padding" },
      buttonPadding: { category: "spacing", label: "Button Padding" },
      sectionGap: { category: "spacing", label: "Section Gap" },
      containerGap: { category: "spacing", label: "Container Gap" },
      contentWidth: { category: "spacing", label: "Content Width" },
      borderRadius: { category: "other", label: "Border Radius" },
      shadowStyle: { category: "other", label: "Shadow Style" },
      inputBorderColor: { category: "colors", label: "Input Border Color" },
      inputBorderWidth: { category: "other", label: "Input Border Width" },
      inputBorderRadius: { category: "other", label: "Input Border Radius" },
      inputPadding: { category: "spacing", label: "Input Padding" },
      inputBgColor: { category: "colors", label: "Input Background" },
      inputTextColor: { category: "colors", label: "Input Text" },
      inputPlaceholderColor: { category: "colors", label: "Input Placeholder" },
      inputFocusRing: { category: "other", label: "Input Focus Ring" },
      inputFocusRingColor: {
        category: "colors",
        label: "Input Focus Ring Color",
      },
      linkColor: { category: "colors", label: "Link Color" },
      linkHoverColor: { category: "colors", label: "Link Hover Color" },
      linkUnderline: { category: "other", label: "Link Underline" },
      linkUnderlineOffset: {
        category: "other",
        label: "Link Underline Offset",
      },
    };

    Object.entries(styleGuide).forEach(([key, value]) => {
      if (value && styleVarMap[key]) {
        const varName = key
          .replace(/([A-Z])/g, "-$1")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .replace(/^-/, "");

        vars.push({
          name: key,
          varName: `--${varName}`,
          value: String(value),
          category: styleVarMap[key].category as any,
          label: styleVarMap[key].label,
        });
      }
    });

    return vars;
  });

  // Ensure designVars is always an array
  // useEditor can return an object with numeric keys, so we need to handle that
  let designVars: DesignVar[] = [];
  if (Array.isArray(designVarsResult)) {
    designVars = designVarsResult;
  } else if (designVarsResult && typeof designVarsResult === "object") {
    // Convert object with numeric keys to array
    designVars = Object.keys(designVarsResult)
      .filter(key => !isNaN(Number(key))) // Only numeric keys
      .map(key => designVarsResult[key])
      .filter(item => item && typeof item === "object" && "varName" in item); // Valid DesignVar objects
  }

  // Map prefix to relevant categories
  const getRelevantCategories = (prefix: string): string[] => {
    const prefixToCategories: Record<string, string[]> = {
      // Color-related prefixes
      text: ["palette", "colors"],
      bg: ["palette", "colors"],
      border: ["palette", "colors"],
      ring: ["spacing", "colors", "palette"],
      "ring-offset": ["spacing", "colors", "palette"],
      outline: ["spacing", "colors", "palette"],
      "outline-offset": ["spacing", "colors", "palette"],

      // Spacing-related prefixes
      px: ["spacing"],
      py: ["spacing"],
      pt: ["spacing"],
      pb: ["spacing"],
      pl: ["spacing"],
      pr: ["spacing"],
      mt: ["spacing"],
      mb: ["spacing"],
      ml: ["spacing"],
      mr: ["spacing"],
      mx: ["spacing"],
      my: ["spacing"],
      gap: ["spacing"],
      w: ["spacing"],
      h: ["spacing"],
      "min-w": ["spacing"],
      "max-w": ["spacing"],
      "min-h": ["spacing"],
      "max-h": ["spacing"],

      // Typography-related prefixes
      font: ["typography"],

      // Other prefixes
      rounded: ["other"],
      shadow: ["other"],
      block: ["other"],
      static: ["other"],
      relative: ["other"],
      absolute: ["other"],
      fixed: ["other"],
      sticky: ["other"],
    };

    return prefixToCategories[prefix] || ["palette", "typography", "spacing", "colors", "other"];
  };

  // Filter vars by prefix (category) and search term
  const relevantCategories = getRelevantCategories(prefix);
  const filteredVars = designVars.filter(
    v =>
      relevantCategories.includes(v.category) &&
      (v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.varName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group by category
  const groupedVars = filteredVars.reduce(
    (acc, v) => {
      if (!acc[v.category]) acc[v.category] = [];
      acc[v.category].push(v);
      return acc;
    },
    {} as Record<string, DesignVar[]>
  );

  // Handle selecting a variable
  const handleSelect = (designVar: DesignVar) => {
    let view = viewValue;
    if (propType === "component" || propType === "root") {
      view = "component";
    }

    let value: string;

    if (propKey === "fontFamily") {
      value = `font-(${designVar.varName})`;
    }
    // SPECIAL CASE: fontWeight and other class-based props use the actual value
    // (e.g., font-bold instead of font-[var(...)])
    else if (propKey === "fontWeight" || propKey === "fontSize" || propKey === "lineHeight") {
      value = designVar.value; // Direct value like "font-bold", "text-xl", "leading-relaxed"
    }
    // For colors, use Tailwind arbitrary value syntax
    // e.g., "text-(--primary)" or "bg-(--heading-color)"
    else {
      value = prefix ? `${prefix}-[var(${designVar.varName})]` : `var(${designVar.varName})`;
    }

    changeProp({
      propKey,
      value,
      setProp,
      propType,
      view,
      query,
      actions,
      nodeId: id,
      classDark,
    });

    // Close dialog
    setDialog({ ...dialog, enabled: false });
    setSearchTerm("");
  };

  const categoryLabels = {
    palette: "Palette Colors",
    typography: "Typography",
    spacing: "Spacing",
    colors: "Theme Colors",
    other: "Other",
  };

  const closeDialog = () => {
    setDialog({ ...dialog, enabled: false });
    setSearchTerm("");
  };

  return (
    <>
      <button
        ref={ref}
        onClick={() => {
          setDialog({
            enabled: true,
            value: "",
            prefix,
            propKey,
            changed: handleSelect,
            e: getRect(ref.current),
          });
        }}
        className="flex size-5 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Bind to design system variable"
      >
        <TbVariable className="size-3.5" />
      </button>

      {dialog.enabled && (
        <DesignVarDialog
          dialog={dialog}
          setDialog={setDialog}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          groupedVars={groupedVars}
          categoryLabels={categoryLabels}
          handleSelect={handleSelect}
          closeDialog={closeDialog}
        />
      )}
    </>
  );
};

// Custom Dialog Component for Design Variables
const DesignVarDialog = ({
  dialog,
  setDialog,
  searchTerm,
  setSearchTerm,
  groupedVars,
  categoryLabels,
  handleSelect,
  closeDialog,
}: {
  dialog: any;
  setDialog: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  groupedVars: Record<string, DesignVar[]>;
  categoryLabels: Record<string, string>;
  handleSelect: (designVar: DesignVar) => void;
  closeDialog: () => void;
}) => {
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-design-var-dialog]")) {
        closeDialog();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDialog]);

  const rect = dialog.e;
  if (!rect) return null;

  // Calculate position like the original Dialog component
  const availableHeight = window.innerHeight - rect.bottom - 20;
  const maxHeight = Math.min(400, availableHeight, window.innerHeight * 0.6);
  const isUpward = availableHeight < 200;

  const style = isUpward
    ? {
        position: "absolute" as const,
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        zIndex: 10000,
        maxHeight: Math.min(400, rect.top - 20, window.innerHeight * 0.6),
        width: 320, // Fixed width instead of using rect.width
      }
    : {
        position: "absolute" as const,
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: 10000,
        maxHeight,
        width: 320, // Fixed width instead of using rect.width
      };

  return ReactDOM.createPortal(
    <>
      {/* Backdrop to close dialog when clicking outside */}
      <div className="pointer-events-auto fixed inset-0 z-9999" onClick={closeDialog} />

      <div style={style} className="pointer-events-auto z-10000" data-design-var-dialog>
        <div className="overflow-hidden rounded-lg border border-border bg-background p-0 shadow-xl">
          {/* Search input */}
          <div className="shrink-0 border-b border-border bg-muted px-2 pb-1 pt-2">
            <div className="relative">
              <TbSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Search design variables..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Variable list */}
          <div className="scrollbar max-h-80 overflow-y-auto p-2">
            {Object.keys(groupedVars).length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No variables found
              </div>
            ) : (
              Object.entries(groupedVars).map(([category, vars]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="rounded bg-muted/30 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {categoryLabels[category as keyof typeof categoryLabels] || category}
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {(vars as DesignVar[]).map(v => (
                      <button
                        key={v.varName}
                        onClick={() => handleSelect(v)}
                        className="group w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium leading-tight text-foreground">
                              {v.label}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              {v.varName}
                            </span>
                            {v.category === "palette" && (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="size-3 shrink-0 rounded-lg border border-border"
                                  style={{ backgroundColor: v.value }}
                                />
                                <span className="text-[10px] text-muted-foreground">{v.value}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
