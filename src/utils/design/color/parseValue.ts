import { extractValueAfterPrefix, wrapInBrackets, removeBrackets } from "./classString";

/**
 * Parse a color value and prefix into background and clean value
 * Returns [bg, cleanValue] tuple
 */
export const parseColorValue = (value: string, prefix: string): [string, string] => {
  const val = extractValueAfterPrefix(value, prefix);
  let bg = val;

  // Wrap in brackets if needed
  bg = wrapInBrackets(val);

  // Extract clean value (remove brackets)
  const cleanValue = removeBrackets(bg);

  return [bg, cleanValue];
};
