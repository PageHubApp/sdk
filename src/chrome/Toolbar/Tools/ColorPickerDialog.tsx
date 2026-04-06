import { ROOT_NODE, useEditor } from "@craftjs/core";
import { SketchPicker } from "@hello-pangea/color-picker";
import { Popover, PopoverPanel } from "@headlessui/react";
import { Tooltip } from "components/layout/Tooltip";
import debounce from "lodash.debounce";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { BsEyedropper } from "react-icons/bs";
import { TbCheck, TbChevronDown, TbChevronRight, TbDeviceFloppy, TbX } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import useEyeDropper from "use-eye-dropper";
import {
  getTailwindColorHex,
  hexToRGBA,
  isPaletteColorSelected,
  stripTailwindPrefix,
} from "utils/design/colorSystem";
import { getColorPallet } from "utils/tailwind";

export { ColorPalletAtom, ColorPickerAtom } from "./dialogAtoms";
import { ColorPalletAtom, ColorPickerAtom } from "./dialogAtoms";

// Recent colors stored in localStorage
const RECENT_COLORS_KEY = "recentColors";
const MAX_RECENT = 8;

const loadRecentColors = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentColor = (color: string, recent: string[]): string[] => {
  const updated = [color, ...recent.filter(c => c !== color)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  return updated;
};

export const ColorPickerDialog = () => {
  const pallet = getColorPallet();

  const [colorPicker, setColorPicker] = useAtomState(ColorPickerAtom);
  const [colorPallet, setColorPallet] = useAtomState(ColorPalletAtom);
  const [namedPalette, setNamedPalette] = useState<Array<{ name: string; color: string }>>([]);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showTailwind, setShowTailwind] = useState(false);

  const { open, isSupported } = useEyeDropper();
  const { actions, query } = useEditor();

  const hasPaletteColors = namedPalette.length > 0;
  const mode = colorPicker.mode || "both";
  const canShowPalette =
    (mode === "both" || mode === "palette") && hasPaletteColors && colorPicker.showPallet !== false;
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
    const nodePrsets = node.data.props.pallet || [];

    if (Array.isArray(nodePrsets) && nodePrsets.length > 0) {
      const palette = nodePrsets.filter(p => p && typeof p === "object" && p.name && p.color);
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
      const currentPallet = props.pallet || [];
      const existingIndex = currentPallet.findIndex(p => p.color === val);
      if (existingIndex === -1) {
        props.pallet = [
          { name: `Color ${currentPallet.length + 1}`, color: val },
          ...currentPallet,
        ];
      }
      const colors = props.pallet.map(p => p.color);
      setColorPallet(colors);
    });
  };

  const pickColor = () => {
    open()
      .then(color => {
        const value = hexToRGBA(color.sRGBHex, 1);
        changed({ type: "hex", value });
      })
      .catch(e => {
        console.log(e);
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
      let cleanValue = stripTailwindPrefix(val);
      cleanValue = cleanValue.replace(/[\[\]]/g, "");

      if (cleanValue.includes("#")) return cleanValue;
      if (cleanValue.startsWith("rgba") || cleanValue.startsWith("rgb")) return cleanValue;

      if (cleanValue.includes("-")) {
        const parts = cleanValue.split("-");
        if (parts.length === 2) {
          const [colorName, shade] = parts;
          return getTailwindColorHex(colorName, shade);
        }
      }

      if (cleanValue === "white") return "#ffffff";
      if (cleanValue === "black") return "#000000";
      if (cleanValue === "transparent") return "transparent";
    }

    return undefined;
  };

  const pickerColor = getPickerDisplayColor();

  const close = () => {
    setColorPicker({ ...colorPicker, enabled: false });
  };

  // Position based on trigger rect from atom
  const rect = colorPicker.e;
  const panelStyle = usePanelPosition(rect, 310, 600);

  if (!colorPicker.enabled) return null;

  return ReactDOM.createPortal(
    <ColorPickerBackdrop onClose={close}>
      <div
        role="dialog"
        className="pagehub-sdk-root ph-panel pointer-events-auto w-[310px] overflow-hidden"
        style={panelStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-accent px-3 py-1.5 text-accent-foreground">
          <div className="flex gap-1.5">
            {!colorPicker.propKey?.startsWith("pallet-") &&
              colorPicker.propKey !== "pallet-design-system" && (
                <Tooltip content="Save to palette">
                  <button
                    className="flex cursor-pointer items-center justify-center rounded-lg p-1 text-xs text-accent-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={saveToPallet}
                  >
                    <TbDeviceFloppy />
                  </button>
                </Tooltip>
              )}
            {isSupported() && (
              <Tooltip content="Eyedropper" arrow={false}>
                <button
                  onClick={pickColor}
                  className="flex cursor-pointer items-center justify-center rounded-lg p-1 text-xs text-accent-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <BsEyedropper />
                </button>
              </Tooltip>
            )}
          </div>
          <button
            onClick={close}
            className="flex items-center justify-center rounded-lg p-1 text-accent-foreground transition-colors hover:bg-accent-foreground/10"
          >
            <TbX className="size-3.5" />
          </button>
        </div>

        <div className="scrollbar-light flex w-[310px] flex-col overflow-y-auto rounded-lg bg-background" style={{ maxHeight: panelStyle.maxHeight }}>
        {/* 1. Design Tokens — always on top when available */}
        {canShowPalette && (
          <div className="border-b border-border px-2 py-1.5">
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
                  <Tooltip key={index} content={paletteColor.name} placement="top" arrow={false}>
                    <button
                      className="group relative"
                      onMouseDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        changed({ type: "palette", value: `palette:${paletteColor.name}` });
                      }}
                    >
                      <div
                        className={`size-7 rounded-md border-2 transition-all group-hover:scale-110 ${
                          isSelected ? "border-primary ring-1 ring-primary/30" : "border-border"
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
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Recent Colors — small circles, only if there are any */}
        {recentColors.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
            <span className="shrink-0 text-[9px] text-muted-foreground">Recent</span>
            <div className="flex flex-1 gap-1">
              {recentColors.map((color, idx) => (
                <button
                  key={idx}
                  className="size-5 shrink-0 cursor-pointer rounded-full border border-border transition-all hover:scale-110 hover:border-primary"
                  style={{ backgroundColor: color }}
                  onClick={() => changed({ type: "hex", value: color })}
                  title={color}
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
            <div className="px-2 pb-2 pt-1">
              <button
                className="flex w-full items-center gap-1 py-1 text-[10px] text-muted-foreground hover:text-foreground"
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
                  {Array.from({ length: Math.ceil(pallet.length / 11) }).map((_, rowIndex) => (
                    <div
                      key={`row-${rowIndex}`}
                      className="relative flex flex-row items-start gap-1"
                    >
                      {pallet.slice(rowIndex * 11, (rowIndex + 1) * 11).map((colorGroup, k) => {
                        const mainShade =
                          colorGroup.color.find(c => c.key === "500") ||
                          colorGroup.color[Math.floor(colorGroup.color.length / 2)];
                        return (
                          <Tooltip
                            key={`color-${rowIndex * 11 + k}`}
                            content={colorGroup.key}
                            placement="top"
                            arrow={false}
                          >
                            <button
                              className="size-5 cursor-pointer rounded border border-border transition-all hover:scale-110 hover:border-primary"
                              style={{ backgroundColor: mainShade.color }}
                              onClick={e => {
                                e.stopPropagation();
                                changed({
                                  type: "class",
                                  value: `${colorGroup.key}-${mainShade.key}`,
                                });
                              }}
                            />
                          </Tooltip>
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
    </ColorPickerBackdrop>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};

// ── Positioning hook ────────────────────────────────────────────────────────

const usePanelPosition = (rect: any, width: number, maxHeight: number) => {
  if (!rect) return { position: "fixed" as const, top: 100, left: 100, zIndex: 99999, maxHeight };

  const availableBelow = window.innerHeight - rect.bottom - 20;
  const availableRight = window.innerWidth - rect.left - 20;

  let top = rect.bottom + 6;
  let left = rect.left;

  // Flip up if not enough space below
  if (availableBelow < 200) {
    top = Math.max(20, rect.top - Math.min(maxHeight, rect.top - 20) - 6);
  }

  // Shift left if overflowing right
  if (availableRight < width) {
    left = Math.max(20, window.innerWidth - width - 20);
  }

  return {
    position: "fixed" as const,
    top,
    left,
    zIndex: 99999,
    maxHeight: Math.min(maxHeight, window.innerHeight * 0.6),
  };
};

// ── Backdrop handles click-outside and escape ───────────────────────────────

const ColorPickerBackdrop = ({ onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the dialog or a tooltip
      if (ref.current?.contains(target)) return;
      if (target.closest("[data-tooltip-id]") || target.closest('[role="tooltip"]')) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return <div ref={ref}>{children}</div>;
};
