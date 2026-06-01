import type { ReactNode } from "react";
import { atom } from "@zedux/react";

/** RGBA color object as emitted by react-color's SketchPicker. */
interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** `{ type, value }` payload passed to color-dialog `changed`/`preview` callbacks. */
interface ColorChangeValue {
  type: string;
  value: unknown;
}

/**
 * Trigger rect stored on the font dialog `e` field. Both a native `DOMRect`
 * (`getBoundingClientRect()`) and the `RectResult` returned by `getRect()`
 * satisfy this structural shape — only these positional members are read.
 */
interface DialogRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export const ColorPaletteAtom = atom("colorPalette", []);

export interface ColorPickerState {
  enabled: boolean;
  value: string | RGBAColor | null;
  prefix: string;
  changed: ((value: ColorChangeValue) => void) | null;
  // Fields below are omitted by some `setState` open-sites (partial opens),
  // so they're optional; all reads guard for undefined.
  preview?: ((value: ColorChangeValue) => void) | null;
  originalValue?: string | null;
  showPalette?: boolean;
  e: DOMRect | null;
  propKey?: string | null;
  mode?: "both" | "palette" | "picker";
  defaultMode?: "palette" | "picker";
}

export const ColorPickerAtom = atom("colorPicker", (): ColorPickerState => ({
  enabled: false,
  value: "",
  prefix: "",
  changed: null,
  preview: null,
  originalValue: null,
  showPalette: false,
  e: null,
  propKey: null,
  mode: "both",
  defaultMode: "palette",
}));

export interface ColorPickerSidebarState {
  enabled: boolean;
  value: string;
  prefix: string;
  changed: ((value: { type: string; value: string }) => void) | null;
  showPalette: boolean;
  propKey: string | null;
}

export const ColorPickerSidebarAtom = atom(
  "colorPickerSidebar",
  (): ColorPickerSidebarState => ({
    enabled: false,
    value: "",
    prefix: "",
    changed: null,
    showPalette: true,
    propKey: null,
  })
);

export interface FontFamilyDialogState {
  enabled: boolean;
  prefix?: string;
  value: string[];
  originalValue?: string | string[] | null;
  changed: ((value: string[]) => void) | null;
  preview?: ((value: string | string[]) => void) | null;
  propKey?: string | null;
  e: DialogRect | null;
}

export const FontFamilyDialogAtom = atom(
  "fontFamily",
  (): FontFamilyDialogState => ({
    enabled: false,
    prefix: "",
    value: [],
    originalValue: null,
    changed: null,
    preview: null,
    propKey: null,
    e: null,
  })
);

/** Pattern library entry selected in the pattern dialog. */
interface PatternValue {
  slug: string;
  title?: string;
  tags?: string[];
  mode?: string;
}

export interface PatternDialogState {
  enabled: boolean;
  prefix: string;
  value: PatternValue | null;
  changed: ((value: PatternValue | null) => void) | null;
  e: DialogRect | null;
}

export const PatternDialogAtom = atom("patternDialog", (): PatternDialogState => ({
  enabled: false,
  prefix: "",
  value: null,
  changed: null,
  e: null,
}));

export interface ToolTipDialogState {
  enabled: boolean;
  prefix: string;
  value: ReactNode;
  key: string | null;
  e: HTMLElement | null;
  placement: "top" | "bottom";
}

export const ToolTipDialogAtom = atom("tooltip", (): ToolTipDialogState => ({
  enabled: false,
  prefix: "",
  value: null,
  key: null,
  e: null,
  placement: "bottom",
}));

/** Command palette (⌘K) — open/close state. */
export const CommandPaletteAtom = atom("commandPalette", { open: false });
