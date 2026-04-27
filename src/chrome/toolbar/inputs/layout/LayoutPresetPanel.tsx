import { TbSquare } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { PH_TOOLBAR_DASHED_BTN_ACTIVE } from "../../phToolbarDashedSelection";
import {
  DISPLAY_VARIANTS,
  GRID_PRESETS,
  getFlexPresets,
  type LayoutPreset,
} from "./presets/layoutPresets";
import type { LayoutPresetHandle } from "./hooks/useLayoutPreset";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  lp: LayoutPresetHandle;
  /** Restrict to grid presets — for hosts whose component is always grid (e.g. Grid). */
  gridOnly?: boolean;
}

interface Section {
  label: string;
  presets: LayoutPreset[];
  layoutMode: "flex-row" | "flex-col" | "grid";
}

function presetSlug(preset: LayoutPreset): string {
  return preset.name.toLowerCase().replace(/\s+/g, "-");
}

function isPresetActive(
  preset: LayoutPreset,
  layoutMode: "flex-row" | "flex-col" | "grid",
  lp: LayoutPresetHandle
): boolean {
  if (lp.currentLayoutMode !== layoutMode) return false;
  const savedSlug = String(lp.currentPresetLayout ?? "").trim().toLowerCase();
  if (savedSlug !== presetSlug(preset)) return false;
  if (preset.columns === undefined) return true;
  return Number(lp.currentLayoutColumns) === Number(preset.columns);
}

export default function LayoutPresetPanel({ initialPosition, onClose, lp, gridOnly }: PanelProps) {
  const sections: Section[] = gridOnly
    ? [{ label: "Grid", presets: GRID_PRESETS, layoutMode: "grid" }]
    : [
        { label: "Side by side", presets: getFlexPresets("column"), layoutMode: "flex-row" },
        { label: "Stacked", presets: getFlexPresets("row"), layoutMode: "flex-col" },
        { label: "Grid", presets: GRID_PRESETS, layoutMode: "grid" },
      ];

  const handlePick = (preset: LayoutPreset) => {
    lp.handlePresetSelect(preset);
    onClose();
  };

  const handleBlock = () => {
    lp.switchToMode("block");
    onClose();
  };

  const blockActive = lp.layoutMode === "block";

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Layout"
      storageKey="layout-preset"
      minWidth={280}
      maxWidth={420}
      maxHeight={640}
      initialPosition={initialPosition}
      zIndex={1100}
      scrollable
    >
      <div className="flex flex-col gap-3">
        {sections.map(section => (
          <div key={section.label}>
            <div className="text-neutral-content mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
              {section.label}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {section.presets.map((preset, i) => {
                const active = isPresetActive(preset, section.layoutMode, lp);
                return (
                  <button
                    key={`${section.label}-${i}`}
                    type="button"
                    aria-pressed={active}
                    aria-label={preset.name}
                    onClick={() => handlePick(preset)}
                    className={twMerge(
                      "ph-toolbar-dashed-btn items-center justify-center p-2",
                      active && PH_TOOLBAR_DASHED_BTN_ACTIVE
                    )}
                  >
                    <div className="w-full">{preset.icon}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {!gridOnly && (
          <div>
            <div className="text-neutral-content mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
              No layout
            </div>
            <button
              type="button"
              aria-pressed={blockActive}
              aria-label="Block (no layout)"
              onClick={handleBlock}
              className={twMerge(
                "ph-toolbar-dashed-btn flex items-center justify-center gap-1.5 p-2 text-xs",
                blockActive && PH_TOOLBAR_DASHED_BTN_ACTIVE
              )}
            >
              <TbSquare className="size-3.5 shrink-0" aria-hidden />
              Block
            </button>
          </div>
        )}

        <div>
          <div className="text-neutral-content mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
            Display
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {DISPLAY_VARIANTS.map(variant => {
              const active = lp.currentDisplay === variant.value;
              return (
                <button
                  key={variant.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={variant.label}
                  onClick={() => lp.handleDisplayVariant(variant.value)}
                  className={twMerge(
                    "ph-toolbar-dashed-btn items-center justify-center p-2 text-xs",
                    active && PH_TOOLBAR_DASHED_BTN_ACTIVE
                  )}
                >
                  {variant.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}
