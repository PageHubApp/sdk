// @ts-nocheck
import { ROOT_NODE, useEditor } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";
import { useEffect, useState } from "react";
import { BsEyedropper } from "react-icons/bs";
import { TbCheck, TbColorPicker, TbDeviceFloppy, TbTrash, TbX } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { ColorPickerSidebarAtom } from "./dialogAtoms";
import colors from "tailwindcss/colors";
import useEyeDropper from "use-eye-dropper";
import { LeftSidebarDialog } from "./LeftSidebarDialog";

// Tailwind color presets
const tailwindColors = [
  {
    name: "slate",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "gray",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "zinc",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "neutral",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "stone",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "red",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "orange",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "amber",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "yellow",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "lime",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "green",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "emerald",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "teal",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "cyan",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "sky",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "blue",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "indigo",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "violet",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "purple",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "fuchsia",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "pink",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
  {
    name: "rose",
    shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  },
];

const specialColors = [
  { name: "White", value: "white", hex: "#ffffff" },
  { name: "Black", value: "black", hex: "#000000" },
  { name: "Transparent", value: "transparent", hex: "transparent" },
];

export { ColorPickerSidebarAtom } from "./dialogAtoms";

export const ColorPickerSidebarDialog = () => {
  const [dialog, setDialog] = useAtomState(ColorPickerSidebarAtom);
  const [hexInput, setHexInput] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [palette, setPalette] = useState<any[]>([]);
  const { query, actions } = useEditor();
  const { open: openEyeDropper, isSupported } = useEyeDropper();

  // Load palette from ROOT_NODE
  useEffect(() => {
    if (!dialog.enabled || !query) return;

    try {
      const rootNode = query.node(ROOT_NODE).get();
      const pagePalette = rootNode?.data?.props?.pallet || [];
      setPalette(pagePalette);
    } catch (error) {
      console.error("Failed to load palette:", error);
    }
  }, [dialog.enabled, query]);

  // Load recent colors from localStorage
  useEffect(() => {
    if (dialog.enabled) {
      const stored = localStorage.getItem("recentColors");
      if (stored) {
        try {
          setRecentColors(JSON.parse(stored));
        } catch (e) {
          setRecentColors([]);
        }
      }
    }
  }, [dialog.enabled]);

  // Set initial values when dialog opens
  useEffect(() => {
    if (dialog.enabled && dialog.value) {
      setSelectedColor(dialog.value);
      // Extract hex from value if present
      if (dialog.value.includes("#")) {
        const hex = dialog.value.match(/#[0-9A-Fa-f]{6}/)?.[0] || "";
        setHexInput(hex);
      }
    }
  }, [dialog.enabled, dialog.value]);

  const handleClose = () => {
    setDialog({ ...dialog, enabled: false });
  };

  const saveToRecent = (color: string) => {
    const updated = [color, ...recentColors.filter(c => c !== color)].slice(0, 12);
    setRecentColors(updated);
    localStorage.setItem("recentColors", JSON.stringify(updated));
  };

  const handleColorSelect = (type: string, value: string) => {
    if (dialog.changed) {
      dialog.changed({ type, value });
      setSelectedColor(value);
      saveToRecent(value);
    }
  };

  const handleColorDoubleClick = (type: string, value: string) => {
    handleColorSelect(type, value);
    handleClose();
  };

  const handleHexSubmit = () => {
    if (hexInput && /^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      handleColorSelect("hex", hexInput);
    }
  };

  const handleEyeDropper = async () => {
    try {
      const color = await openEyeDropper();
      if (color?.sRGBHex) {
        setHexInput(color.sRGBHex);
        handleColorSelect("hex", color.sRGBHex);
      }
    } catch (e) {
      console.log("User cancelled eyedropper");
    }
  };

  const handleSaveToPalette = () => {
    if (!hexInput || !query || !actions) return;

    const colorName = prompt("Enter a name for this color:");
    if (!colorName) return;

    const rootNode = query.node(ROOT_NODE).get();
    const currentPalette = rootNode?.data?.props?.pallet || [];

    const newColor = {
      name: colorName,
      color: hexInput,
    };

    actions.setProp(ROOT_NODE, props => {
      props.pallet = [...currentPalette, newColor];
    });

    setPalette([...currentPalette, newColor]);
  };

  const handleRemoveFromPalette = (colorName: string) => {
    if (!query || !actions) return;

    const rootNode = query.node(ROOT_NODE).get();
    const currentPalette = rootNode?.data?.props?.pallet || [];

    const updatedPalette = currentPalette.filter(c => c.name !== colorName);

    actions.setProp(ROOT_NODE, props => {
      props.pallet = updatedPalette;
    });

    setPalette(updatedPalette);
  };

  const getTailwindColorHex = (colorName: string, shade: string) => {
    const colorKey = colorName.toLowerCase();
    const colorObj = colors[colorKey];

    if (!colorObj) {
      console.warn(`Color ${colorKey} not found`);
      return "#cccccc";
    }

    if (typeof colorObj === "string") {
      // For colors like "white" or "black" that are just strings
      return colorObj;
    }

    if (typeof colorObj === "object" && colorObj[shade]) {
      return colorObj[shade];
    }

    console.warn(`Shade ${shade} not found for ${colorKey}`);
    return "#cccccc";
  };

  const headerRight = (
    <>
      {dialog.showPallet && (
        <Tooltip content="Save to Palette" placement="bottom">
          <button
            onClick={handleSaveToPalette}
            disabled={!hexInput || !/^#[0-9A-Fa-f]{6}$/.test(hexInput)}
            className="flex items-center justify-center rounded-lg p-1 text-accent-foreground transition-colors hover:bg-accent-foreground/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Save to palette"
          >
            <TbDeviceFloppy />
          </button>
        </Tooltip>
      )}
      {isSupported() && (
        <Tooltip content="Eyedropper" placement="bottom">
          <button
            onClick={handleEyeDropper}
            className="flex items-center justify-center rounded-lg p-1 text-accent-foreground transition-colors hover:bg-accent-foreground/10"
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
          <label className="mb-1.5 block text-xs font-medium text-foreground">Custom Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={hexInput || "#000000"}
              onChange={e => {
                setHexInput(e.target.value);
                handleColorSelect("hex", e.target.value);
              }}
              className="h-10 w-16 cursor-pointer rounded-lg border-2 border-border bg-background"
              style={{ padding: "2px" }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={e => setHexInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleHexSubmit()}
              placeholder="#000000"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleHexSubmit}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Special Colors */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground">Special</label>
          <div className="grid grid-cols-12 gap-1">
            {specialColors.map(color => (
              <Tooltip key={color.value} content={color.name} placement="top">
                <button
                  onClick={() => handleColorSelect("class", color.value)}
                  onDoubleClick={() => handleColorDoubleClick("class", color.value)}
                  className="group relative aspect-square w-full rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color.hex,
                    borderColor:
                      selectedColor === color.value ? "var(--primary)" : "var(--border)",
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
                    <TbCheck className="absolute inset-0 m-auto size-5 text-foreground drop-shadow-lg" />
                  )}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Design System Palette */}
        {dialog.showPallet && palette.length > 0 && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Design System
            </label>
            <div className="grid grid-cols-12 gap-1">
              {palette.map((paletteColor, idx) => {
                let colorValue = paletteColor.color || "";

                // Strip Tailwind prefixes
                colorValue = colorValue.replace(/^(bg-|text-|border-|from-|to-|via-|ring-)/, "");

                let hexColor = "#cccccc";

                // Resolve hex color
                if (colorValue.includes("#")) {
                  hexColor = colorValue;
                } else if (colorValue === "white") {
                  hexColor = "#ffffff";
                } else if (colorValue === "black") {
                  hexColor = "#000000";
                } else if (colorValue === "transparent") {
                  hexColor = "transparent";
                } else if (colorValue.includes("-")) {
                  // Tailwind color class like "blue-500"
                  const parts = colorValue.split("-");
                  if (parts.length >= 2) {
                    const shade = parts[parts.length - 1];
                    const colorName = parts.slice(0, -1).join("-");
                    hexColor = getTailwindColorHex(colorName, shade);
                  }
                } else {
                  // Single word colors like "blue", "red", etc - use the 500 shade by default
                  hexColor = getTailwindColorHex(colorValue, "500");
                }

                const paletteValue = `palette:${paletteColor.name}`;
                const isSelected =
                  selectedColor.includes(paletteColor.name) || selectedColor === paletteValue;

                return (
                  <div key={idx} className="group relative">
                    <Tooltip content={paletteColor.name} placement="top">
                      <button
                        onClick={() => handleColorSelect("palette", paletteValue)}
                        onDoubleClick={() => handleColorDoubleClick("palette", paletteValue)}
                        className="relative aspect-square w-full rounded-lg border-2 transition-all hover:scale-105"
                        style={{
                          backgroundColor: hexColor,
                          borderColor: isSelected ? "var(--primary)" : "var(--border)",
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
                        handleRemoveFromPalette(paletteColor.name);
                      }}
                      className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-lg transition-all hover:scale-110 group-hover:block"
                      aria-label="Remove color"
                    >
                      <TbX className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Colors */}
        {recentColors.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Recent</label>
              <button
                onClick={() => {
                  setRecentColors([]);
                  localStorage.removeItem("recentColors");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <TbTrash className="size-3" />
              </button>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {recentColors.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => handleColorSelect("hex", color)}
                  onDoubleClick={() => handleColorDoubleClick("hex", color)}
                  className="group relative aspect-square w-full rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor:
                      selectedColor === color ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {selectedColor === color && (
                    <TbCheck className="absolute inset-0 m-auto size-4 text-white drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tailwind Colors */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Tailwind Colors
          </label>
          <div className="space-y-3">
            {tailwindColors.map(colorGroup => (
              <div key={colorGroup.name}>
                <div className="mb-1 text-xs capitalize text-muted-foreground">
                  {colorGroup.name}
                </div>
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
                          onClick={() => handleColorSelect("class", colorValue)}
                          onDoubleClick={() => handleColorDoubleClick("class", colorValue)}
                          className="group relative aspect-square w-full rounded-lg border transition-all hover:scale-110"
                          style={{
                            backgroundColor: hexColor,
                            borderColor: isSelected ? "var(--primary)" : "var(--border)",
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
      </div>
    </LeftSidebarDialog>
  );
};

export default ColorPickerSidebarDialog;
