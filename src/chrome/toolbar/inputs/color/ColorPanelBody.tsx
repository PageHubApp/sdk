/**
 * ColorPanelBody — Framer-style vertical color picker hosted inside a
 * FloatingPanel. Composed of:
 *
 *  - SketchPicker (HSV / RGB / hex)
 *  - DesignSystemPalette (searchable list with edit/create/delete)
 *  - RecentColorsSection / TailwindColorsSection / SpecialColorsSection
 *    (extracted from ColorPickerSidebarDialog)
 *  - useEyeDropper
 *
 * Local state — does not go through ColorPickerSidebarAtom. Owns its own
 * `value` reads via `value`/`onChange` props passed by ColorInputPopover.
 */
import { useEffect, useState } from "react";
import { SketchPicker } from "@hello-pangea/color-picker";
import { TbColorPicker, TbTrash } from "react-icons/tb";
import useEyeDropper from "use-eye-dropper";
import { phStorage } from "@/utils/phStorage";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { DesignSystemPalette } from "./DesignSystemPalette";
import {
  RecentColorsSection,
  SpecialColorsSection,
  TailwindColorsSection,
} from "../../dialogs/colorPickerSections";

interface ColorPanelBodyProps {
  /** Current stored value (palette ref, hex, tailwind class). Used to highlight selection. */
  value: string;
  /** Called whenever the user picks a color. Same shape as TokenPicker / ColorInput consumers. */
  onChange: (data: { type: "palette" | "hex" | "rgb" | "class"; value: any }) => void;
  /** Optional clear handler — wired to "Clear color" trash icon next to hex input. */
  onClear?: () => void;
}

function loadRecentColors(): string[] {
  try {
    const stored = phStorage.get("recent-colors");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentColor(color: string, current: string[]): string[] {
  const updated = [color, ...current.filter(c => c !== color)].slice(0, 12);
  phStorage.set("recent-colors", updated);
  return updated;
}

function deriveSelectedColor(value: string): string {
  if (!value) return "";
  // Stored values look like `bg-[var(--primary)]`, `text-blue-500`, `bg-[#ff0000]`,
  // `palette:Primary`, etc. The section components compare against the raw value,
  // so for palette refs return as-is, otherwise strip the prefix tail (`bg-…` →
  // `…`) to match Tailwind class buttons. Hex values are stripped to bare `#…`
  // so the Recent grid can match them.
  if (value.startsWith("palette:")) return value;
  const stripped = value.replace(/^(bg|text|border|from|to|via|ring|divide|outline)-/, "");
  const hexMatch = stripped.match(/#[0-9A-Fa-f]{3,8}/);
  if (hexMatch) return hexMatch[0];
  // `[var(--name)]` style class — surface the underlying palette name so the
  // DesignSystemPalette row matches by name and lights up.
  const varMatch = stripped.match(/\[var\(--([a-z0-9-]+)\)\]/i);
  if (varMatch) return varMatch[1];
  return stripped;
}

function deriveHexInput(value: string): string {
  const m = value.match(/#[0-9A-Fa-f]{6,8}/);
  return m ? m[0] : "";
}

export function ColorPanelBody({ value, onChange, onClear }: ColorPanelBodyProps) {
  const { open: openEyeDropper, isSupported } = useEyeDropper();

  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
  const [hexInput, setHexInput] = useState(() => deriveHexInput(value));

  const selectedColor = deriveSelectedColor(value);

  // Keep hex input in sync if value changes from outside (palette pick, etc.)
  useEffect(() => {
    const next = deriveHexInput(value);
    if (next) setHexInput(next);
  }, [value]);

  const dispatch = (data: { type: "palette" | "hex" | "rgb" | "class"; value: any }) => {
    onChange(data);
    if (data.type === "hex" && typeof data.value === "string") {
      setRecentColors(prev => saveRecentColor(data.value, prev));
    } else if (data.type === "class" && typeof data.value === "string") {
      setRecentColors(prev => saveRecentColor(data.value, prev));
    }
  };

  const handleSelect = (type: string, val: string) => {
    dispatch({ type: type as "palette" | "hex" | "class", value: val });
  };

  const handleHexSubmit = () => {
    if (hexInput && /^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      dispatch({ type: "hex", value: hexInput });
    }
  };

  const handleEyeDropper = async () => {
    try {
      const color = await openEyeDropper();
      if (color?.sRGBHex) {
        setHexInput(color.sRGBHex);
        dispatch({ type: "hex", value: color.sRGBHex });
      }
    } catch {
      /* user cancelled */
    }
  };

  const clearRecent = () => {
    setRecentColors([]);
    phStorage.remove("recent-colors");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* SketchPicker — HSV box + hue + alpha + RGB/HSL inputs all in one */}
      <div className="overflow-hidden rounded-md">
        <SketchPicker
          width="100%"
          presetColors={[]}
          disableAlpha={false}
          styles={{
            picker: {},
            saturation: {
              width: "100%",
              height: "120px",
              paddingBottom: "",
              position: "relative" as const,
              overflow: "hidden",
            },
          }}
          color={hexInput || "#3b82f6"}
          onChange={c => setHexInput(c.hex)}
          onChangeComplete={c => {
            // Pass full RGB so opacity is preserved when alpha < 1.
            const a = c.rgb?.a ?? 1;
            if (a < 1 - 1e-6) {
              dispatch({ type: "rgb", value: c.rgb });
            } else {
              dispatch({ type: "hex", value: c.hex });
            }
          }}
        />
      </div>

      {/* Hex row + eyedropper + clear */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={hexInput}
          onChange={e => setHexInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleHexSubmit()}
          onBlur={handleHexSubmit}
          placeholder="#000000"
          className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:border-ring focus:ring-ring h-8 flex-1 rounded-md border px-2 text-xs outline-none focus:ring-1"
        />
        {isSupported() && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className="border-base-300 text-neutral-content hover:border-base-content hover:text-base-content flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Eyedropper"
            data-tooltip-place="top"
            data-tooltip-offset={10}
            aria-label="Pick color from screen"
          >
            <TbColorPicker className="size-3.5" />
          </button>
        )}
        {onClear && (
          <button
            type="button"
            disabled={!value}
            onClick={onClear}
            className="border-base-300 text-neutral-content hover:border-primary hover:text-base-content flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-40"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Clear color"
            data-tooltip-place="top"
            data-tooltip-offset={10}
            aria-label="Clear color"
          >
            <TbTrash className="size-3.5" />
          </button>
        )}
      </div>

      <DesignSystemPalette
        selectedColor={selectedColor}
        onSelect={paletteValue => dispatch({ type: "palette", value: paletteValue })}
      />

      {/* Special colors (transparent, currentColor, inherit, etc.) */}
      <SpecialColorsSection
        selectedColor={selectedColor}
        onSelect={handleSelect}
        onDoubleClick={handleSelect}
      />

      {/* Recent picks */}
      {recentColors.length > 0 && (
        <RecentColorsSection
          recentColors={recentColors}
          selectedColor={selectedColor}
          onClear={clearRecent}
          onSelect={handleSelect}
          onDoubleClick={handleSelect}
        />
      )}

      {/* Full Tailwind palette */}
      <TailwindColorsSection
        selectedColor={selectedColor}
        onSelect={handleSelect}
        onDoubleClick={handleSelect}
      />
    </div>
  );
}
