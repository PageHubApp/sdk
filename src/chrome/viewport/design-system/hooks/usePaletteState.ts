import { useRef, useState } from "react";
import { useAtomState } from "@zedux/react";
import { resolveColorForDisplay } from "@/utils/design/colorSystem";
import { colorToOklch, oklchToHex } from "@/utils/design/contentColor";
import { DEFAULT_DARK_PALETTE, DEFAULT_PALETTE } from "@/utils/defaults";
import { ColorPickerAtom } from "../../../toolbar/dialogs/ColorPickerDialog";
import type { PaletteColor } from "./types";

export function usePaletteState() {
  const [, setColorDialog] = useAtomState(ColorPickerAtom);

  const [palettes, setPalettes] = useState<PaletteColor[]>(DEFAULT_PALETTE);
  const [darkPalettes, setDarkPalettes] = useState<PaletteColor[]>(DEFAULT_DARK_PALETTE);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  /** Which palette the Colors tab is editing: "light" or "dark" */
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");

  const colorButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const activePalettes = colorMode === "dark" ? darkPalettes : palettes;
  const setActivePalettes = colorMode === "dark" ? setDarkPalettes : setPalettes;
  const getPalettesForMode = (mode: "light" | "dark") =>
    mode === "dark" ? darkPalettes : palettes;
  const setPalettesForMode = (
    mode: "light" | "dark",
    next: PaletteColor[] | ((prev: PaletteColor[]) => PaletteColor[])
  ) => {
    if (mode === "dark") {
      setDarkPalettes(next as any);
    } else {
      setPalettes(next as any);
    }
  };

  const getColorPreview = (colorValue: unknown): string => {
    if (!colorValue) return "#3b82f6";
    const colorStr = typeof colorValue === "string" ? colorValue : String(colorValue);
    if (colorStr.startsWith("oklch(")) return oklchToHex(colorStr);
    const resolved = resolveColorForDisplay(colorStr, "", activePalettes);
    return resolved.backgroundColor || "#3b82f6";
  };

  const coerceToColorString = (color: unknown): string => {
    if (typeof color === "string") return color;
    if (color && typeof color === "object") {
      const c = color as Record<string, unknown>;
      if (c.value) {
        if (typeof c.value === "string") {
          if ((c.value as string).startsWith("palette:")) {
            const paletteName = (c.value as string).replace("palette:", "").trim();
            const paletteColor = palettes.find(p => p.name === paletteName);
            return paletteColor ? paletteColor.color : (c.value as string);
          }
          return c.value as string;
        }
        if ((c.value as Record<string, number>).r !== undefined) {
          const rgba = c.value as Record<string, number>;
          return `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
        }
        return String(c.value);
      }
      if ((c as Record<string, number>).r !== undefined) {
        const rgba = c as Record<string, number>;
        return `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
      }
    }
    return String(color);
  };

  const updateColor = (index: number, color: unknown) => {
    const newPalettes = [...activePalettes];
    newPalettes[index] = { ...newPalettes[index], color: colorToOklch(coerceToColorString(color)) };
    setActivePalettes(newPalettes);
  };

  const openColorPicker = (index: number) => {
    const buttonRef = colorButtonRefs.current[index];
    if (!buttonRef) return;
    const rect = buttonRef.getBoundingClientRect();
    setColorDialog({
      enabled: true,
      value: activePalettes[index].color.startsWith("oklch(")
        ? oklchToHex(activePalettes[index].color)
        : activePalettes[index].color,
      prefix: "",
      changed: (value: unknown) => updateColor(index, value),
      e: rect,
      mode: "picker",
      propKey: "theme-design-system",
    });
  };

  const updateColorName = (index: number, name: string) => {
    const newPalettes = [...activePalettes];
    newPalettes[index] = { ...newPalettes[index], name };
    setActivePalettes(newPalettes);
  };

  const addColor = () =>
    setActivePalettes([...activePalettes, { name: "New Color", color: "oklch(62% 0.214 259)" }]);

  const deleteColor = (index: number) =>
    setActivePalettes(activePalettes.filter((_, i) => i !== index));

  const openColorPickerInMode = (mode: "light" | "dark", index: number) => {
    const buttonRef = colorButtonRefs.current[index];
    if (!buttonRef) return;
    const palettesForMode = getPalettesForMode(mode);
    const rect = buttonRef.getBoundingClientRect();
    setColorDialog({
      enabled: true,
      value: palettesForMode[index].color.startsWith("oklch(")
        ? oklchToHex(palettesForMode[index].color)
        : palettesForMode[index].color,
      prefix: "",
      changed: (value: unknown) => {
        const current = getPalettesForMode(mode);
        const newPalettes = [...current];
        newPalettes[index] = {
          ...newPalettes[index],
          color: colorToOklch(coerceToColorString(value)),
        };
        setPalettesForMode(mode, newPalettes);
      },
      e: rect,
      mode: "picker",
      propKey: "theme-design-system",
    });
  };

  const updateColorNameInMode = (mode: "light" | "dark", index: number, name: string) => {
    const current = getPalettesForMode(mode);
    const newPalettes = [...current];
    newPalettes[index] = { ...newPalettes[index], name };
    setPalettesForMode(mode, newPalettes);
  };

  const addColorInMode = (mode: "light" | "dark") => {
    const current = getPalettesForMode(mode);
    setPalettesForMode(mode, [{ name: "New Color", color: "oklch(62% 0.214 259)" }, ...current]);
  };

  const deleteColorInMode = (mode: "light" | "dark", index: number) => {
    const current = getPalettesForMode(mode);
    setPalettesForMode(
      mode,
      current.filter((_, i) => i !== index)
    );
  };

  const toggleDarkMode = () => {
    if (!darkModeEnabled) {
      // Enabling dark mode — seed with only core semantic tokens that typically change.
      // Colors not listed here inherit their light-mode value automatically.
      const DARK_SEED_NAMES = new Set([
        "Primary",
        "Primary Content",
        "Secondary",
        "Secondary Content",
        "Accent",
        "Accent Content",
        "Neutral",
        "Neutral Content",
        "Base 100",
        "Base 200",
        "Base 300",
        "Base Content",
        "Error",
        "Error Content",
        "Info",
        "Info Content",
        "Success",
        "Success Content",
        "Warning",
        "Warning Content",
        "Border",
        "Input",
        "Ring",
      ]);
      const seeded = palettes.filter(p => DARK_SEED_NAMES.has(p.name)).map(p => ({ ...p }));
      setDarkPalettes(seeded.length > 0 ? seeded : palettes.map(p => ({ ...p })));
      setDarkModeEnabled(true);
      setColorMode("dark");
    } else {
      setColorMode(prev => (prev === "dark" ? "light" : "dark"));
    }
  };

  const disableDarkMode = () => {
    setDarkModeEnabled(false);
    setColorMode("light");
  };

  return {
    palettes,
    setPalettes,
    darkPalettes,
    setDarkPalettes,
    darkModeEnabled,
    setDarkModeEnabled,
    colorMode,
    setColorMode,
    activePalettes,
    setActivePalettes,
    colorButtonRefs,
    getColorPreview,
    updateColor,
    openColorPicker,
    updateColorName,
    addColor,
    deleteColor,
    openColorPickerInMode,
    updateColorNameInMode,
    addColorInMode,
    deleteColorInMode,
    toggleDarkMode,
    disableDarkMode,
  };
}
