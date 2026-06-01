import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { SketchPicker } from "@hello-pangea/color-picker";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { AnchoredPopover } from "@/chrome/popovers/AnchoredPopover";
import debounce from "lodash.debounce";
import { useEffect, useState } from "react";
import {
  TbCheck,
  TbChevronDown,
  TbChevronRight,
  TbColorPicker,
  TbDeviceFloppy,
  TbX,
} from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import useEyeDropper from "use-eye-dropper";
import { resolveTheme } from "../../../utils/design/resolveTheme";
import {
  applyOpacityToCssColor,
  getTailwindColorHex,
  hexToRGBA,
  isPaletteColorSelected,
  splitOpacitySuffix,
  stripTailwindPrefix,
} from "../../../utils/design/color";
import { getColorPalette } from "../../../utils/tailwind/tailwind";

export { ColorPaletteAtom, ColorPickerAtom } from "./dialogAtoms";
import { ColorPaletteAtom, ColorPickerAtom } from "./dialogAtoms";
import { phStorage } from "../../../utils/phStorage";

// Recent colors stored in localStorage
const MAX_RECENT = 8;

const loadRecentColors = (): string[] => {
  try {
    const stored = phStorage.get("recent-colors");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentColor = (color: string, recent: string[]): string[] => {
  const updated = [color, ...recent.filter(c => c !== color)].slice(0, MAX_RECENT);
  phStorage.set("recent-colors", updated);
  return updated;
};

export const ColorPickerDialog = () => {
  const twPalette = getColorPalette();

  const [colorPicker, setColorPicker] = useAtomState(ColorPickerAtom);
  const [colorPalette, setColorPallet] = useAtomState(ColorPaletteAtom);
  const [namedPalette, setNamedPalette] = useState<Array<{ name: string; color: string }>>([]);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showTailwind, setShowTailwind] = useState(false);

  const { open, isSupported } = useEyeDropper();
  const { actions, query } = useEditor();

  const hasPaletteColors = namedPalette.length > 0;
  const mode = colorPicker.mode || "both";
  const canShowPalette =
    (mode === "both" || mode === "palette") &&
    hasPaletteColors &&
    colorPicker.showPalette !== false;
  const canShowPicker = mode === "both" || mode === "picker";

  // Load recent colors when dialog opens
  useEffect(() => {
    if (colorPicker.enabled) {
      setRecentColors(loadRecentColors());
      setShowTailwind(false); // Reset tailwind section on open
    }
  }, [colorPicker.enabled]);

  // Load palette from ROOT_NODE
  useEffect(() => {
    const node = query.node(ROOT_NODE).get();
    if (!node) return;
    const themePalette = resolveTheme(node.data?.props || {}).palette;

    if (Array.isArray(themePalette) && themePalette.length > 0) {
      const palette = themePalette.filter(p => p && typeof p === "object" && p.name && p.color);
      setNamedPalette(palette);
      const colors = palette.map(p => p.color);
      setColorPallet(colors);
    } else {
      setNamedPalette([]);
      setColorPallet([]);
    }
  }, [colorPicker.enabled, query, setColorPallet]);

  const saveToPallet = () => {
    const data = colorPicker.value;
    let val = data;

    if (!data) return;

    if (typeof data === "object" && data.r !== undefined) {
      val = `rgba(${data.r},${data.g},${data.b},${data.a})`;
    } else if (typeof data === "string") {
      val = data;
    } else {
      return;
    }

    actions.setProp(ROOT_NODE, props => {
      const theme = resolveTheme(props);
      const currentPalette = [...theme.palette];
      const existingIndex = currentPalette.findIndex(p => p.color === val);
      if (existingIndex === -1) {
        currentPalette.unshift({ name: `Color ${currentPalette.length + 1}`, color: val });
      }
      if (!props.theme) props.theme = {};
      props.theme.palette = currentPalette;
      const colors = currentPalette.map(p => p.color);
      setColorPallet(colors);
    });
  };

  const pickColor = () => {
    open()
      .then(color => {
        const value = hexToRGBA(color.sRGBHex, 1);
        changed({ type: "hex", value });
      })
      .catch(() => {
        // User cancelled eyedropper — no action needed
      });
  };

  const changed = value => {
    if (colorPicker.changed) {
      setColorPicker({ ...colorPicker, value: value.value });
      colorPicker.changed(value);

      // Save to recent (convert to display string for recents)
      if (value.type === "hex" && typeof value.value === "string") {
        setRecentColors(prev => saveRecentColor(value.value, prev));
      } else if (value.type === "rgb" && typeof value.value === "object") {
        const { r, g, b } = value.value;
        const hex = `#${[r, g, b].map(c => c.toString(16).padStart(2, "0")).join("")}`;
        setRecentColors(prev => saveRecentColor(hex, prev));
      } else if (value.type === "class" && typeof value.value === "string") {
        const hex = getTailwindColorHex(
          value.value.split("-").slice(0, -1).join("-"),
          value.value.split("-").pop()
        );
        if (hex && hex !== "#cccccc") {
          setRecentColors(prev => saveRecentColor(hex, prev));
        }
      }
    }
  };

  // Preview on hover disabled — it mutates node props and causes issues

  // Convert value to display color for SketchPicker
  const getPickerDisplayColor = () => {
    if (!colorPicker.value) return undefined;
    const val = colorPicker.value;

    if (typeof val === "object" && val.r !== undefined) return val;

    if (typeof val === "string") {
      let tail = stripTailwindPrefix(val);
      const { base: opaqueTail, opacity: tailOpacity } = splitOpacitySuffix(tail);
      let cleanValue = opaqueTail.replace(/[\[\]]/g, "");

      const withAlpha = (css: string) =>
        tailOpacity != null && tailOpacity < 1 - 1e-6
          ? applyOpacityToCssColor(css, tailOpacity)
          : css;

      if (cleanValue.includes("#")) return withAlpha(cleanValue);
      if (cleanValue.startsWith("rgba") || cleanValue.startsWith("rgb"))
        return withAlpha(cleanValue);

      if (cleanValue.includes("-")) {
        const parts = cleanValue.split("-");
        if (parts.length === 2) {
          const [colorName, shade] = parts;
          return withAlpha(getTailwindColorHex(colorName, shade));
        }
      }

      if (cleanValue === "white") return withAlpha("#ffffff");
      if (cleanValue === "black") return withAlpha("#000000");
      if (cleanValue === "transparent") return withAlpha("transparent");
    }

    return undefined;
  };

  const pickerColor = getPickerDisplayColor();

  const close = () => {
    setColorPicker({ ...colorPicker, enabled: false });
  };

  // Position based on trigger rect from atom
  const rect: DOMRect | null = colorPicker.e ?? null;
  const innerMaxHeight =
    typeof window !== "undefined" ? Math.min(600, window.innerHeight * 0.6) : 600;

  return (
    <AnchoredPopover
      open={Boolean(colorPicker.enabled && rect)}
      onOpenChange={openNext => {
        if (!openNext) close();
      }}
      anchorRect={rect}
      placement="bottom-start"
      mainAxisOffset={6}
      maxHeightCeiling={innerMaxHeight}
      className="pagehub-sdk-root ph-panel pointer-events-auto w-[310px] overflow-hidden"
    >
      <div role="dialog">
        {/* Header */}
        <div className="border-base-300 bg-accent text-accent-content flex items-center justify-between border-b px-3 py-1.5">
          <div className="flex gap-1.5">
            {colorPicker.propKey !== "theme-design-system" && (
              <button
                className="text-accent-content hover:bg-neutral hover:text-base-content flex cursor-pointer items-center justify-center rounded-md p-1 text-xs transition-colors"
                onClick={saveToPallet}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Save to palette"
                data-tooltip-offset={10}
              >
                <TbDeviceFloppy />
              </button>
            )}
            {isSupported() && (
              <button
                onClick={pickColor}
                className="text-accent-content hover:bg-neutral hover:text-base-content flex cursor-pointer items-center justify-center rounded-md p-1 text-xs transition-colors"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Eyedropper"
                data-tooltip-offset={10}
              >
                <TbColorPicker />
              </button>
            )}
          </div>
          <button
            onClick={close}
            className="text-accent-content hover:bg-accent-content/10 flex items-center justify-center rounded-md p-1 transition-colors"
          >
            <TbX className="size-3.5" />
          </button>
        </div>

        <div
          className="scrollbar-light bg-base-100 flex w-[310px] flex-col overflow-y-auto rounded-lg"
          style={{ maxHeight: innerMaxHeight }}
        >
          {/* 1. Design Tokens — always on top when available */}
          {canShowPalette && (
            <div className="border-base-300 border-b px-2 py-1.5">
              <div className="flex flex-wrap gap-1">
                {namedPalette.map((paletteColor, index) => {
                  const isSelected = isPaletteColorSelected(colorPicker.value, paletteColor);
                  const isTailwindClass =
                    !paletteColor.color.includes("rgba") && !paletteColor.color.startsWith("#");
                  const displayColor =
                    isTailwindClass && !paletteColor.color.startsWith("bg-")
                      ? `bg-${paletteColor.color}`
                      : paletteColor.color;

                  return (
                    <button
                      key={index}
                      className="group relative"
                      onMouseDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        changed({ type: "palette", value: `palette:${paletteColor.name}` });
                      }}
                      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                      data-tooltip-content={paletteColor.name}
                      data-tooltip-place="top"
                      data-tooltip-offset={10}
                    >
                      <div
                        className={`size-7 rounded-md border-2 transition-all group-hover:scale-110 ${
                          isSelected ? "border-primary ring-primary/30 ring-1" : "border-base-300"
                        } ${isTailwindClass ? displayColor : ""}`}
                        style={{
                          backgroundColor: !isTailwindClass ? paletteColor.color : undefined,
                        }}
                      >
                        {isSelected && (
                          <TbCheck className="m-auto mt-0.5 size-4 text-white drop-shadow-md" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Recent Colors — small circles, only if there are any */}
          {recentColors.length > 0 && (
            <div className="border-base-300 flex items-center gap-1.5 border-b px-2 py-1.5">
              <span className="text-neutral-content shrink-0 text-[9px]">Recent</span>
              <div className="flex flex-1 gap-1">
                {recentColors.map((color, idx) => (
                  <button
                    key={idx}
                    className="border-base-300 hover:border-primary size-5 shrink-0 cursor-pointer rounded-full border transition-all hover:scale-110"
                    style={{ backgroundColor: color }}
                    onClick={() => changed({ type: "hex", value: color })}
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. Spectrum Picker — always visible when picker mode allows */}
          {canShowPicker && (
            <>
              <div className="px-2 pt-2">
                <div className="overflow-hidden rounded-lg">
                  <SketchPicker
                    width="100%"
                    presetColors={[]}
                    styles={{
                      picker: {},
                      saturation: {
                        width: "100%",
                        height: "100px",
                        paddingBottom: "",
                        position: "relative",
                        overflow: "hidden",
                      },
                    }}
                    color={pickerColor || undefined}
                    onChangeComplete={_color => {
                      changed({ type: "rgb", value: _color?.rgb });
                    }}
                    onChange={debounce(_color => {
                      setColorPicker({ ...colorPicker, value: _color?.rgb });
                    }, 20)}
                  />
                </div>
              </div>

              {/* 4. Tailwind Colors — collapsed by default */}
              <div className="px-2 pt-1 pb-2">
                <button
                  className="text-neutral-content hover:text-base-content flex w-full items-center gap-1 py-1 text-[10px]"
                  onClick={() => setShowTailwind(!showTailwind)}
                >
                  {showTailwind ? (
                    <TbChevronDown className="size-3" />
                  ) : (
                    <TbChevronRight className="size-3" />
                  )}
                  <span>Tailwind Colors</span>
                </button>

                {showTailwind && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    {Array.from({ length: Math.ceil(twPalette.length / 11) }).map((_, rowIndex) => (
                      <div
                        key={`row-${rowIndex}`}
                        className="relative flex flex-row items-start gap-1"
                      >
                        {twPalette
                          .slice(rowIndex * 11, (rowIndex + 1) * 11)
                          .map((colorGroup, k) => {
                            const mainShade =
                              colorGroup.color.find(c => c.key === "500") ||
                              colorGroup.color[Math.floor(colorGroup.color.length / 2)];
                            return (
                              <button
                                key={`color-${rowIndex * 11 + k}`}
                                className="border-base-300 hover:border-primary size-5 cursor-pointer rounded border transition-all hover:scale-110"
                                style={{ backgroundColor: mainShade.color }}
                                onClick={e => {
                                  e.stopPropagation();
                                  changed({
                                    type: "class",
                                    value: `${colorGroup.key}-${mainShade.key}`,
                                  });
                                }}
                                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                                data-tooltip-content={colorGroup.key}
                                data-tooltip-place="top"
                                data-tooltip-offset={10}
                              />
                            );
                          })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AnchoredPopover>
  );
};

// (positioning + outside-click + escape now handled by <AnchoredPopover>)
