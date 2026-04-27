import { useNode } from "@craftjs/core";
import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { twMerge } from "tailwind-merge";
import { PH_TOOLBAR_DASHED_BTN_ACTIVE } from "../../phToolbarDashedSelection";
import {
  TbChevronDown,
  TbLayoutColumns,
  TbLayoutGrid,
  TbLayoutRows,
  TbSquare,
} from "react-icons/tb";
import {
  TOOLBAR_SEGMENTED_ACTIVE,
  TOOLBAR_SEGMENTED_INACTIVE,
  ToolbarSegmentedControl,
} from "../../helpers/ToolbarSegmentedControl";
import { ContainerTypeInput } from "../advanced/ContainerTypeInput";
import { ToolbarSection } from "../../ToolbarSection";
import type { LayoutMode, LayoutPresetHandle } from "./hooks/useLayoutPreset";
import { DISPLAY_VARIANTS } from "./presets/layoutPresets";

interface LayoutPresetInputProps {
  /** Controller from `useLayoutPreset` in the parent (shared with Alignment shortcuts). */
  lp: LayoutPresetHandle;
  /** Hide flex/block/row-col switcher; show grid presets + display variant menu (Grid component). */
  gridOnly?: boolean;
  /**
   * When false, only the controls are rendered (no ToolbarSection wrapper).
   * Parent should wrap in `ToolbarSection title="Content"` per unified-settings helpers.
   */
  sectionWrapper?: boolean;
}

/** True when the node has a container `type` prop (page/section/component/etc). */
function useHasContainerType(): boolean {
  return useNode(node => node.data?.props?.type != null) as unknown as boolean;
}

export function DisplayVariantTrailing({ lp }: { lp: LayoutPresetHandle }) {
  return (
    <div ref={lp.dropdownRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={lp.showDisplayDropdown}
        aria-haspopup="listbox"
        onClick={() => lp.setShowDisplayDropdown(!lp.showDisplayDropdown)}
        className={`flex h-6 items-center justify-center gap-1 rounded px-2 text-xs leading-tight font-medium transition-colors ${
          ["inline-block", "inline-flex", "inline-grid", "inline", "hidden"].includes(lp.currentDisplay)
            ? TOOLBAR_SEGMENTED_ACTIVE
            : TOOLBAR_SEGMENTED_INACTIVE
        }`}
      >
        <TbChevronDown className="size-3.5 shrink-0" aria-hidden />
      </button>

      {lp.showDisplayDropdown && (
        <div className="border-base-300 bg-base-200 absolute top-full right-0 z-50 mt-1 w-32 rounded-md border shadow-lg">
          {DISPLAY_VARIANTS.map(variant => (
            <button
              key={variant.value}
              type="button"
              onClick={() => lp.handleDisplayVariant(variant.value)}
              className={`hover:bg-accent w-full px-3 py-2 text-left text-xs transition-colors ${
                lp.currentDisplay === variant.value
                  ? "bg-accent text-base-content font-medium"
                  : "text-neutral-content"
              }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LayoutPresetInput({
  lp,
  gridOnly,
  sectionWrapper = true,
}: LayoutPresetInputProps) {
  const hasContainerType = useHasContainerType();

  const showPresetGrid = gridOnly || lp.layoutMode !== "block";

  const inner = (
    <>
      {gridOnly ? (
        <div
          role="tablist"
          aria-label="Container layout"
          className="bg-neutral col-span-full flex w-full min-w-0 gap-1 rounded-md p-1"
        >
          <div
            role="tab"
            aria-selected
            className={`flex h-6 min-w-0 flex-1 cursor-default items-center justify-center gap-1 rounded px-2 text-xs leading-tight font-medium ${TOOLBAR_SEGMENTED_ACTIVE}`}
          >
            <TbLayoutGrid className="size-3.5 shrink-0" aria-hidden />
            Grid
          </div>
          <DisplayVariantTrailing lp={lp} />
        </div>
      ) : (
        <ToolbarSegmentedControl
          className="col-span-full"
          aria-label="Container layout"
          value={lp.layoutMode}
          onChange={m => lp.switchToMode(m as LayoutMode)}
          options={[
            {
              value: "flex-row",
              label: (
                <>
                  <TbLayoutColumns className="size-3 shrink-0" aria-hidden />
                  Columns
                </>
              ),
            },
            {
              value: "flex-col",
              label: (
                <>
                  <TbLayoutRows className="size-3.5 shrink-0" aria-hidden />
                  Rows
                </>
              ),
            },
            {
              value: "grid",
              label: (
                <>
                  <TbLayoutGrid className="size-3.5 shrink-0" aria-hidden />
                  Grid
                </>
              ),
            },
            {
              value: "block",
              label: (
                <>
                  <TbSquare className="size-3.5 shrink-0" aria-hidden />
                  Block
                </>
              ),
            },
          ]}
          trailing={<DisplayVariantTrailing lp={lp} />}
        />
      )}

      {/* Presets Grid */}
      {showPresetGrid && (
        <AutoHideScrollbar className="-mx-3 max-h-[152px] min-h-0 min-w-0 px-3">
          <div className="col-span-full grid grid-cols-2 gap-1.5">
            {lp.currentPresets.map((preset, index) => {
              // root.layoutColumns is stored as a string; preset.columns is a number — strict === never matched.
              const slug = preset.name.toLowerCase().replace(/\s+/g, "-");
              const savedSlug = String(lp.currentPresetLayout ?? "")
                .trim()
                .toLowerCase();
              const columnsMatch =
                preset.columns === undefined ||
                Number(lp.currentLayoutColumns) === Number(preset.columns);
              const isActive =
                lp.currentLayoutMode === lp.layoutMode && columnsMatch && savedSlug === slug;

              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={preset.name}
                  onClick={() => lp.handlePresetSelect(preset)}
                  className={twMerge(
                    "ph-toolbar-dashed-btn items-center justify-center p-2",
                    isActive && PH_TOOLBAR_DASHED_BTN_ACTIVE
                  )}
                >
                  <div className="w-full">{preset.icon}</div>
                </button>
              );
            })}
          </div>
        </AutoHideScrollbar>
      )}

      {hasContainerType && <ContainerTypeInput />}
    </>
  );

  if (!sectionWrapper) {
    return inner;
  }

  return (
    <ToolbarSection
      title={gridOnly ? "Grid" : "Layout"}
      icon={<TbLayoutGrid />}
      propKey="display"
      defaultOpen
    >
      {inner}
    </ToolbarSection>
  );
}
