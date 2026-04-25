import { useEditor } from "@craftjs/core";
import { useEffect, useRef } from "react";
import { useSetAtomState } from "../../utils/atoms";
import { SideBarOpen } from "../../utils/lib";

// Module-level guard: when the user manually closes the sidebar (button or
// swipe), the next selection-change tick must not re-open it. Cleared when a
// new selection key arrives after the cooldown.
let manualCloseAt = 0;
// Tiny cooldown — just enough to swallow the React commit that may flush in
// the same tick as the manual close. Real user clicks land well outside this.
const MANUAL_CLOSE_COOLDOWN_MS = 80;

export const markManualSidebarClose = () => {
  manualCloseAt = Date.now();
};

/**
 * Opens the sidebar whenever the selected-node set changes to a non-empty
 * value. Effect deliberately doesn't depend on the open state — closing the
 * panel must not retrigger this effect.
 */
export const useAutoOpenSidebar = () => {
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const lastSelectionKeyRef = useRef("");

  const selectionKey = useEditor((_, q) => {
    const all = q.getEvent("selected").all();
    return all.join("\0");
  });

  useEffect(() => {
    const prev = lastSelectionKeyRef.current;
    lastSelectionKeyRef.current = selectionKey;
    if (!selectionKey || selectionKey === prev) return;
    if (Date.now() - manualCloseAt < MANUAL_CLOSE_COOLDOWN_MS) return;
    setSideBarOpen(true);
  }, [selectionKey, setSideBarOpen]);
};
