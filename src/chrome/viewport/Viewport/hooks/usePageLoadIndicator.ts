import { useCallback, useEffect, useState } from "react";

/**
 * Page-load progress state for `LoadingBar`. Single enum (idle/loading/done)
 * instead of two booleans. `done` flips back to `idle` when LoadingBar's
 * `onComplete` fires; a 2s safety net resets it if onComplete never fires
 * (unmount mid-animation).
 */
export function usePageLoadIndicator() {
  const [pageLoad, setPageLoad] = useState<"idle" | "loading" | "done">("idle");

  const handleLoadComplete = useCallback(() => setPageLoad("idle"), []);

  useEffect(() => {
    if (pageLoad !== "done") return;
    const id = setTimeout(() => setPageLoad("idle"), 2000);
    return () => clearTimeout(id);
  }, [pageLoad]);

  return { pageLoad, setPageLoad, handleLoadComplete };
}
