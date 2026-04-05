import { atom } from "@zedux/react";

export const ColorPalletAtom = atom("colorPallet", []);

export const ColorPickerAtom = atom("colorPicker", {
  enabled: false,
  value: "",
  prefix: "",
  changed: null,
  preview: null,
  originalValue: null,
  showPallet: false,
  e: null,
  propKey: null,
  mode: "both" as "both" | "palette" | "picker",
  defaultMode: "palette" as "palette" | "picker",
} as any);

export const ColorPickerSidebarAtom = atom("colorPickerSidebar", {
  enabled: false,
  value: "",
  prefix: "",
  changed: null,
  showPallet: true,
  propKey: null,
} as any);

export const FontFamilyDialogAtom = atom("fontFamily", {
  enabled: false,
  prefix: "",
  changed: null,
  preview: null,
  originalValue: null,
} as any);

export const GoogleIconDialogAtom = atom("googleIconDialog", {
  enabled: false,
  prefix: "",
  changed: null,
  onUseMedia: null,
  e: null,
} as any);

export const IconDialogAtom = atom("iconDialog", {
  enabled: false,
  prefix: "",
  changed: null,
  e: null,
} as any);

export const PatternDialogAtom = atom("patternDialog", {
  enabled: false,
  prefix: "",
  changed: null,
  e: null,
} as any);

export const ToolTipDialogAtom = atom("tooltip", {
  enabled: false,
  prefix: "",
  value: null,
  key: null,
  e: null,
  placement: "bottom",
} as any);
