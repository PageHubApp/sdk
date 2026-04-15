// Utility functions for UniversalInput component

// Re-export layout utilities
export { getLayoutConfig, type DropdownLayoutConfig } from "./layouts";

// Helper to get hint text for numeric values
export const getHintText = (
  option: string,
  hintType: "pixel" | "percentage" | "ms" | "custom"
): string => {
  const value = option.replace(/^[a-z]+-/, "");

  switch (hintType) {
    case "pixel":
      if (value === "px") return "1px";
      if (value === "0") return "0px";
      if (/^\d+(\.\d+)?$/.test(value)) return `${parseFloat(value) * 4}px`;
      return value;

    case "percentage":
      if (value.includes("/")) {
        const [num, den] = value.split("/").map(Number);
        return `${Math.round((num / den) * 100)}%`;
      }
      return value;

    case "ms":
      return `${value}ms`;

    default:
      return value;
  }
};

// Helper function to group fractions by denominator
export const groupFractionsByDenominator = (fractions: string[]) => {
  const groups: { [key: string]: string[] } = {};

  fractions.forEach(fraction => {
    const match = fraction.match(/(\w+)-(\d+)\/(\d+)$/);
    if (match) {
      const [, prefix, numerator, denominator] = match;
      const groupKey = `${denominator}ths`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(fraction);
    }
  });

  return groups;
};

// Numeric range group keys
export const NUMERIC_RANGE_GROUPS = {
  SMALL: "S",
  MEDIUM: "M",
  LARGE: "L",
  XLARGE: "XL",
} as const;

// Helper function to group numeric values by ranges
export const groupNumericByRange = (numeric: string[]) => {
  const groups: { [key: string]: string[] } = {
    [NUMERIC_RANGE_GROUPS.SMALL]: [],
    [NUMERIC_RANGE_GROUPS.MEDIUM]: [],
    [NUMERIC_RANGE_GROUPS.LARGE]: [],
    [NUMERIC_RANGE_GROUPS.XLARGE]: [],
  };

  numeric.forEach(value => {
    const match = value.match(/(\w+)-(\d+(?:\.\d+)?)$/);
    if (match) {
      const [, , num] = match;
      const numValue = parseFloat(num);

      if (numValue <= 3) {
        groups[NUMERIC_RANGE_GROUPS.SMALL].push(value);
      } else if (numValue <= 8) {
        groups[NUMERIC_RANGE_GROUPS.MEDIUM].push(value);
      } else if (numValue <= 24) {
        groups[NUMERIC_RANGE_GROUPS.LARGE].push(value);
      } else {
        groups[NUMERIC_RANGE_GROUPS.XLARGE].push(value);
      }
    } else if (value.includes("-0") || value.includes("-px")) {
      groups[NUMERIC_RANGE_GROUPS.SMALL].push(value);
    }
  });

  return groups;
};
