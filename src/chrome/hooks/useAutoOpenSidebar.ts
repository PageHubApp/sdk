import { useEditor } from "@craftjs/core";
import { useEffect, useRef } from "react";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { SideBarOpen } from "utils/lib";

/**
 * Hook that automatically opens the sidebar when a node is selected
 * and the sidebar is currently closed
 */
export const useAutoOpenSidebar = () => {
  const { query } = useEditor();
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const lastSelectedNodes = useRef<string[]>([]);

  useEffect(() => {
    // Check for selection changes periodically
    const checkSelection = () => {
      const selectedNodes = query.getEvent("selected").all();

      // If selection changed and sidebar is closed, open it
      if (
        selectedNodes.length > 0 &&
        selectedNodes.length !== lastSelectedNodes.current.length &&
        !sideBarOpen
      ) {
        setSideBarOpen(true);
      }

      lastSelectedNodes.current = selectedNodes;
    };

    // Check every 100ms for selection changes
    const interval = setInterval(checkSelection, 100);

    return () => clearInterval(interval);
  }, [query, setSideBarOpen, sideBarOpen]);
};
