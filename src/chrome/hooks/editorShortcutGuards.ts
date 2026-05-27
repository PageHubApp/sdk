/**
 * Shared rules for when editor chord shortcuts (Craft copy/paste, etc.)
 * must defer to the browser (native copy/paste, inputs, dialogs).
 */
import { isInsideTextEditingSurface } from "../../utils/keyboard";

/**
 * Kept as a named export for callers that prefer the chord-oriented name.
 * Delegates to the canonical `isInsideTextEditingSurface` (R3 — single source).
 * Also matches `[role='textbox']` for ARIA-defined textboxes that aren't real
 * inputs (covered by closest() since the canonical predicate doesn't).
 */
export function isFormFieldOrRichTextTarget(target: EventTarget | null): boolean {
  if (isInsideTextEditingSurface(target)) return true;
  if (target instanceof Element) {
    if (target.closest("[role='textbox']")) return true;
  }
  return false;
}

/** Settings / chrome: never hijack Cmd+C / Cmd+V for Craft tree clipboard. */
export function isEditorChromePanelTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("#toolbar")) return true;
  if (target.closest("#editor-node-context-menu")) return true;
  if (target.closest('[role="dialog"]')) return true;
  if (target.closest("[data-pagehub-canvas-chrome]")) return true;
  return false;
}

/**
 * Craft canvas: inside the viewport frame, excluding floating node chrome
 * (same notion as click-to-deselect).
 */
export function isCraftCanvasChordTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const viewport = document.getElementById("viewport");
  if (!viewport?.contains(target)) return false;
  if (target.closest("[data-pagehub-canvas-chrome]")) return false;
  return true;
}

/** Let the browser handle Cmd+C when the user has a text selection. */
export function shouldDelegateCopyToBrowser(): boolean {
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  return Boolean(sel && sel.toString().trim().length > 0);
}

export function shouldDelegateCraftChordToBrowser(
  e: KeyboardEvent,
  kind: "copy" | "paste"
): boolean {
  if (e.defaultPrevented) return true;
  const t = e.target;
  if (isFormFieldOrRichTextTarget(t)) return true;
  if (isEditorChromePanelTarget(t)) return true;
  if (kind === "copy" && shouldDelegateCopyToBrowser()) return true;
  return false;
}

export function isModChord(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}
