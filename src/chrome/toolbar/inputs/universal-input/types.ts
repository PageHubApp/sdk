// Value type detection and parsing
export type ValueType =
  | "tailwind"
  | "var"
  | "calc"
  | "px"
  | "em"
  | "rem"
  | "%"
  | "vh"
  | "vw"
  | "vmin"
  | "vmax"
  | "custom";

export const CSS_UNITS: ValueType[] = ["px", "em", "rem", "%", "vh", "vw", "vmin", "vmax"];

export interface ParsedValue {
  type: ValueType;
  value: string;
  unit?: string;
  numeric?: number;
  prefix?: string; // For tailwind classes like "w-", "h-", "text-"
}

export interface DesignVar {
  name: string;
  varName: string;
  value: string;
  category: string;
  label: string;
  /** True when the user created this token (vs a built-in registry entry).
   *  Drives delete affordance + rename-allowed in the VarPicker editor. */
  custom?: boolean;
  /** Stable key the token is stored under — for styleGuide tokens this is
   *  the `theme.styleGuide` key; for palette tokens it's the palette item
   *  `name`; for typography it's the preset `name`. The editor needs this
   *  to write back to the right entry. */
  key?: string;
  /** Source bucket — disambiguates which storage the editor mutates. */
  source?: "palette" | "darkPalette" | "styleGuide" | "typography";
}

export interface UniversalInputProps {
  propKey?: string;
  propType?: string;
  propTag?: string; // Prefix for Tailwind classes (e.g., "w", "h", "text")
  label?: string;
  labelPrefix?: string;
  labelSuffix?: string;
  labelHide?: boolean;
  labelWidth?: string;
  inputWidth?: string;
  placeholder?: string;
  tailwindOptions?: string[]; // Pre-defined Tailwind options
  tailwindKey?: string; // Key in TailwindStyles object
  showVarSelector?: boolean;
  allowedTypes?: ValueType[]; // Restrict to specific types
  wrap?: string;
  index?: any;
  propItemKey?: string;
  inline?: boolean;
  onChange?: (value: any) => any;
  append?: React.ReactNode;
  /** Hide the per-input type selector (use with overrideType for a shared master selector) */
  hideTypeSelector?: boolean;
  /** Override the selected type externally (e.g. from a master type selector) */
  overrideType?: ValueType;
  [key: string]: any; // Allow any additional props from ToolbarItem
}
