// @ts-nocheck
import { AllStyles, TailwindStyles, isValidTailwindClass } from "utils/tailwind";
import { ParsedValue, ValueType } from "./types";

// Parse a value to determine its type
export function parseValue(value: string, prefix?: string): ParsedValue {
  if (!value || typeof value !== "string") {
    return { type: "custom", value: "" };
  }

  // Check if it's a CSS var function
  const varFunctionMatch = value.match(/^var\(/i);
  if (varFunctionMatch) {
    return {
      type: "var",
      value: value,
    };
  }

  // Check if it's a Tailwind arbitrary value with var function
  const tailwindVarMatch = value.match(/^(\w+)-\[var\([^\]]+\)\]$/i);
  if (tailwindVarMatch) {
    return {
      type: "var",
      value: value.match(/\[(.*)\]/)?.[1] || value,
      prefix: tailwindVarMatch[1],
    };
  }

  // Check if it's a CSS function (calc, clamp, max, min)
  const cssFunctionMatch = value.match(/^(calc|clamp|max|min)\(/i);
  if (cssFunctionMatch) {
    return {
      type: "calc",
      value: value,
    };
  }

  // Check if it's a Tailwind arbitrary value with CSS function
  const tailwindFunctionMatch = value.match(/^(\w+)-\[(calc|clamp|max|min)\([^\]]+\)\]$/i);
  if (tailwindFunctionMatch) {
    return {
      type: "calc",
      value: value.match(/\[(.*)\]/)?.[1] || value,
      prefix: tailwindFunctionMatch[1],
    };
  }

  // Check if it's a Tailwind arbitrary value with a numeric unit
  const tailwindArbitraryMatch = value.match(/^(\w+)-\[([0-9.]+)(px|em|rem|%|vh|vw|vmin|vmax)\]$/);
  if (tailwindArbitraryMatch) {
    return {
      type: tailwindArbitraryMatch[3] as ValueType,
      numeric: parseFloat(tailwindArbitraryMatch[2]),
      value: tailwindArbitraryMatch[2],
      unit: tailwindArbitraryMatch[3],
      prefix: tailwindArbitraryMatch[1],
    };
  }

  // Check if it's a plain numeric value with unit
  const numericMatch = value.match(/^([0-9.]+)(px|em|rem|%|vh|vw|vmin|vmax)$/);
  if (numericMatch) {
    return {
      type: numericMatch[2] as ValueType,
      numeric: parseFloat(numericMatch[1]),
      value: numericMatch[1],
      unit: numericMatch[2],
    };
  }

  // Check if it's a Tailwind class (known or arbitrary value)
  if (isValidTailwindClass(value)) {
    return {
      type: "tailwind",
      value,
    };
  }

  // Check if it matches a Tailwind pattern with prefix
  if (prefix) {
    const tailwindOptions = Object.keys(TailwindStyles).find(key => {
      const styles = TailwindStyles[key];
      return Array.isArray(styles) && styles.some(style => typeof style === "string" && style.startsWith(`${prefix}-`));
    });

    if (tailwindOptions && TailwindStyles[tailwindOptions]?.includes(value)) {
      return {
        type: "tailwind",
        value,
        prefix,
      };
    }
  }

  return {
    type: "custom",
    value,
  };
}

// Format a value based on type
export function formatValue(newValue: string, newType: ValueType, prefix?: string): string {
  // Don't use parsed value - just format the new value fresh
  switch (newType) {
    case "tailwind":
      return newValue;

    case "var":
      // CSS var() function - already complete like var(--primary)
      if (prefix) {
        return `${prefix}-[${newValue}]`;
      }
      return newValue;

    case "calc":
      // CSS functions are already complete (calc(), clamp(), etc.)
      if (prefix) {
        return `${prefix}-[${newValue}]`;
      }
      return newValue;

    case "px":
    case "em":
    case "rem":
    case "%":
    case "vh":
    case "vw":
    case "vmin":
    case "vmax":
      if (prefix) {
        return `${prefix}-[${newValue}${newType}]`;
      }
      return `${newValue}${newType}`;

    default:
      return newValue;
  }
}
