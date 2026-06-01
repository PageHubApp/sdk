import React from "react";

const STYLE_TAG_ID = "ph-component-canvas-style";

/** Inject a style sheet that activates when body has [data-ph-canvas-mode="true"]. */
function ensureCanvasStyleTag() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLE_TAG_ID;
  tag.textContent = `
    body[data-ph-canvas-mode="true"] #viewport {
      overflow: visible !important;
      background: transparent;
      position: relative;
    }
    body[data-ph-canvas-mode="true"] #viewport [data-component-canvas="true"] {
      display: none;
    }
    /* The card chrome on the slot is the visible "component frame" in canvas
       mode. Don't double up with the CraftJS selection chrome on the
       component-root container — the slot frame is enough. The global ring
       (inset box-shadow from styles/editor.css) is suppressed here. */
    body[data-ph-canvas-mode="true"] #viewport [data-component-container="true"][data-selected="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-component-container="true"][data-hover="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-component-container="true"][data-parent-of-selected="true"] {
      outline: none !important;
      box-shadow: none !important;
    }
    /* Hide CraftJS node-name chips in canvas mode — the per-card drag
       handle label replaces them, two labels for the same node is noise. */
    body[data-ph-canvas-mode="true"] .ph-node-name-chip {
      display: none !important;
    }
    /* Suppress CraftJS selection chrome on state-pinned nodes for parity
       with master cards — slot frame is visible chrome enough. */
    body[data-ph-canvas-mode="true"] #viewport [data-canvas-state-pin="true"][data-selected="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-canvas-state-pin="true"][data-hover="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-canvas-state-pin="true"][data-parent-of-selected="true"] {
      outline: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(tag);
}

/**
 * Owns the `body[data-ph-canvas-mode="true"]` contract for the component canvas.
 *
 * Tags body + injects the style sheet on mount; cleans up on unmount. Lifts
 * `overflow:hidden` on every clipping ancestor of `#viewport` so absolutely-
 * positioned components paint outside the (collapsed) viewport bounds, and
 * clears the `transform` on those ancestors so `position:fixed` children escape
 * the containing block. Restores every edited style on unmount (even if a React
 * error-boundary fires).
 *
 * MUST be called as the FIRST effect in `ComponentCanvasViewport` so its mount /
 * cleanup ordering relative to the pan/zoom + isolation effects is preserved.
 */
export function useCanvasModeBody() {
  React.useEffect(() => {
    ensureCanvasStyleTag();
    document.body.dataset.phCanvasMode = "true";

    const vp = document.getElementById("viewport");
    const overflowEdits: Array<{ el: HTMLElement; prev: string }> = [];
    const transformEdits: Array<{ el: HTMLElement; prev: string }> = [];

    if (vp) {
      let cur: HTMLElement | null = vp;
      while (cur && cur !== document.body) {
        const cs = window.getComputedStyle(cur);
        if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") {
          overflowEdits.push({ el: cur, prev: cur.style.overflow });
          cur.style.setProperty("overflow", "visible", "important");
        }
        if (cs.transform && cs.transform !== "none") {
          transformEdits.push({ el: cur, prev: cur.style.transform });
          cur.style.setProperty("transform", "none", "important");
        }
        cur = cur.parentElement;
      }
    }

    return () => {
      delete document.body.dataset.phCanvasMode;
      document.body.style.removeProperty("--ph-canvas-transform");
      overflowEdits.forEach(({ el, prev }) => {
        if (prev) el.style.overflow = prev;
        else el.style.removeProperty("overflow");
      });
      transformEdits.forEach(({ el, prev }) => {
        if (prev) el.style.transform = prev;
        else el.style.removeProperty("transform");
      });
    };
  }, []);
}
