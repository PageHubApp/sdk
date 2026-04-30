import React from "react";
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
import { AnchoredPopover } from "../../../overlays/AnchoredPopover";
import {
  OVERLAY_Z_FLOATING_PANEL_DROPDOWN,
  OVERLAY_Z_UNIFIED_DROPDOWN,
} from "../../../overlays/overlayZIndex";
import { useFloatingPanelZIndex } from "../../../floating/FloatingPanel";
import { getLayoutConfig, groupFractionsByDenominator, groupNumericByRange } from "./config";
import { SubgroupItem } from "./SubgroupComponents";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";

interface UnifiedDropdownProps {
  options: {
    named: string[];
    numeric: string[];
    fractions: string[];
    tokens: string[];
    other: string[];
  } | null;
  filteredOptions: string[] | null;
  selectedIndex: number;
  onSelect: (option: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  showVarSelector?: boolean;
  propTag?: string;
  tailwindKey?: string;
  currentValue?: string;
  selectedType?: string;
  /** Option string the keyboard cursor is on (for arrow-key highlight in grouped view). */
  highlightedOption?: string;
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
  currentValue,
  selectedType,
  highlightedOption,
}: UnifiedDropdownProps) {
  // Get layout configuration for this property type
  const layoutConfig = getLayoutConfig(propTag, tailwindKey);

  // When this dropdown is rendered inside a FloatingPanel (Animations,
  // Spacing, Conditions, etc.), bump z-index so the portaled list sits ABOVE
  // the host panel. Outside a panel, fall back to the default scale.
  const floatingPanelZ = useFloatingPanelZIndex();
  const dropdownZ =
    floatingPanelZ != null
      ? Math.max(OVERLAY_Z_FLOATING_PANEL_DROPDOWN, floatingPanelZ + 10)
      : OVERLAY_Z_UNIFIED_DROPDOWN;

  // Don't show dropdown if there's nothing to display. Var mode is owned by
  // VarPicker — UnifiedDropdown is tailwind-only.
  const hasOptions =
    options &&
    (options.named.length > 0 ||
      options.numeric.length > 0 ||
      options.fractions.length > 0 ||
      options.tokens.length > 0 ||
      options.other.length > 0);

  const showDropdown = Boolean(hasOptions);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1536;
  const maxPanel = Math.min(vw - 16, 320);
  const popoverStyle: React.CSSProperties = { width: "fit-content", maxWidth: maxPanel };

  // Helper to get display label (humanize token)
  const getDisplayLabel = (option: string) => {
    return formatTailwindDisplayLabel(option, propTag);
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
        // Wrapper provides padding so the shadow has room to render outside the swatch.
        // The inner card carries the actual shadow class — bigger (size-7) and colored
        // so it doesn't read as a checkbox at a glance.
        return (
          <div className="flex size-9 shrink-0 items-center justify-center">
            <div className={`bg-base-100 size-7 rounded ${option}`} />
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Render options group with optional subgrouping
  const renderOptionsGroup = (
    groupType: "named" | "numeric" | "fractions" | "tokens" | "other",
    title: string,
    showHints: boolean = false,
    hintType: "pixel" | "percentage" | "ms" | "custom" = "custom",
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
            {Object.entries(subgroups)
              .filter(([, subgroupOptions]) => subgroupOptions.length > 0)
              .map(([subgroupName, subgroupOptions]) => (
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
            const isSelected = currentValue === option;
            const isHighlighted = !isSelected && highlightedOption === option;
            return (
              <button
                key={option}
                type="button"
                className={`ph-select-item text-base-content text-xs ${
                  isSelected
                    ? "bg-primary text-primary-content font-semibold"
                    : isHighlighted
                      ? "bg-primary/10 text-primary font-semibold"
                      : ""
                }`}
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
    return (
      <AnchoredPopover
        open={showDropdown}
        onOpenChange={() => {}}
        anchor={inputRef}
        placement="bottom-start"
        mainAxisOffset={4}
        maxHeightCeiling={400}
        matchAnchorWidth={{ min: 120, max: 200 }}
        boundary={[]}
        zIndex={dropdownZ}
        disableDismiss
        style={popoverStyle}
        className="pagehub-sdk-root ph-panel text-base-content flex w-fit flex-col"
      >
        <div data-unified-dropdown className="ph-select-item-host flex flex-1 flex-col">
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
      </AnchoredPopover>
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
                  } else if (groupType === "tokens") {
                    return (
                      <div key="tokens" className={containerClass}>
                        {renderOptionsGroup(
                          "tokens",
                          col.section!.title,
                          false,
                          col.section?.hintType || "custom",
                          false,
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
  return (
    <AnchoredPopover
      open={showDropdown}
      onOpenChange={() => {}}
      anchor={inputRef}
      placement="bottom-start"
      mainAxisOffset={4}
      maxHeightCeiling={400}
      matchAnchorWidth={{ min: 120, max: 200 }}
      boundary={[]}
      zIndex={dropdownZ}
      disableDismiss
      style={popoverStyle}
      className="pagehub-sdk-root ph-panel text-base-content flex w-fit flex-col overflow-hidden"
    >
      <div
        data-unified-dropdown
        className="ph-select-item-host flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {renderMainContent()}

        <button
          type="button"
          onClick={() => onSelect("")}
          className="ph-select-item border-base-300 bg-base-200 text-neutral-content sticky top-0 z-10 shrink-0 rounded-none border-t"
        >
          Reset to Default
        </button>
      </div>
    </AnchoredPopover>
  );
}
