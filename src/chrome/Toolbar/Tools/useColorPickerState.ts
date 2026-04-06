import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useEffect, useState } from "react";
import { useAtomState } from "@zedux/react";
import colors from "tailwindcss/colors";
import useEyeDropper from "use-eye-dropper";
import { ColorPickerSidebarAtom } from "./dialogAtoms";

/**
 * All state and handlers for the color picker sidebar dialog.
 */
export function useColorPickerState() {
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
        } catch {
          setRecentColors([]);
        }
      }
    }
  }, [dialog.enabled]);

  // Set initial values when dialog opens
  useEffect(() => {
    if (dialog.enabled && dialog.value) {
      setSelectedColor(dialog.value);
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
    } catch {
      console.log("User cancelled eyedropper");
    }
  };

  const handleSaveToPalette = () => {
    if (!hexInput || !query || !actions) return;
    const colorName = prompt("Enter a name for this color:");
    if (!colorName) return;

    const rootNode = query.node(ROOT_NODE).get();
    const currentPalette = rootNode?.data?.props?.pallet || [];
    const newColor = { name: colorName, color: hexInput };

    actions.setProp(ROOT_NODE, (props: any) => {
      props.pallet = [...currentPalette, newColor];
    });
    setPalette([...currentPalette, newColor]);
  };

  const handleRemoveFromPalette = (colorName: string) => {
    if (!query || !actions) return;
    const rootNode = query.node(ROOT_NODE).get();
    const currentPalette = rootNode?.data?.props?.pallet || [];
    const updatedPalette = currentPalette.filter((c: any) => c.name !== colorName);

    actions.setProp(ROOT_NODE, (props: any) => {
      props.pallet = updatedPalette;
    });
    setPalette(updatedPalette);
  };

  return {
    dialog,
    hexInput,
    setHexInput,
    selectedColor,
    recentColors,
    setRecentColors,
    palette,
    isEyeDropperSupported: isSupported,
    handleClose,
    handleColorSelect,
    handleColorDoubleClick,
    handleHexSubmit,
    handleEyeDropper,
    handleSaveToPalette,
    handleRemoveFromPalette,
  };
}

/** Resolve a Tailwind color name + shade to its hex value */
export function getTailwindColorHex(colorName: string, shade: string): string {
  const colorKey = colorName.toLowerCase();
  const colorObj = (colors as any)[colorKey];

  if (!colorObj) return "#cccccc";
  if (typeof colorObj === "string") return colorObj;
  if (typeof colorObj === "object" && colorObj[shade]) return colorObj[shade];
  return "#cccccc";
}
