import { useEditor } from "@craftjs/core";
import { useEffect, useRef } from "react";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { SideBarOpen } from "../../utils/lib";

/**
 * Hook that automatically opens the sidebar when a node is selected
 * and the sidebar is currently closed. Re-subscribes to Craft selection
 * changes instead of polling.
 */
export const useAutoOpenSidebar = () => {
  const { query } = useEditor();
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const lastSelectionLenRef = useRef(0);

  const selectionKey = useEditor((_, q) => {
    const all = q.getEvent("selected").all();
    return all.join("\0");
  });

  useEffect(() => {
    const selectedNodes = query.getEvent("selected").all();
    const len = selectedNodes.length;

    if (len > 0 && len !== lastSelectionLenRef.current && !sideBarOpen) {
      setSideBarOpen(true);
    }

    lastSelectionLenRef.current = len;
  }, [selectionKey, query, setSideBarOpen, sideBarOpen]);
};
