// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import React, { useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  TbArrowNarrowDown,
  TbArrowNarrowLeft,
  TbArrowNarrowRight,
  TbArrowNarrowUp,
  TbArrowsDiagonal,
  TbArrowsDiagonal2,
  TbArrowsHorizontal,
  TbArrowsMove,
  TbArrowsVertical,
  TbBan,
  TbCopy,
  TbCursorText,
  TbHandGrab,
  TbHelp,
  TbLoader,
  TbMenu2,
  TbPlus,
  TbPointer,
  TbSquare,
  TbZoomIn,
  TbZoomOut,
} from "react-icons/tb";
import { resolveColorForDisplay } from "utils/design/colorSystem";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "utils/defaults";
import { dropdownPositionToStyle, useDropdownPosition } from "../../hooks/useDropdownPosition";
import { getLayoutConfig, groupFractionsByDenominator, groupNumericByRange } from "./config";
import { SubgroupItem } from "./SubgroupComponents";
import { DesignVar } from "./types";

interface UnifiedDropdownProps {
  options: {
    named: string[];
    numeric: string[];
    fractions: string[];
    other: string[];
  } | null;
  filteredOptions: string[] | null;
  selectedIndex: number;
  onSelect: (option: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  showVarSelector?: boolean;
  propTag?: string;
  tailwindKey?: string;
  searchValue?: string;
  currentValue?: string;
  selectedType?: string;
}

export const UnifiedDropdown: React.FC<UnifiedDropdownProps> = ({
  options,
  filteredOptions,
  selectedIndex,
  onSelect,
  inputRef,
  showVarSelector,
  propTag,
  tailwindKey,
  searchValue,
  currentValue,
  selectedType,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState({
    vars: true,
    named: true,
    numeric: true,
    fractions: true,
    other: true,
  });
  const [varSearchTerm, setVarSearchTerm] = useState("");

  // Get layout configuration for this property type
  const layoutConfig = getLayoutConfig(propTag, tailwindKey);

  // Get real design system vars - same logic as DesignVarSelector
  const designVars = useEditor(state => {
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
          value: resolveColorForDisplay(item.color, "").backgroundColor || item.color,
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
      headingFontFamily: { category: "typography", label: "Heading Font Family" },
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
      inputFocusRingColor: { category: "colors", label: "Input Focus Ring Color" },
      linkColor: { category: "colors", label: "Link Color" },
      linkHoverColor: { category: "colors", label: "Link Hover Color" },
      linkUnderline: { category: "other", label: "Link Underline" },
      linkUnderlineOffset: { category: "other", label: "Link Underline Offset" },
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
  let realDesignVars: DesignVar[] = [];
  if (Array.isArray(designVars)) {
    realDesignVars = designVars;
  } else if (designVars && typeof designVars === "object") {
    // Convert object with numeric keys to array
    realDesignVars = Object.keys(designVars)
      .filter(key => !isNaN(Number(key))) // Only numeric keys
      .map(key => designVars[key])
      .filter(item => item && typeof item === "object" && "varName" in item); // Valid DesignVar objects
  }

  // Smart dropdown positioning with directional opening (must call hook unconditionally)
  const position = useDropdownPosition({
    isOpen: true,
    anchorRef: inputRef,
    offset: 4,
    maxHeight: 400,
    minSpaceRequired: 200,
  });

  // Determine what to show based on selectedType
  const isVarMode = selectedType === "var";

  // Don't show dropdown if there's nothing to display
  const hasOptions =
    options &&
    (options.named.length > 0 ||
      options.numeric.length > 0 ||
      options.fractions.length > 0 ||
      options.other.length > 0);
  const hasDesignVars = showVarSelector && realDesignVars.length > 0;

  // In var mode, only show if we have design vars
  // In tailwind mode, only show if we have tailwind options
  if (isVarMode) {
    if (!hasDesignVars) return null;
  } else {
    if (!hasOptions) return null;
  }

  if (!position) return null;

  const style = {
    ...dropdownPositionToStyle(position),
    width: Math.max(320, position.width),
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Helper to get display label (strip prefix)
  const getDisplayLabel = (option: string) => {
    if (!propTag) return option;
    const prefix = `${propTag}-`;
    return option.startsWith(prefix) ? option.replace(prefix, "") : option;
  };

  // Helper to render preview icon based on type
  const renderPreview = (option: string, previewType?: "cursor" | "color" | "shadow") => {
    if (!previewType) return null;

    switch (previewType) {
      case "cursor": {
        const cursorValue = option.replace("cursor-", "");

        // Map cursor types to icons
        const getCursorIcon = () => {
          switch (cursorValue) {
            case "pointer":
              return <TbPointer className="size-3" />;
            case "default":
            case "auto":
              return <TbArrowNarrowUp className="size-3" />;
            case "text":
            case "vertical-text":
              return <TbCursorText className="size-3" />;
            case "move":
            case "all-scroll":
              return <TbArrowsMove className="size-3" />;
            case "grab":
            case "grabbing":
              return <TbHandGrab className="size-3" />;
            case "not-allowed":
            case "no-drop":
              return <TbBan className="size-3" />;
            case "wait":
            case "progress":
              return <TbLoader className="size-3" />;
            case "help":
            case "context-menu":
              return <TbHelp className="size-3" />;
            case "crosshair":
            case "cell":
              return <TbPlus className="size-3" />;
            case "copy":
            case "alias":
              return <TbCopy className="size-3" />;
            case "zoom-in":
              return <TbZoomIn className="size-3" />;
            case "zoom-out":
              return <TbZoomOut className="size-3" />;
            case "col-resize":
            case "ew-resize":
              return <TbArrowsHorizontal className="size-3" />;
            case "row-resize":
            case "ns-resize":
              return <TbArrowsVertical className="size-3" />;
            case "n-resize":
              return <TbArrowNarrowUp className="size-3" />;
            case "s-resize":
              return <TbArrowNarrowDown className="size-3" />;
            case "e-resize":
              return <TbArrowNarrowRight className="size-3" />;
            case "w-resize":
              return <TbArrowNarrowLeft className="size-3" />;
            case "ne-resize":
            case "nesw-resize":
              return <TbArrowsDiagonal className="size-3 rotate-45" />;
            case "nw-resize":
            case "nwse-resize":
              return <TbArrowsDiagonal2 className="size-3 rotate-45" />;
            case "se-resize":
              return <TbArrowsDiagonal className="size-3 -rotate-45" />;
            case "sw-resize":
              return <TbArrowsDiagonal2 className="size-3 -rotate-45" />;
            case "none":
              return <TbSquare className="size-3 opacity-30" />;
            default:
              return <TbMenu2 className="size-3" />;
          }
        };

        return (
          <div
            className="flex size-4 shrink-0 items-center justify-center rounded border border-border bg-muted"
            style={{ cursor: cursorValue }}
          >
            {getCursorIcon()}
          </div>
        );
      }
      case "shadow": {
        return (
          <div className={`size-4 shrink-0 rounded border border-border bg-background ${option}`} />
        );
      }
      default:
        return null;
    }
  };

  // Render options group with optional subgrouping
  const renderOptionsGroup = (
    groupType: "named" | "numeric" | "fractions" | "other",
    title: string,
    showHints: boolean = false,
    hintType: "pixel" | "percentage" | "custom" = "custom",
    enableSubgroups: boolean = false,
    showPreview?: "cursor" | "color" | "shadow"
  ) => {
    const groupOptions = options?.[groupType] || [];

    if (groupOptions.length === 0) return null;

    // If subgroups are enabled for numeric or fractions, render nested structure
    if (enableSubgroups && (groupType === "numeric" || groupType === "fractions")) {
      let subgroups: { [key: string]: string[] } = {};

      if (groupType === "numeric") {
        subgroups = groupNumericByRange(groupOptions);
      } else if (groupType === "fractions") {
        subgroups = groupFractionsByDenominator(groupOptions);
      }

      return (
        <div key={groupType} className="p-2">
          <div className="space-y-1">
            {Object.entries(subgroups).map(([subgroupName, subgroupOptions]) => (
              <SubgroupItem
                key={subgroupName}
                subgroupName={subgroupName}
                options={subgroupOptions}
                showHints={false}
                hintType={hintType}
                onSelect={onSelect}
                propTag={propTag}
              />
            ))}
          </div>
        </div>
      );
    }

    // Regular flat list for named and other groups
    return (
      <div key={groupType} className="p-2">
        <div className="space-y-1 overflow-y-auto">
          {groupOptions.map(option => {
            const preview = renderPreview(option, showPreview);
            return (
              <button
                key={option}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => onSelect(option)}
              >
                {preview}
                <span className="flex-1">{getDisplayLabel(option)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // If searching, show filtered flat list
  if (filteredOptions) {
    return ReactDOM.createPortal(
      <div
        data-unified-dropdown
        style={style}
        ref={ref}
        className="flex flex-col rounded-lg border border-border bg-background text-foreground shadow-xl"
      >
        {/* None option */}
        <button
          onClick={() => onSelect("")}
          className="block w-full shrink-0 border-b border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
        >
          None
        </button>

        <div className="scrollbar flex-1 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matches found
            </div>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={option}
                  onClick={() => onSelect(option)}
                  className={`block w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted ${
                    isSelected ? "bg-primary/10 font-semibold text-primary" : ""
                  }`}
                >
                  {getDisplayLabel(option)}
                </button>
              );
            })
          )}
        </div>
      </div>,
      document.querySelector(".pagehub-sdk-root") || document.body
    );
  }

  // Render based on layout configuration
  const renderMainContent = () => {
    const columns = layoutConfig.columns || { count: 3, widths: ["w-2/5", "w-1/5", "w-2/5"] };
    const sections = [];

    // Build sections array based on column count
    if (columns.count === 3) {
      sections.push(
        { section: layoutConfig.leftSection, width: columns.widths[0], key: "left" },
        { section: layoutConfig.middleSection, width: columns.widths[1], key: "middle" },
        { section: layoutConfig.rightSection, width: columns.widths[2], key: "right" }
      );
    } else if (columns.count === 2) {
      sections.push(
        { section: layoutConfig.leftSection, width: columns.widths[0], key: "left" },
        { section: layoutConfig.rightSection, width: columns.widths[1], key: "right" }
      );
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex h-full">
          {sections.map((col, colIndex) => {
            if (!col.section) return null;

            const isLastColumn = colIndex === sections.length - 1;
            const borderClass = isLastColumn ? "" : "border-r border-border";

            return (
              <div
                key={col.key}
                className={`scrollbar ${col.width} overflow-y-auto ${borderClass}`}
              >
                {col.section.groups.map((groupType, index) => {
                  const containerClass = "flex-1";

                  if (groupType === "named") {
                    return (
                      <div key="named" className={containerClass}>
                        {renderOptionsGroup(
                          "named",
                          col.section!.title,
                          col.section?.showHints || false,
                          col.section?.hintType || "custom",
                          false,
                          col.section?.showPreview
                        )}
                      </div>
                    );
                  } else if (groupType === "numeric") {
                    return (
                      <div key="numeric" className={containerClass}>
                        {renderOptionsGroup(
                          "numeric",
                          col.section!.title,
                          col.section?.showHints || false,
                          col.section?.hintType || "pixel",
                          !col.section?.disableSubgroups, // Enable subgroups unless disabled
                          col.section?.showPreview
                        )}
                      </div>
                    );
                  } else if (groupType === "fractions") {
                    return (
                      <div key="fractions" className={containerClass}>
                        {renderOptionsGroup(
                          "fractions",
                          "Fractions",
                          col.section?.showHints,
                          col.section?.hintType || "percentage",
                          !col.section?.disableSubgroups, // Enable subgroups unless disabled
                          col.section?.showPreview
                        )}
                      </div>
                    );
                  } else if (groupType === "other") {
                    return (
                      <div key="other" className={containerClass}>
                        {renderOptionsGroup(
                          "other",
                          "Other",
                          col.section?.showHints || false,
                          col.section?.hintType || "custom",
                          false,
                          col.section?.showPreview
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Otherwise show organized groups with configurable layout (tailwind mode - no design vars)
  return ReactDOM.createPortal(
    <div
      data-unified-dropdown
      style={style}
      ref={ref}
      className="flex h-52 flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-xl"
    >
      {/* Main Options Section - Configurable Layout */}
      {!isVarMode && renderMainContent()}

      {/* Design Variables Section - Hidden in tailwind mode */}
      {isVarMode && showVarSelector && realDesignVars.length > 0 && (
        <div className="flex h-full flex-col border-border">
          <div className="scrollbar flex-1 overflow-y-auto">
            <div className="bg-background">
              {(() => {
                // Filter by category based on input type
                const getRelevantCategories = () => {
                  // Width, height, spacing inputs - show spacing and other
                  if (
                    propTag &&
                    [
                      "w",
                      "h",
                      "m",
                      "p",
                      "mt",
                      "mb",
                      "ml",
                      "mr",
                      "mx",
                      "my",
                      "pt",
                      "pb",
                      "pl",
                      "pr",
                      "px",
                      "py",
                      "gap",
                    ].includes(propTag)
                  ) {
                    return ["spacing", "other"];
                  }
                  // Color inputs - show palette and colors
                  if (propTag && ["bg", "text", "border"].includes(propTag)) {
                    return ["palette", "colors"];
                  }
                  // Typography inputs - show typography
                  if (
                    (propTag && ["font", "text"].includes(propTag)) ||
                    tailwindKey === "fontFamily"
                  ) {
                    return ["typography", "palette"];
                  }
                  // Default: show all
                  return ["palette", "typography", "spacing", "colors", "other"];
                };

                const relevantCategories = getRelevantCategories();

                const filteredVars = realDesignVars.filter(v => {
                  // Filter by category first
                  if (!relevantCategories.includes(v.category)) {
                    return false;
                  }
                  // Then filter by search term
                  if (!varSearchTerm) return true;
                  const search = varSearchTerm.toLowerCase();
                  return (
                    v.label.toLowerCase().includes(search) ||
                    v.varName.toLowerCase().includes(search) ||
                    v.name.toLowerCase().includes(search)
                  );
                });

                if (filteredVars.length === 0) {
                  return (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No variables found
                    </div>
                  );
                }

                return filteredVars.map(v => {
                  const varValue =
                    tailwindKey === "fontFamily" ? `font-(${v.varName})` : `var(${v.varName})`;
                  const isSelected = currentValue === varValue;
                  return (
                    <button
                      key={v.varName}
                      onClick={() => onSelect(varValue)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted ${
                        isSelected ? "bg-primary/10 font-semibold text-primary" : ""
                      }`}
                    >
                      <div
                        className="size-3 shrink-0 rounded border border-border"
                        style={{
                          backgroundColor: v.category === "palette" ? v.value : "transparent",
                        }}
                      />
                      <span className="flex-1 truncate font-medium">{v.label}</span>
                      <span className="text-muted-foreground">{v.varName}</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
          <div
            className="border-t border-border bg-background p-2"
            onMouseDown={e => e.stopPropagation()}
          >
            <input
              type="text"
              value={varSearchTerm}
              onChange={e => setVarSearchTerm(e.target.value)}
              placeholder="Search variables..."
              className="input-plain w-full cursor-text py-0 text-xs"
            />
          </div>
        </div>
      )}

      {/* None option */}
      <button
        onClick={() => onSelect("")}
        className="sticky top-0 z-10 block w-full shrink-0 border-t border-border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
      >
        Reset to Default
      </button>
    </div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
