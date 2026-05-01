import { useEffect, useRef, useState } from "react";

/**
 * State + effects for the toolbar's compact search bar.
 * - Auto-focuses the input when opened.
 * - Closes on outside-click (anywhere outside `toolbarRef`) or Escape.
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCompactSearch(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showCompactSearch, toolbarRef]);

  return { showCompactSearch, setShowCompactSearch, compactSearchInputRef };
}
