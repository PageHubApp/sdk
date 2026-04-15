import { splitClassVariants } from "./className";
import { classNameToVar } from "./tailwind-styles";

const STEMS_BY_PROP: Record<string, string[]> = {
  border: ["border"],
  radius: ["rounded"],
  shadow: ["shadow", "drop-shadow"],
  dropShadows: ["drop-shadow"],
  background: ["bg"],
  color: ["text"],
  opacity: ["opacity"],
  width: ["w"],
  height: ["h"],
  maxWidth: ["max-w"],
  minWidth: ["min-w"],
  maxHeight: ["max-h"],
  minHeight: ["min-h"],
  gap: ["gap"],
  gapX: ["gap-x"],
  gapY: ["gap-y"],
  padding: ["p", "px", "py", "pt", "pr", "pb", "pl"],
  margin: ["m", "mx", "my", "mt", "mr", "mb", "ml"],
  fontSize: ["text"],
  fontWeight: ["font"],
  lineHeight: ["leading"],
  tracking: ["tracking"],
  ringWidth: ["ring"],
  ringColor: ["ring"],
  ringOffsetWidth: ["ring-offset"],
  ringOffsetColor: ["ring-offset"],
  outlineWidth: ["outline"],
  outlineColor: ["outline"],
  cursor: ["cursor"],
  justify: ["justify"],
  items: ["items"],
  flex: ["flex"],
  overflow: ["overflow"],
  display: [],
  position: [],
};

const WORDS_BY_TOKEN: Record<string, string> = {
  xs: "Extra Small",
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "Extra Large",
  "2xl": "2X Large",
  col: "Column",
  row: "Row",
  wrap: "Wrap",
  nowrap: "No Wrap",
  reverse: "Reverse",
};

const KNOWN_STEMS = [...new Set(Object.values(STEMS_BY_PROP).flat())].sort((a, b) => b.length - a.length);

function titleCaseToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return trimmed;
  if (trimmed === "none") return "None";
  if (trimmed === "default") return "Default";
  if (trimmed === "auto") return "Auto";
  const opacityMatch = trimmed.match(/^(.+?)\/(\d{1,3})$/);
  if (opacityMatch && /[a-z]/i.test(opacityMatch[1])) {
    return `${titleCaseToken(opacityMatch[1])} ${opacityMatch[2]}%`;
  }
  const mapped = WORDS_BY_TOKEN[trimmed.toLowerCase()];
  if (mapped) return mapped;
  const xlMatch = trimmed.match(/^(\d+)xl$/i);
  if (xlMatch) return `${xlMatch[1]}X Large`;
  if (/^\d+$/.test(trimmed)) return trimmed;

  return trimmed
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => {
      const partXlMatch = part.match(/^(\d+)xl$/i);
      if (partXlMatch) return `${partXlMatch[1]}X Large`;
      if (/^\d+$/.test(part)) return part;
      const mappedPart = WORDS_BY_TOKEN[part.toLowerCase()];
      if (mappedPart) return mappedPart;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function inferPropKeyFromBase(base: string): string | undefined {
  for (const stem of KNOWN_STEMS) {
    if (base === stem || base.startsWith(`${stem}-`)) {
      return classNameToVar(`${stem}-0`) || classNameToVar(stem) || undefined;
    }
  }
  return undefined;
}

function stripKnownStem(base: string, propKey?: string): string | null {
  const stems = propKey ? STEMS_BY_PROP[propKey] || [] : [];
  for (const stem of stems) {
    if (base === stem) return "Default";
    if (base.startsWith(`${stem}-`)) {
      return titleCaseToken(base.slice(stem.length + 1));
    }
  }
  return null;
}

function stripAnyKnownStem(base: string): string | null {
  for (const stem of KNOWN_STEMS) {
    if (base === stem) return "Default";
    if (base.startsWith(`${stem}-`)) {
      return titleCaseToken(base.slice(stem.length + 1));
    }
  }
  return null;
}

/**
 * Render a Tailwind token as a more human-readable label.
 *
 * Keeps the underlying class string untouched; only the visible UI label changes.
 */
export function formatTailwindDisplayLabel(value: string, propKey?: string): string {
  if (!value) return value;
  if (value.includes("var(--")) {
    return value.replace(/var\(--([^)]+)\)/g, "--$1");
  }

  const { segments, base } = splitClassVariants(value);
  const inferredPropKey = propKey || classNameToVar(base) || inferPropKeyFromBase(base);
  const stripped =
    stripKnownStem(base, inferredPropKey) ?? stripAnyKnownStem(base) ?? titleCaseToken(base);

  if (!segments.length) return stripped;
  return `${segments.map(titleCaseToken).join(": ")}: ${stripped}`;
}
