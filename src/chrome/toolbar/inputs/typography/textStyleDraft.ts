/**
 * Lightweight draft helpers used by both the lazy-loaded `TextStyleEditorPanel`
 * and its eager callers (e.g. `TypographyPresetInput`). Splitting them out keeps
 * the heavy editor panel behind its `React.lazy` boundary — importing
 * `emptyDraft` / `presetToDraft` no longer drags the full panel into the main
 * editor chunk.
 */
import type { TypographyPresetRow } from "./TypographyPresetSelect";

export type TextStyleDraft = {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
  color: string;
  textDecoration: string;
  textAlign: string;
};

export function emptyDraft(): TextStyleDraft {
  return {
    name: "",
    fontFamily: "Inter",
    fontSize: "1rem",
    fontWeight: "400",
    lineHeight: "1.5",
    letterSpacing: "normal",
    textTransform: "none",
    color: "",
    textDecoration: "none",
    textAlign: "left",
  };
}

export function presetToDraft(
  p: TypographyPresetRow & {
    color?: string;
    textDecoration?: string;
    textAlign?: string;
  }
): TextStyleDraft {
  return {
    name: p.name,
    fontFamily: p.fontFamily || "Inter",
    fontSize: p.fontSize || "1rem",
    fontWeight: p.fontWeight || "400",
    lineHeight: p.lineHeight || "1.5",
    letterSpacing: p.letterSpacing || "normal",
    textTransform: p.textTransform || "none",
    color: p.color || "",
    textDecoration: p.textDecoration || "none",
    textAlign: p.textAlign || "left",
  };
}
