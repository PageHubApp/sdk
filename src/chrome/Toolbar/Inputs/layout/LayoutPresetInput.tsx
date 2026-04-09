import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import {
  TbChevronDown,
  TbLayoutColumns,
  TbLayoutGrid,
  TbLayoutRows,
  TbSquare,
} from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { useLayoutPreset } from "./hooks/useLayoutPreset";
import { DISPLAY_VARIANTS, type LayoutPreset } from "./presets/layoutPresets";

interface LayoutPresetInputProps {
  propKey?: string;
  propType?: string;
  onLayoutChange?: (preset: LayoutPreset) => void;
}

export function LayoutPresetInput({
  propKey = "layoutPreset",
  onLayoutChange,
}: LayoutPresetInputProps) {
  const lp = useLayoutPreset({ propKey, onLayoutChange });

  return (
    <ToolbarSection title="Layout" icon={<TbLayoutGrid />} propKey="display" collapsible={true} defaultOpen={true}>
      {/* Layout Mode Buttons */}
      <div className="col-span-full flex gap-1 rounded-lg bg-neutral p-1">
        <ModeButton
          active={lp.layoutMode === "flex-row"}
          onClick={() => lp.switchToMode("flex-row")}
          icon={<TbLayoutColumns className="size-3" />}
          label="Columns"
        />
        <ModeButton
          active={lp.layoutMode === "flex-col"}
          onClick={() => lp.switchToMode("flex-col")}
          icon={<TbLayoutRows className="size-3" />}
          label="Rows"
        />
        <ModeButton
          active={lp.layoutMode === "grid"}
          onClick={() => lp.switchToMode("grid")}
          icon={<TbLayoutGrid className="size-3" />}
          label="Grid"
        />
        <ModeButton
          active={lp.layoutMode === "block"}
          onClick={() => lp.switchToMode("block")}
          icon={<TbSquare className="size-3" />}
          label="Block"
        />

        {/* Display Variants Dropdown */}
        <div ref={lp.dropdownRef} className="relative">
          <button
            onClick={() => lp.setShowDisplayDropdown(!lp.showDisplayDropdown)}
            className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              ["inline-block", "inline-flex", "inline-grid", "inline", "hidden"].includes(lp.currentDisplay)
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            <TbChevronDown className="size-3" />
          </button>

          {lp.showDisplayDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-base-300 bg-base-100 shadow-lg">
              {DISPLAY_VARIANTS.map(variant => (
                <button
                  key={variant.value}
                  onClick={() => lp.handleDisplayVariant(variant.value)}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${
                    lp.currentDisplay === variant.value
                      ? "bg-accent font-medium text-base-content"
                      : "text-neutral-content"
                  }`}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Presets Grid */}
      {lp.layoutMode !== "block" && (
        <AutoHideScrollbar className="h-[210px]">
          <div className="col-span-full grid grid-cols-2 gap-1.5">
            {lp.currentPresets.map((preset, index) => {
              const isActive =
                lp.currentLayoutMode === lp.layoutMode &&
                lp.currentLayoutColumns === preset.columns &&
                lp.currentPresetLayout === preset.name.toLowerCase().replace(/\s+/g, "-");

              return (
                <button
                  key={index}
                  onClick={() => lp.handlePresetSelect(preset)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-left ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-300 bg-base-100 hover:border-primary hover:bg-accent"
                  }`}
                  title={preset.name}
                >
                  <div className="w-full">{preset.icon}</div>
                  <div className={`text-xs font-medium ${isActive ? "text-primary" : "text-base-content"}`}>
                    {preset.name}
                  </div>
                </button>
              );
            })}
          </div>
        </AutoHideScrollbar>
      )}
    </ToolbarSection>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-base-100 text-base-content shadow-sm"
          : "text-neutral-content hover:text-base-content"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
