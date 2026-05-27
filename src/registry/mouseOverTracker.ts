/**
 * Mouse-over region tracker.
 *
 * Updates `commandContext.mouseOver` to one of `"canvas" | "sidebar" |
 * "topbar" | "modal" | null` based on which labeled region the cursor most
 * recently entered. Uses mouseenter / mouseleave on labeled regions (NOT
 * mousemove) so the cost is one event per region transition, not per pixel.
 *
 * Required for the ⌘F sidebar-search chord (`ph.sidebar.search`) — that's
 * the only chord today gated on mouse position rather than focus. Other
 * commands may opt into it later (e.g. ⌘+/⌘- zoom already excludes
 * "topbar" / "sidebar" via this key).
 *
 * Region selection rules (last-entered wins):
 *   - `#viewport`     → "canvas"
 *   - `#toolbar`      → "sidebar"
 *   - `[data-ph-region="topbar"]` → "topbar"
 *   - `[data-ph-region="modal"]`  → "modal"
 *
 * Mounted once at editor boot via the `EditorInner` shell (alongside the
 * keybinding dispatcher).
 */
import type { ContextRegistry } from "./context";

type Region = "canvas" | "sidebar" | "topbar" | "modal";

interface RegionDef {
  selector: string;
  name: Region;
}

const REGIONS: RegionDef[] = [
  { selector: "#viewport", name: "canvas" },
  { selector: "#toolbar", name: "sidebar" },
  { selector: '[data-ph-region="topbar"]', name: "topbar" },
  { selector: '[data-ph-region="modal"]', name: "modal" },
];

export interface MountMouseOverTrackerOptions {
  context: ContextRegistry;
  /** Document to track. Defaults to the global `document` in browsers. */
  doc?: Document | null;
}

export function mountMouseOverTracker(
  opts: MountMouseOverTrackerOptions
): () => void {
  const doc =
    opts.doc === undefined
      ? typeof document !== "undefined"
        ? document
        : null
      : opts.doc;
  if (!doc) return () => {};

  // Resolve once on mount; rebind if any selector misses.
  type Binding = { el: Element; name: Region; enter: () => void; leave: () => void };
  const bindings: Binding[] = [];

  // Per-region presence state — last entered region (top of an implicit
  // hover stack) wins. We keep a stack of region names entered without a
  // matching leave, so leaving the topmost falls back to the next.
  const stack: Region[] = [];

  const publish = () => {
    const top = stack.length > 0 ? stack[stack.length - 1] : null;
    opts.context.set("mouseOver", top);
  };

  for (const { selector, name } of REGIONS) {
    const el = doc.querySelector(selector);
    if (!el) continue;
    const enter = () => {
      // Remove any prior entry to keep the stack clean across nested
      // re-entries.
      const idx = stack.lastIndexOf(name);
      if (idx >= 0) stack.splice(idx, 1);
      stack.push(name);
      publish();
    };
    const leave = () => {
      const idx = stack.lastIndexOf(name);
      if (idx >= 0) stack.splice(idx, 1);
      publish();
    };
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    bindings.push({ el, name, enter, leave });
  }

  return () => {
    for (const b of bindings) {
      b.el.removeEventListener("mouseenter", b.enter);
      b.el.removeEventListener("mouseleave", b.leave);
    }
    bindings.length = 0;
    stack.length = 0;
    opts.context.set("mouseOver", null);
  };
}
