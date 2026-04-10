/**
 * Props for toolbar / design-system fields so browser autofill & heuristics
 * don’t overlay native dropdowns on Tailwind tokens, numbers, etc.
 */
export const toolbarInputNoAutocompleteProps = {
  autoComplete: "off",
  autoCorrect: "off" as const,
  autoCapitalize: "off" as const,
  spellCheck: false,
};
