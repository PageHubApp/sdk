/**
 * Mouse-over region tracker.
 *
 * Updates `commandContext.mouseOver` to one of `"canvas" | "sidebar" |
 * "topbar" | "modal" | null`: the innermost labeled region under the cursor.
 * One delegated `mouseover` / `mouseout` pair on the document, so regions
 * that mount late or portal elsewhere (a host's `EditorPanelFrame`, dialogs)
 * count without rebinding, and the cost is one event per element transition,
 * not per pixel.
 *
 * Required for the ⌘F sidebar-search chord (`ph.sidebar.search`) — that's
 * the only chord today gated on mouse position rather than focus. Other
 * commands may opt into it later (e.g. ⌘+/⌘- zoom already excludes
 * "topbar" / "sidebar" via this key).
 *
 * Regions (innermost match wins):
 *   - `#viewport`                       → "canvas"
 *   - `#toolbar`, `[data-ph-panel]`     → "sidebar"
 *   - `[data-ph-region="topbar"]`       → "topbar"
 *   - `[data-ph-region="modal"]`        → "modal"
 *
 * Mounted once at editor boot (`useEditorDocument`, alongside the keybinding
 * dispatcher).
 */
import type { ContextRegistry } from "./context";

type Region = "canvas" | "sidebar" | "topbar" | "modal";

const REGIONS: Array<{ selector: string; name: Region }> = [
  { selector: "#viewport", name: "canvas" },
  { selector: "#toolbar, [data-ph-panel]", name: "sidebar" },
  { selector: '[data-ph-region="topbar"]', name: "topbar" },
  { selector: '[data-ph-region="modal"]', name: "modal" },
];

const ANY_REGION = REGIONS.map(r => r.selector).join(", ");

/** The innermost region `target` sits in, or null. */
export function regionFor(target: EventTarget | null): Region | null {
  const el = target as Element | null;
  if (!el || typeof el.closest !== "function") return null;
  const hit = el.closest(ANY_REGION);
  if (!hit) return null;
  return REGIONS.find(r => hit.matches(r.selector))?.name ?? null;
}

export interface MountMouseOverTrackerOptions {
  context: ContextRegistry;
  /** Document to track. Defaults to the global `document` in browsers. */
  doc?: Document | null;
}

export function mountMouseOverTracker(opts: MountMouseOverTrackerOptions): () => void {
  const doc =
    opts.doc === undefined ? (typeof document !== "undefined" ? document : null) : opts.doc;
  if (!doc) return () => {};

  let current: Region | null = null;
  const publish = (next: Region | null) => {
    if (next === current) return;
    current = next;
    opts.context.set("mouseOver", next);
  };
  const over = (e: Event) => publish(regionFor(e.target));
  // Leaving the window: `relatedTarget` is null.
  const out = (e: Event) => {
    if (!(e as MouseEvent).relatedTarget) publish(null);
  };

  doc.addEventListener("mouseover", over);
  doc.addEventListener("mouseout", out);
  return () => {
    doc.removeEventListener("mouseover", over);
    doc.removeEventListener("mouseout", out);
    current = null;
    opts.context.set("mouseOver", null);
  };
}
