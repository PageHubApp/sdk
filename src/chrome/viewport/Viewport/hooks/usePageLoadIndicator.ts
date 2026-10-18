import { useAtomState } from "@zedux/react";
import { useCallback, useEffect } from "react";
import { PageLoadAtom } from "../../state/atoms";

/**
 * Page-load progress state for `LoadingBar`, read by the canvas. Single enum
 * (idle/loading/done) in `PageLoadAtom` so the page-switch code in
 * `EditorServices` can drive it without sitting inside the canvas. `done` flips
 * back to `idle` when LoadingBar's `onComplete` fires; a 2s safety net resets
 * it if onComplete never fires (unmount mid-animation).
 */
export function usePageLoadIndicator() {
  const [pageLoad, setPageLoad] = useAtomState(PageLoadAtom);

  const handleLoadComplete = useCallback(() => setPageLoad("idle"), [setPageLoad]);

  useEffect(() => {
    if (pageLoad !== "done") return;
    const id = setTimeout(() => setPageLoad("idle"), 2000);
    return () => clearTimeout(id);
  }, [pageLoad, setPageLoad]);

  return { pageLoad, handleLoadComplete };
}
