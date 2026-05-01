import { useState } from "react";
import { useAtomState } from "@zedux/react";
import { FontFamilyDialogAtom } from "../../../toolbar/dialogs/FontFamilyDialog";
import { DEFAULT_CUSTOM_FONTS } from "./defaults";
import type { CustomFont } from "./types";

export function useTypographyState() {
  const [, setFontDialog] = useAtomState(FontFamilyDialogAtom);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(DEFAULT_CUSTOM_FONTS);

  const updateFontName = (index: number, name: string) => {
    const newFonts = [...customFonts];
    newFonts[index] = { ...newFonts[index], name };
    setCustomFonts(newFonts);
  };

  const updateFontProperty = (index: number, property: string, value: string) => {
    const newFonts = [...customFonts];
    const finalValue =
      property === "fontFamily" && Array.isArray(value) ? (value as unknown as string[])[0] : value;
    newFonts[index] = { ...newFonts[index], [property]: finalValue };
    setCustomFonts(newFonts);
  };

  const addFont = () => {
    setCustomFonts([
      {
        name: "New Font",
        fontFamily: "Inter",
        fontSize: "1rem",
        fontWeight: "400",
        lineHeight: "1.5",
        letterSpacing: "normal",
        textTransform: "none",
      },
      ...customFonts,
    ]);
  };

  const deleteFont = (index: number) => setCustomFonts(customFonts.filter((_, i) => i !== index));

  const openFontPicker = (
    buttonRef: React.RefObject<HTMLButtonElement>,
    currentFamily: string,
    onChanged: (family: string) => void
  ) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const currentFont = currentFamily ? currentFamily.split(", ") : [];
    setFontDialog({
      enabled: true,
      value: currentFont,
      originalValue: currentFont,
      changed: (value: unknown) => {
        onChanged(Array.isArray(value) ? (value as string[]).join(", ") : (value as string));
      },
      preview: (value: unknown) => {
        onChanged(Array.isArray(value) ? (value as string[]).join(", ") : (value as string));
      },
      e: rect,
    });
  };

  return {
    customFonts,
    setCustomFonts,
    updateFontName,
    updateFontProperty,
    addFont,
    deleteFont,
    openFontPicker,
    setFontDialog,
  };
}
