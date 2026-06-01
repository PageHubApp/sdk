export type ColorType = "palette" | "hex" | "rgb" | "class";

export interface ParsedColor {
  type: ColorType;
  value: string;
  displayValue: string;
  cssValue: string;
}

export interface PaletteColor {
  name: string;
  color: string;
}
