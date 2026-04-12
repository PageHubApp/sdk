import { useNode } from "@craftjs/core";
import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
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
} from "../../Helpers/ToolbarSegmentedControl";
import { ContainerTypeInput } from "../advanced/ContainerTypeInput";
import { ToolbarSection } from "../../ToolbarSection";
import type { LayoutMode, LayoutPresetHandle } from "./hooks/useLayoutPreset";
import { DISPLAY_VARIANTS } from "./presets/layoutPresets";

interface LayoutPresetInputProps {
  /** Controller from `useLayoutPreset` in the parent (shared with Alignment shortcuts). */
  lp: LayoutPresetHandle;
}

function useIsCraftContainer(): boolean {
  const resolvedName = useNode(node => {
    const t = node.data.type as { resolvedName?: string } | string | undefined;
    return typeof t === "string" ? t : t?.resolvedName;
  }) as unknown as string | undefined;
  return resolvedName === "Container";
}

export function LayoutPresetInput({ lp }: LayoutPresetInputProps) {
  const isContainer = useIsCraftContainer();

  return (
    <ToolbarSection
      title="Layout"
      icon={<TbLayoutGrid />}
      propKey="display"
      collapsible={true}
      defaultOpen={true}
    >
      {/* Layout mode — same track + segment styling as ToolbarSegmentedControl */}
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
        trailing={
          <div ref={lp.dropdownRef} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={lp.showDisplayDropdown}
              aria-haspopup="listbox"
              onClick={() => lp.setShowDisplayDropdown(!lp.showDisplayDropdown)}
              className={`flex items-center justify-center gap-1 rounded px-2 py-2 text-xs leading-tight font-medium transition-colors ${
                ["inline-block", "inline-flex", "inline-grid", "inline", "hidden"].includes(
                  lp.currentDisplay
                )
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
        }
      />

      {/* Presets Grid */}
      {lp.layoutMode !== "block" && (
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
                  onClick={() => lp.handlePresetSelect(preset)}
                  className={twMerge(
                    "ph-toolbar-dashed-btn flex-col items-center justify-start gap-1.5 p-2 text-left text-xs font-medium",
                    isActive && PH_TOOLBAR_DASHED_BTN_ACTIVE
                  )}
                  title={preset.name}
                >
                  <div className="w-full">{preset.icon}</div>
                  <div
                    className={twMerge(
                      "text-xs font-medium",
                      isActive ? "text-primary" : "text-base-content"
                    )}
                  >
                    {preset.name}
                  </div>
                </button>
              );
            })}
          </div>
        </AutoHideScrollbar>
      )}

      {isContainer && <ContainerTypeInput />}
    </ToolbarSection>
  );
}
