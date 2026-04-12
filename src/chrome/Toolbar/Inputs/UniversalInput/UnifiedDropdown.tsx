import React, { useLayoutEffect, useRef, useState } from "react";
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
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { OVERLAY_Z_UNIFIED_DROPDOWN } from "../../../overlays/overlayZIndex";
import { useAnchoredPopover } from "../../../overlays/useAnchoredPopover";
import { getLayoutConfig, groupFractionsByDenominator, groupNumericByRange } from "./config";
import { useDesignVars } from "./hooks/useDesignVars";
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

export function UnifiedDropdown({
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
}: UnifiedDropdownProps) {
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

  // Get real design system vars from extracted hook
  const realDesignVars = useDesignVars();

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

  const showDropdown = isVarMode ? Boolean(hasDesignVars) : Boolean(hasOptions);

  const floating = useAnchoredPopover({
    open: showDropdown,
    placement: "bottom-start",
    mainAxisOffset: 4,
    maxHeightCeiling: 400,
    maxHeightMin: 150,
    matchReferenceMinMaxWidth: { min: 120, max: 200 },
  });

  useLayoutEffect(() => {
    floating.refs.setReference(inputRef.current);
    if (showDropdown) void floating.update();
    // floating identity updates each render; only re-attach when visibility toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync reference to toolbar input
  }, [showDropdown]);

  // In var mode, only show if we have design vars
  // In tailwind mode, only show if we have tailwind options
  if (!showDropdown) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1536;
  const maxPanel = Math.min(vw - 16, 320);
  const style: React.CSSProperties = {
    ...floating.floatingStyles,
    zIndex: OVERLAY_Z_UNIFIED_DROPDOWN,
    width: "max-content",
    maxWidth: maxPanel,
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
            className="border-base-300 bg-neutral flex size-4 shrink-0 items-center justify-center rounded border"
            style={{ cursor: cursorValue }}
          >
            {getCursorIcon()}
          </div>
        );
      }
      case "shadow": {
        return (
          <div className={`border-base-300 bg-base-200 size-4 shrink-0 rounded border ${option}`} />
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
        <div className="ph-select-item-host overflow-y-auto">
          {groupOptions.map(option => {
            const preview = renderPreview(option, showPreview);
            return (
              <button
                key={option}
                type="button"
                className="ph-select-item text-base-content text-xs"
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
        ref={floating.refs.setFloating}
        className="pagehub-sdk-root ph-panel text-base-content flex flex-col"
      >
        <div className="ph-select-item-host flex flex-1 flex-col">
          <button
            type="button"
            onClick={() => onSelect("")}
            className="ph-select-item border-base-300 text-neutral-content shrink-0 rounded-none border-b"
          >
            None
          </button>

          <div className="scrollbar-light flex-1 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="text-neutral-content px-3 py-6 text-center text-xs">
                No matches found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSelect(option)}
                    className={`ph-select-item text-base-content ${
                      isSelected ? "bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    {getDisplayLabel(option)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>,
      document.querySelector(".pagehub-sdk-root") || document.body
    );
  }

  // Render based on layout configuration
  const renderMainContent = () => {
    const columns = layoutConfig.columns || { count: 3, widths: ["w-2/5", "w-1/5", "w-2/5"] };
    const sections: {
      section: NonNullable<typeof layoutConfig.leftSection>;
      width: string;
      key: string;
    }[] = [];

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

    const sectionsDefined = sections.filter(
      (
        col
      ): col is (typeof sections)[number] & {
        section: NonNullable<(typeof sections)[number]["section"]>;
      } => col.section != null
    );

    const columnHasOptions = (section: (typeof sectionsDefined)[number]["section"]) =>
      options != null &&
      section.groups.some(g => ((options as Record<string, string[]>)[g]?.length ?? 0) > 0);

    const withContent = sectionsDefined.filter(col => columnHasOptions(col.section));
    const collapsedSome = withContent.length > 0 && withContent.length < sectionsDefined.length;
    const finalSections = withContent.length > 0 ? withContent : sectionsDefined;

    return (
      <div className="flex h-full flex-col">
        <div className="flex h-full">
          {finalSections.map((col, colIndex) => {
            if (!col.section) return null;

            const isLastColumn = colIndex === finalSections.length - 1;
            const borderClass = isLastColumn ? "" : "border-r border-base-300";
            const widthClass =
              collapsedSome && withContent.length > 0
                ? finalSections.length === 1
                  ? "w-max min-w-0 max-w-full shrink-0"
                  : col.width
                : col.width;

            return (
              <div
                key={col.key}
                className={`scrollbar-light ${widthClass} overflow-y-auto ${borderClass}`}
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
      ref={floating.refs.setFloating}
      className="pagehub-sdk-root ph-panel text-base-content flex h-52 flex-col overflow-hidden"
    >
      <div className="ph-select-item-host flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Main Options Section - Configurable Layout */}
        {!isVarMode && renderMainContent()}

        {/* Design Variables Section - Hidden in tailwind mode */}
        {isVarMode && showVarSelector && realDesignVars.length > 0 && (
          <div className="border-base-300 flex h-full flex-col">
            <div className="scrollbar-light flex-1 overflow-y-auto">
              <div className="bg-base-200">
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
                      <div className="text-neutral-content px-3 py-6 text-center text-xs">
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
                        type="button"
                        onClick={() => onSelect(varValue)}
                        className={`ph-select-item gap-2 text-xs ${
                          isSelected ? "bg-primary/10 text-primary font-semibold" : ""
                        }`}
                      >
                        <div
                          className="border-base-300 size-3 shrink-0 rounded border"
                          style={{
                            backgroundColor: v.category === "palette" ? v.value : "transparent",
                          }}
                        />
                        <span className="flex-1 truncate font-medium">{v.label}</span>
                        <span className="text-neutral-content">{v.varName}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
            <div
              role="presentation"
              className="border-base-300 bg-base-200 border-t p-2"
              onMouseDown={e => e.stopPropagation()}
            >
              <input
                type="text"
                value={varSearchTerm}
                onChange={e => setVarSearchTerm(e.target.value)}
                placeholder="Search variables..."
                className="input-plain w-full cursor-text py-0 text-xs"
                {...toolbarInputNoAutocompleteProps}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => onSelect("")}
          className="ph-select-item border-base-300 bg-base-200 text-neutral-content sticky top-0 z-10 shrink-0 rounded-none border-t"
        >
          Reset to Default
        </button>
      </div>
    </div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
