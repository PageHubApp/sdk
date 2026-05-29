import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useEffect, useState } from "react";
import { useAtomState } from "@zedux/react";
import colors from "tailwindcss/colors";
import useEyeDropper from "use-eye-dropper";
import { ColorPickerSidebarAtom } from "./dialogAtoms";
import { splitOpacitySuffix } from "../../../utils/design/colorSystem";
import { resolveTheme } from "../../../utils/design/resolveTheme";
import { phStorage } from "../../../utils/phStorage";
import { sdkLog } from "../../../utils/logger";

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
      const pagePalette = resolveTheme(rootNode?.data?.props || {}).palette;
      setPalette(pagePalette as any[]);
    } catch (error) {
      sdkLog.error("Failed to load palette:", error);
    }
  }, [dialog.enabled, query]);

  // Load recent colors from localStorage
  useEffect(() => {
    if (dialog.enabled) {
      const stored = phStorage.get("recent-colors");
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
    phStorage.set("recent-colors", updated);
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
      // User cancelled eyedropper — no action needed
    }
  };

  const handleSaveToPalette = () => {
    if (!hexInput || !query || !actions) return;
    const colorName = prompt("Enter a name for this color:");
    if (!colorName) return;

    const rootNode = query.node(ROOT_NODE).get();
    const currentPalette = resolveTheme(rootNode?.data?.props || {}).palette;
    const newColor = { name: colorName, color: hexInput };

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.theme) props.theme = {};
      props.theme.palette = [...currentPalette, newColor];
    });
    setPalette([...currentPalette, newColor]);
  };

  const handleRemoveFromPalette = (colorName: string) => {
    if (!query || !actions) return;
    const rootNode = query.node(ROOT_NODE).get();
    const currentPalette = resolveTheme(rootNode?.data?.props || {}).palette;
    const updatedPalette = currentPalette.filter((c: any) => c.name !== colorName);

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.theme) props.theme = {};
      props.theme.palette = updatedPalette;
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

/** Resolve a Tailwind color name + shade to its hex value (strips v4 /opacity suffix if present) */
export function getTailwindColorHex(colorName: string, shade: string): string {
  const { base } = splitOpacitySuffix(`${colorName}-${shade}`);
  const segs = base.split("-");
  if (segs.length < 2) {
    const colorKey = base.toLowerCase();
    const colorObj = (colors as any)[colorKey];
    if (!colorObj) return "#cccccc";
    if (typeof colorObj === "string") return colorObj;
    return "#cccccc";
  }
  const shadeKey = segs.pop()!;
  const colorKey = segs.join("-").toLowerCase();
  const colorObj = (colors as any)[colorKey];

  if (!colorObj) return "#cccccc";
  if (typeof colorObj === "string") return colorObj;
  if (typeof colorObj === "object" && colorObj[shadeKey]) return colorObj[shadeKey];
  return "#cccccc";
}
