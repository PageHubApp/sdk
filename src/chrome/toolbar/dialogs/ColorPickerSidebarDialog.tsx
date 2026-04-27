import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbColorPicker, TbDeviceFloppy, TbPalette } from "react-icons/tb";
import { LeftSidebarDialog } from "./LeftSidebarDialog";
import { useColorPickerState } from "./useColorPickerState";
import { phStorage } from "../../../utils/phStorage";
import { DesignSystemPalette } from "../inputs/color/DesignSystemPalette";
import {
  RecentColorsSection,
  SpecialColorsSection,
  TailwindColorsSection,
} from "./colorPickerSections";

export { ColorPickerSidebarAtom } from "./dialogAtoms";

export function ColorPickerSidebarDialog() {
  const {
    dialog,
    hexInput,
    setHexInput,
    selectedColor,
    recentColors,
    setRecentColors,
    isEyeDropperSupported,
    handleClose,
    handleColorSelect,
    handleColorDoubleClick,
    handleHexSubmit,
    handleEyeDropper,
    handleSaveToPalette,
  } = useColorPickerState();

  const headerRight = (
    <>
      {dialog.showPalette && (
        <button
          onClick={handleSaveToPalette}
          disabled={!hexInput || !/^#[0-9A-Fa-f]{6}$/.test(hexInput)}
          className="text-accent-content hover:bg-accent-content/10 flex items-center justify-center rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Save to palette"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Save to Palette"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          <TbDeviceFloppy />
        </button>
      )}
      {isEyeDropperSupported() && (
        <button
          onClick={handleEyeDropper}
          className="text-accent-content hover:bg-accent-content/10 flex items-center justify-center rounded-md p-1 transition-colors"
          aria-label="Pick color from screen"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Eyedropper"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          <TbColorPicker />
        </button>
      )}
    </>
  );

  return (
    <LeftSidebarDialog
      isOpen={dialog.enabled}
      onClose={handleClose}
      title="Select Color"
      icon={<TbPalette />}
      headerRight={headerRight}
      width="360px"
    >
      <div className="flex h-full flex-col overflow-y-auto p-4">
        {/* Hex Input */}
        <div className="mb-4">
          <label
            htmlFor="color-picker-hex-input"
            className="text-base-content mb-1.5 block text-xs font-medium"
          >
            Custom Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={hexInput || "#000000"}
              onChange={e => {
                setHexInput(e.target.value);
                handleColorSelect("hex", e.target.value);
              }}
              className="border-base-300 bg-base-200 h-10 w-16 cursor-pointer rounded-lg border-2"
              style={{ padding: "2px" }}
            />
            <input
              id="color-picker-hex-input"
              type="text"
              value={hexInput}
              onChange={e => setHexInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleHexSubmit()}
              placeholder="#000000"
              className="input-dialog-md placeholder:text-neutral-content flex-1"
            />
            <button type="button" onClick={handleHexSubmit} className="btn btn-primary">
              Apply
            </button>
          </div>
        </div>

        {/* Special Colors */}
        <div className="mb-4">
          <SpecialColorsSection
            selectedColor={selectedColor}
            onSelect={handleColorSelect}
            onDoubleClick={handleColorDoubleClick}
          />
        </div>

        {/* Design System Palette */}
        {dialog.showPalette && (
          <div className="mb-4">
            <DesignSystemPalette
              selectedColor={selectedColor}
              onSelect={paletteValue => handleColorSelect("palette", paletteValue)}
            />
          </div>
        )}

        {/* Recent Colors */}
        {recentColors.length > 0 && (
          <div className="mb-4">
            <RecentColorsSection
              recentColors={recentColors}
              selectedColor={selectedColor}
              onClear={() => {
                setRecentColors([]);
                phStorage.remove("recent-colors");
              }}
              onSelect={handleColorSelect}
              onDoubleClick={handleColorDoubleClick}
            />
          </div>
        )}

        {/* Tailwind Colors */}
        <TailwindColorsSection
          selectedColor={selectedColor}
          onSelect={handleColorSelect}
          onDoubleClick={handleColorDoubleClick}
        />
      </div>
    </LeftSidebarDialog>
  );
}
