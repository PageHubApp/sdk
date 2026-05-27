/**
 * Canonical "is the user typing into a text-editing surface?" predicate.
 *
 * Replaces six near-duplicate implementations that disagreed on edge cases
 * (SELECT, contentEditable="" vs "true", Monaco vs CodeMirror, etc.).
 * See `docs/sdk/command-registry-audit/4-keyboard-shortcuts.md` for the
 * pre-merge inventory.
 *
 * Pure: no DOM mutation, no closures. Safe to call on every keydown.
 */

/**
 * Returns true if `target` is (a) a native form-field element (INPUT, TEXTAREA,
 * SELECT) or (b) any element inside a rich-text / code editor surface
 * (contentEditable=true OR "", ProseMirror, CodeMirror, Monaco). Callers
 * negate to gate canvas / editor chrome shortcuts so they don't hijack typing.
 */
export function isInsideTextEditingSurface(target: EventTarget | null): boolean {
  if (!target) return false;
  // Bail early on non-Element targets (Window, Document, abstract EventTargets).
  if (typeof (target as { closest?: unknown }).closest !== "function") return false;

  const el = target as HTMLElement;
  const tag = el.tagName;

  // Native form fields.
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;

  // contentEditable — `isContentEditable` is the canonical DOM property; some
  // hosts mount `contenteditable=""` (empty string) which `isContentEditable`
  // already handles, but legacy code reads the attribute directly. Cover both.
  if (el.isContentEditable) return true;
  const ceAttr = typeof el.getAttribute === "function" ? el.getAttribute("contenteditable") : null;
  if (ceAttr === "true" || ceAttr === "") return true;

  // Rich-text / code-editor surfaces.
  if (el.closest(".ProseMirror")) return true;
  if (el.closest(".cm-editor")) return true;
  if (el.closest(".cm-content")) return true;
  if (el.closest(".monaco-editor")) return true;

  return false;
}
