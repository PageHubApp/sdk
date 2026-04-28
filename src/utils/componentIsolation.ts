import { ROOT_NODE } from "@craftjs/utils";
import { atom } from "@zedux/react";

/**
 * Canvas-scoped isolation. Distinct from `IsolateAtom` (which is page-scoped).
 *
 * `null` = list mode (all components visible on the canvas).
 * `<containerId>` = isolation mode (only that component visible, others hidden).
 *
 * Reset to `null` when:
 *  - The user clicks the "Exit isolation" pill on the canvas surface.
 *  - The user toggles the View switcher to leave canvas mode.
 *  - The isolated component is deleted.
 */
export const CanvasIsolateAtom = atom<string | null>("canvasIsolate", null);

type Mode = "page" | "canvas";

interface ApplyOpts {
  mode: Mode;
  /** Only meaningful in canvas mode. Container ID of the isolated component, or null for list. */
  canvasIsolate?: string | null;
}

/**
 * Sets `hidden` on every direct ROOT child according to the current editor mode.
 *
 * Page mode:
 *  - header / footer / page → visible
 *  - component / componentCanvas → hidden
 *
 * Canvas list mode (`canvasIsolate == null`):
 *  - header / footer / page → hidden
 *  - component / componentCanvas → visible
 *
 * Canvas isolation mode (`canvasIsolate === <containerId>`):
 *  - header / footer / page → hidden
 *  - component → visible only when nodeId === canvasIsolate
 *  - componentCanvas → hidden (annotations are a list-mode concept)
 *
 * Idempotent. Safe to call from mount effects + on every state change.
 */
export function applyCanvasVisibility(
  query: any,
  actions: any,
  { mode, canvasIsolate = null }: ApplyOpts
): void {
  let root: any;
  try {
    root = query.node(ROOT_NODE).get();
  } catch {
    return;
  }
  if (!root?.data?.nodes) return;

  // Visibility flips are pure UI state — keep them off the undo stack.
  const ignoreActions = typeof actions?.history?.ignore === "function" ? actions.history.ignore() : actions;

  for (const nodeId of root.data.nodes) {
    let node: any;
    try {
      node = query.node(nodeId).get();
    } catch {
      continue;
    }
    const t = node?.data?.props?.type;
    if (t !== "header" && t !== "footer" && t !== "page" && t !== "component" && t !== "componentCanvas") {
      continue;
    }

    let shouldHide: boolean;
    if (mode === "page") {
      shouldHide = t === "component" || t === "componentCanvas";
    } else {
      // canvas
      if (t === "component") {
        shouldHide = canvasIsolate != null && nodeId !== canvasIsolate;
      } else if (t === "componentCanvas") {
        shouldHide = canvasIsolate != null;
      } else {
        // header / footer / page — keep MOUNTED in canvas mode so any
        // inherent components nested inside (Modal/Dropdown/Tabs)
        // have live DOM to pin to. The canvas surface is rendered on top
        // with an opaque background, so the pages don't bleed through
        // visually. Hidden via CraftJS unmount would kill the DOM.
        shouldHide = false;
      }
    }

    try {
      ignoreActions.setHidden(nodeId, shouldHide);
      ignoreActions.setProp(nodeId, (p: any) => {
        p.hidden = shouldHide;
      });
    } catch {
      // node may have been removed mid-render
    }
  }
}
