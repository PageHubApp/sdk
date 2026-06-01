/**
 * Tailwind class-string manipulation — pure string ops, no theme/color knowledge.
 */

/**
 * Extract the value after the prefix
 * e.g., "bg-blue-500" with prefix "bg" returns "blue-500"
 */
export const extractValueAfterPrefix = (value: string, prefix: string): string => {
  if (!value || !prefix) return value || "";
  const parts = value.split(`${prefix}-`).filter(Boolean);
  return parts[0] || "";
};

/**
 * Wrap value in brackets if needed for arbitrary values
 * e.g., "#ffffff" becomes "[#ffffff]"
 */
export const wrapInBrackets = (val: string): string => {
  if (!val) return val;

  // Already has brackets
  if (val.includes("[")) return val;

  // Needs brackets if it's a hex/rgba value without dashes
  if (!val.includes("-") && (val.includes("#") || val.includes("rgba") || val.includes("rgb"))) {
    return `[${val}]`;
  }

  return val;
};

/**
 * Remove brackets from value
 * e.g., "[#ffffff]" becomes "#ffffff"
 */
export const removeBrackets = (val: string): string => {
  if (!val) return val;
  return val.replace(/^\[/, "").replace(/\]$/, "");
};

/**
 * First `#rgb`, `#rrggbb`, or `#rrggbbaa` in a string — e.g. Tailwind
 * `drop-shadow-[#6c88bb]` or bracket-only `[#6c88bb]` for sidebar previews.
 */
export function extractFirstCssHex(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const m = value.match(/#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/);
  return m ? m[0] : null;
}

/**
 * Strip Tailwind prefixes from a color value
 * e.g., "bg-blue-500" → "blue-500"
 */
export const stripTailwindPrefix = (value: string): string => {
  if (!value) return value;

  const prefixesToStrip = [
    "bg-",
    "text-",
    "border-",
    "ring-offset-",
    "ring-",
    "outline-",
    "from-",
    "to-",
    "via-",
  ];

  for (const prefix of prefixesToStrip) {
    if (value.startsWith(prefix)) {
      return value.substring(prefix.length);
    }
  }

  return value;
};
