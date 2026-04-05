// @ts-nocheck
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
