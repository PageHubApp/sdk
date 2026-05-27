import { useEffect, useRef, useState } from "react";
import { useOverlay } from "../../../../../../registry/hooks/useOverlay";

/**
 * State + effects for the toolbar's compact search bar.
 * - Auto-focuses the input when opened.
 * - Closes on outside-click (anywhere outside `toolbarRef`).
 * - Escape dismissal routed through the registry overlay stack.
 */
export function useCompactSearch(toolbarRef: React.RefObject<HTMLElement | null>) {
  const [showCompactSearch, setShowCompactSearch] = useState(false);
  const compactSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showCompactSearch) return;
    compactSearchInputRef.current?.focus();
  }, [showCompactSearch]);

  useEffect(() => {
    if (!showCompactSearch) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (toolbarRef.current?.contains(target)) return;
      setShowCompactSearch(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showCompactSearch, toolbarRef]);

  useOverlay({
    id: "media-compact-search",
    isOpen: showCompactSearch,
    onDismiss: () => setShowCompactSearch(false),
  });

  return { showCompactSearch, setShowCompactSearch, compactSearchInputRef };
}
