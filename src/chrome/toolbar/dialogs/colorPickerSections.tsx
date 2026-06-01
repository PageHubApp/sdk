/**
 * Reusable color-picker grid sections — Palette / Recent / Tailwind / Special.
 *
 * Extracted verbatim from `ColorPickerSidebarDialog.tsx` so both the original
 * left-sidebar dialog and the new toolbar popover (`ColorPanelBody`) render
 * the exact same swatch UIs without duplicating markup.
 */
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbCheck, TbTrash } from "react-icons/tb";
import {
  applyOpacityToCssColor,
  resolveColorForDisplay,
  splitOpacitySuffix,
} from "../../../utils/design/color";
import { TAILWIND_COLORS, SPECIAL_COLORS } from "./colorPickerConstants";
import { getTailwindColorHex } from "./useColorPickerState";
import colors from "tailwindcss/colors";

type SelectFn = (type: string, value: string) => void;

export function SpecialColorsSection({
  selectedColor,
  onSelect,
  onDoubleClick,
}: {
  selectedColor: string;
  onSelect: SelectFn;
  onDoubleClick: SelectFn;
}) {
  return (
    <div>
      <span className="text-base-content mb-1.5 block text-xs font-medium">Special</span>
      <div className="grid grid-cols-12 gap-1">
        {SPECIAL_COLORS.map(color => (
          <button
            key={color.value}
            onClick={() => onSelect("class", color.value)}
            onDoubleClick={() => onDoubleClick("class", color.value)}
            className="group relative aspect-square w-full rounded-lg border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: color.hex,
              borderColor: selectedColor === color.value ? "var(--primary)" : "var(--base-300)",
            }}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={color.name}
            data-tooltip-place="top"
            data-tooltip-offset={10}
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
        ))}
      </div>
    </div>
  );
}

// Palette grid — replaced by DesignSystemPalette (Framer-style searchable list).
// Kept the file for the other section renderers (Recent, Tailwind, Special) and
// the shared `resolvePaletteHex` helper.

export function RecentColorsSection({
  recentColors,
  selectedColor,
  onClear,
  onSelect,
  onDoubleClick,
}: {
  recentColors: string[];
  selectedColor: string;
  onClear: () => void;
  onSelect: SelectFn;
  onDoubleClick: SelectFn;
}) {
  return (
    <div>
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

export function TailwindColorsSection({
  selectedColor,
  onSelect,
  onDoubleClick,
}: {
  selectedColor: string;
  onSelect: SelectFn;
  onDoubleClick: SelectFn;
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
                  <button
                    key={shade}
                    onClick={() => onSelect("class", colorValue)}
                    onDoubleClick={() => onDoubleClick("class", colorValue)}
                    className="group relative aspect-square w-full rounded-lg border transition-all hover:scale-110"
                    style={{
                      backgroundColor: hexColor,
                      borderColor: isSelected ? "var(--primary)" : "var(--base-300)",
                      borderWidth: isSelected ? "2px" : "1px",
                    }}
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content={`${colorGroup.name.charAt(0).toUpperCase() + colorGroup.name.slice(1)} ${shade}`}
                    data-tooltip-place="top"
                    data-tooltip-offset={10}
                  >
                    {isSelected && (
                      <TbCheck className="absolute inset-0 m-auto size-4 text-white drop-shadow-lg" />
                    )}
                  </button>
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
export function resolvePaletteHex(
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
