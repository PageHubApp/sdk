/**
 * Design token migration: shadcn/ui → DaisyUI 5 naming conventions.
 *
 * Provides rename maps, backwards-compat CSS alias generation, and
 * runtime migration helpers for palette arrays and className strings.
 */

import type { NamedColor } from "../../components/Background/Background.body";
import { toCSSVarName } from "./designSystemVars";

// ---------------------------------------------------------------------------
// Palette name rename map (old display name → new display name)
// ---------------------------------------------------------------------------

export const TOKEN_RENAME_MAP: Record<string, string> = {
  "Primary Foreground": "Primary Content",
  "Secondary Foreground": "Secondary Content",
  "Accent Foreground": "Accent Content",
  Muted: "Neutral",
  "Muted Foreground": "Neutral Content",
  Background: "Base 100",
  Foreground: "Base Content",
  Card: "Base 200",
  Destructive: "Error",
  "Destructive Foreground": "Error Content",
  "Popover Foreground": "Popover Content",
};

/** Tokens removed during migration — their values merge into another token */
export const TOKEN_REMOVE_MAP: Record<string, string> = {
  "Card Foreground": "Base Content",
  Popover: "Base 100",
  "Popover Foreground": "Base Content",
  Border: "Base 300",
  Input: "Base 300",
};

// ---------------------------------------------------------------------------
// CSS variable backwards-compat aliases (old var → new var)
// Emitted alongside palette vars so old className strings keep working.
// ---------------------------------------------------------------------------

export const CSS_VAR_ALIASES: [string, string][] = [
  // Color aliases
  ["--primary-foreground", "--primary-content"],
  ["--secondary-foreground", "--secondary-content"],
  ["--accent-foreground", "--accent-content"],
  ["--muted", "--neutral"],
  ["--muted-foreground", "--neutral-content"],
  ["--background", "--base-100"],
  ["--foreground", "--base-content"],
  ["--card", "--base-200"],
  ["--card-foreground", "--base-content"],
  ["--popover", "--base-100"],
  ["--popover-foreground", "--base-content"],
  ["--destructive", "--error"],
  ["--destructive-foreground", "--error-content"],
  // Style token aliases (old → DaisyUI 5)
  ["--radius", "--radius-box"],
  ["--card-radius", "--radius-box"],
  ["--input-border-radius", "--radius-field"],
  // Border/input palette → base-300 (DaisyUI has no separate border color token)
  ["--input", "--base-300"],
  // --input-border-width → --border (DaisyUI name)
  ["--input-border-width", "--border"],
];

// ---------------------------------------------------------------------------
// className find/replace pairs — ordered longest-first to avoid partial matches
// ---------------------------------------------------------------------------

const CLASSNAME_REPLACEMENTS: [string, string][] = [
  // Compound (foreground → content) — longest first
  ["muted-foreground", "neutral-content"],
  ["card-foreground", "base-content"],
  ["destructive-foreground", "error-content"],
  ["primary-foreground", "primary-content"],
  ["secondary-foreground", "secondary-content"],
  ["accent-foreground", "accent-content"],
  ["popover-foreground", "base-content"],
  // Simple renames
  ["destructive", "error"],
  ["muted", "neutral"],
  ["background", "base-100"],
  ["foreground", "base-content"],
  ["popover", "base-100"],
  ["card", "base-200"],
];

// Build a regex that matches any of the old tokens in className contexts.
// Matches: bg-<token>, text-<token>, border-<token>, ring-<token>, (--<token>)
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------

/** Rename a single palette token name if it's in the rename map */
export function migratePaletteName(name: string): string | null {
  if (TOKEN_REMOVE_MAP[name] && !TOKEN_RENAME_MAP[name]) return null; // removed
  return TOKEN_RENAME_MAP[name] || name;
}

/**
 * Migrate an entire palette array: rename tokens, remove merged ones.
 * Does NOT add new tokens (Info, Success, etc.) — that's handled by the defaults seeding.
 */
export function migratePalette(palette: NamedColor[]): NamedColor[] {
  if (!palette || !Array.isArray(palette)) return palette;

  const result: NamedColor[] = [];
  const seen = new Set<string>();

  for (const item of palette) {
    if (!item || !item.name) continue;

    // Check if this token should be removed
    if (TOKEN_REMOVE_MAP[item.name] && !TOKEN_RENAME_MAP[item.name]) continue;

    const newName = TOKEN_RENAME_MAP[item.name] || item.name;

    // Deduplicate (e.g. if palette already has both old and new names)
    if (seen.has(newName)) continue;
    seen.add(newName);

    result.push({ name: newName, color: item.color });
  }

  return result;
}

/**
 * Migrate className string: replace old token references with new ones.
 * Handles both Tailwind shorthand (bg-muted) and arbitrary syntax (--muted).
 */
export function migrateClassName(className: string): string {
  if (!className || typeof className !== "string") return className;

  let result = className;
  for (const [oldToken, newToken] of CLASSNAME_REPLACEMENTS) {
    // Replace in arbitrary value syntax: (--old-token) → (--new-token)
    result = result.split(`(--${oldToken})`).join(`(--${newToken})`);
    // Replace in Tailwind shorthand: prefix-old-token (word boundary aware)
    // Match: start-of-string or whitespace, then prefix-token, then end-of-string or whitespace or /
    const shorthandRe = new RegExp(
      `((?:^|\\s)(?:bg|text|border|ring|outline|divide|from|to|via|shadow|decoration|placeholder|caret|fill|stroke)-)(${escRe(oldToken)})(?=\\s|$|/)`,
      "g"
    );
    result = result.replace(shorthandRe, `$1${newToken}`);
  }
  return result;
}

/**
 * Generate CSS alias declarations string.
 * Each alias maps an old CSS var name to the new one via var() reference.
 */
export function generateCSSAliases(): string {
  return CSS_VAR_ALIASES.map(([oldVar, newVar]) => `  ${oldVar}: var(${newVar});`).join("\n");
}
