import { Tooltip } from "@/chrome/primitives/layout/Tooltip";
import { BsEyedropper } from "react-icons/bs";
import { TbCheck, TbColorPicker, TbDeviceFloppy, TbTrash, TbX } from "react-icons/tb";
import colors from "tailwindcss/colors";
import { LeftSidebarDialog } from "./LeftSidebarDialog";
import { TAILWIND_COLORS, SPECIAL_COLORS } from "./colorPickerConstants";
import {
  applyOpacityToCssColor,
  resolveColorForDisplay,
  splitOpacitySuffix,
} from "../../../utils/design/colorSystem";
import { useColorPickerState, getTailwindColorHex } from "./useColorPickerState";
import { phStorage } from "../../../utils/phStorage";

export { ColorPickerSidebarAtom } from "./dialogAtoms";

export function ColorPickerSidebarDialog() {
  const {
    dialog,
    hexInput,
    setHexInput,
    selectedColor,
    recentColors,
    setRecentColors,
    palette,
    isEyeDropperSupported,
    handleClose,
    handleColorSelect,
    handleColorDoubleClick,
    handleHexSubmit,
    handleEyeDropper,
    handleSaveToPalette,
    handleRemoveFromPalette,
  } = useColorPickerState();

  const headerRight = (
    <>
      {dialog.showPalette && (
        <Tooltip content="Save to Palette" placement="bottom">
          <button
            onClick={handleSaveToPalette}
            disabled={!hexInput || !/^#[0-9A-Fa-f]{6}$/.test(hexInput)}
            className="text-accent-content hover:bg-accent-content/10 flex items-center justify-center rounded-lg p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Save to palette"
          >
            <TbDeviceFloppy />
          </button>
        </Tooltip>
      )}
      {isEyeDropperSupported() && (
        <Tooltip content="Eyedropper" placement="bottom">
          <button
            onClick={handleEyeDropper}
            className="text-accent-content hover:bg-accent-content/10 flex items-center justify-center rounded-lg p-1 transition-colors"
            aria-label="Pick color from screen"
          >
            <BsEyedropper />
          </button>
        </Tooltip>
      )}
    </>
  );

  return (
    <LeftSidebarDialog
      isOpen={dialog.enabled}
      onClose={handleClose}
      title="Select Color"
      icon={<TbColorPicker />}
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
          <span className="text-base-content mb-1.5 block text-xs font-medium">Special</span>
          <div className="grid grid-cols-12 gap-1">
            {SPECIAL_COLORS.map(color => (
              <Tooltip key={color.value} content={color.name} placement="top">
                <button
                  onClick={() => handleColorSelect("class", color.value)}
                  onDoubleClick={() => handleColorDoubleClick("class", color.value)}
                  className="group relative aspect-square w-full rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color.hex,
                    borderColor:
                      selectedColor === color.value ? "var(--primary)" : "var(--base-300)",
                  }}
                >
                  {color.value === "transparent" && (
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background:
                          "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)",
                        backgroundSize: "8px 8px",
                        backgroundPosition: "0 0, 4px 4px",
                      }}
                    />
                  )}
                  {selectedColor === color.value && (
                    <TbCheck className="text-base-content absolute inset-0 m-auto size-5 drop-shadow-lg" />
                  )}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Design System Palette */}
        {dialog.showPalette && palette.length > 0 && (
          <PaletteSection
            palette={palette}
            selectedColor={selectedColor}
            onSelect={handleColorSelect}
            onDoubleClick={handleColorDoubleClick}
            onRemove={handleRemoveFromPalette}
          />
        )}

        {/* Recent Colors */}
        {recentColors.length > 0 && (
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

// --- Sub-components ---

function PaletteSection({
  palette,
  selectedColor,
  onSelect,
  onDoubleClick,
  onRemove,
}: {
  palette: any[];
  selectedColor: string;
  onSelect: (type: string, value: string) => void;
  onDoubleClick: (type: string, value: string) => void;
  onRemove: (name: string) => void;
}) {
  return (
    <div className="mb-4">
      <span className="text-base-content mb-1.5 block text-xs font-medium">Design System</span>
      <div className="grid grid-cols-12 gap-1">
        {palette.map((paletteColor, idx) => {
          const hexColor = resolvePaletteHex(paletteColor.color || "", palette);
          const paletteValue = `palette:${paletteColor.name}`;
          const isSelected =
            selectedColor.includes(paletteColor.name) || selectedColor === paletteValue;

          return (
            <div key={idx} className="group relative">
              <Tooltip content={paletteColor.name} placement="top">
                <button
                  onClick={() => onSelect("palette", paletteValue)}
                  onDoubleClick={() => onDoubleClick("palette", paletteValue)}
                  className="relative aspect-square w-full rounded-lg border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: hexColor,
                    borderColor: isSelected ? "var(--primary)" : "var(--base-300)",
                  }}
                >
                  {isSelected && (
                    <TbCheck className="absolute inset-0 m-auto size-5 text-white drop-shadow-lg" />
                  )}
                </button>
              </Tooltip>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onRemove(paletteColor.name);
                }}
                className="bg-error text-error-content absolute -top-1 -right-1 hidden rounded-full p-0.5 shadow-lg transition-all group-hover:block hover:scale-110"
                aria-label="Remove color"
              >
                <TbX className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentColorsSection({
  recentColors,
  selectedColor,
  onClear,
  onSelect,
  onDoubleClick,
}: {
  recentColors: string[];
  selectedColor: string;
  onClear: () => void;
  onSelect: (type: string, value: string) => void;
  onDoubleClick: (type: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-base-content text-xs font-medium">Recent</span>
        <button onClick={onClear} className="text-neutral-content hover:text-base-content text-xs">
          <TbTrash className="size-3" />
        </button>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {recentColors.map((color, idx) => (
          <button
            key={idx}
            onClick={() => onSelect("hex", color)}
            onDoubleClick={() => onDoubleClick("hex", color)}
            className="group relative aspect-square w-full rounded-lg border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: selectedColor === color ? "var(--primary)" : "var(--base-300)",
            }}
          >
            {selectedColor === color && (
              <TbCheck className="absolute inset-0 m-auto size-4 text-white drop-shadow-lg" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function TailwindColorsSection({
  selectedColor,
  onSelect,
  onDoubleClick,
}: {
  selectedColor: string;
  onSelect: (type: string, value: string) => void;
  onDoubleClick: (type: string, value: string) => void;
}) {
  return (
    <div>
      <span className="text-base-content mb-1.5 block text-xs font-medium">Tailwind Colors</span>
      <div className="space-y-3">
        {TAILWIND_COLORS.map(colorGroup => (
          <div key={colorGroup.name}>
            <div className="text-neutral-content mb-1 text-xs capitalize">{colorGroup.name}</div>
            <div className="grid grid-cols-12 gap-1">
              {colorGroup.shades.map(shade => {
                const colorValue = `${colorGroup.name}-${shade}`;
                const hexColor = getTailwindColorHex(colorGroup.name, shade);
                const isSelected = selectedColor === colorValue;

                return (
                  <Tooltip
                    key={shade}
                    content={`${colorGroup.name.charAt(0).toUpperCase() + colorGroup.name.slice(1)} ${shade}`}
                    placement="top"
                  >
                    <button
                      onClick={() => onSelect("class", colorValue)}
                      onDoubleClick={() => onDoubleClick("class", colorValue)}
                      className="group relative aspect-square w-full rounded-lg border transition-all hover:scale-110"
                      style={{
                        backgroundColor: hexColor,
                        borderColor: isSelected ? "var(--primary)" : "var(--base-300)",
                        borderWidth: isSelected ? "2px" : "1px",
                      }}
                    >
                      {isSelected && (
                        <TbCheck className="absolute inset-0 m-auto size-4 text-white drop-shadow-lg" />
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Resolve a palette entry color string to a CSS color for swatch preview */
function resolvePaletteHex(
  colorValue: string,
  themePalette: { name: string; color: string }[]
): string {
  let v = colorValue.replace(/^(bg-|text-|border-|from-|to-|via-|ring-)/, "");
  const { base, opacity } = splitOpacitySuffix(v);

  if (base.includes("#")) {
    const hex = base.match(/#[0-9A-Fa-f]{3,8}/i)?.[0] || base;
    return opacity != null && opacity < 1 - 1e-6 ? applyOpacityToCssColor(hex, opacity) : hex;
  }
  if (base === "white") {
    return opacity != null && opacity < 1 - 1e-6
      ? applyOpacityToCssColor("#ffffff", opacity)
      : "#ffffff";
  }
  if (base === "black") {
    return opacity != null && opacity < 1 - 1e-6
      ? applyOpacityToCssColor("#000000", opacity)
      : "#000000";
  }
  if (base === "transparent") {
    return opacity != null && opacity < 1 - 1e-6
      ? applyOpacityToCssColor("transparent", opacity)
      : "transparent";
  }

  // Single Tailwind hue key (e.g. palette stored as "blue" → shade 500)
  if (/^[a-z]+$/i.test(base)) {
    const colorKey = base.toLowerCase();
    const colorObj = colors[colorKey as keyof typeof colors] as unknown;
    if (
      colorObj &&
      typeof colorObj === "object" &&
      Object.prototype.hasOwnProperty.call(colorObj, "500")
    ) {
      let h = (colorObj as Record<string, string>)["500"];
      if (opacity != null && opacity < 1 - 1e-6) h = applyOpacityToCssColor(h, opacity);
      return h;
    }
  }

  const resolved = resolveColorForDisplay(`text-${base}`, "text", themePalette);
  let bg = resolved.backgroundColor;
  if (opacity != null && opacity < 1 - 1e-6) {
    bg = applyOpacityToCssColor(bg, opacity);
  }
  return bg;
}
