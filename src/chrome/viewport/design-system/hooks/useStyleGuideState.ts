import { useRef, useState } from "react";
import { useAtomState } from "@zedux/react";
import { DEFAULT_STYLE_GUIDE } from "@/utils/defaults";
import { ColorPickerAtom } from "../../../toolbar/dialogs/ColorPickerDialog";
import type { StyleGuideState } from "./types";

export function useStyleGuideState() {
  const [, setColorDialog] = useAtomState(ColorPickerAtom);

  const [styles, setStyles] = useState<StyleGuideState>({
    ...DEFAULT_STYLE_GUIDE,
  } as StyleGuideState);

  const inputBorderColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputBgColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputTextColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputPlaceholderColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputFocusRingColorButtonRef = useRef<HTMLButtonElement>(null);
  const linkColorButtonRef = useRef<HTMLButtonElement>(null);
  const linkHoverColorButtonRef = useRef<HTMLButtonElement>(null);

  const updateStyle = <K extends keyof StyleGuideState>(key: K, value: StyleGuideState[K]) => {
    setStyles(prev => ({ ...prev, [key]: value }));
  };

  const openStyleColorPicker = (
    buttonRef: React.RefObject<HTMLButtonElement>,
    currentValue: string,
    setter: (value: string) => void
  ) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setColorDialog({
      enabled: true,
      value: currentValue,
      prefix: "",
      changed: (value: unknown) => {
        const v = (value as Record<string, unknown>)?.value || value;
        if (typeof v === "string") setter(v);
      },
      e: rect,
    });
  };

  return {
    styles,
    setStyles,
    updateStyle,
    openStyleColorPicker,
    inputBorderColorButtonRef,
    inputBgColorButtonRef,
    inputTextColorButtonRef,
    inputPlaceholderColorButtonRef,
    inputFocusRingColorButtonRef,
    linkColorButtonRef,
    linkHoverColorButtonRef,
  };
}
