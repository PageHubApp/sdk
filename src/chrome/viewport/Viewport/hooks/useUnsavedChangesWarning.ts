import Router from "next/router";
import { useEffect } from "react";

/**
 * `beforeunload` + Next.js `routeChangeStart` warning when the editor has
 * dirty changes. Page switches use `pushState` (not Next.js router), so
 * `routeChangeStart` only fires for genuine navigations away from the editor.
 */
export function useUnsavedChangesWarning(unsavedChanges: string | null) {
  const hasDirtyChanges = typeof unsavedChanges === "string" && unsavedChanges.length > 0;

  useEffect(() => {
    if (!hasDirtyChanges) return;
    const warningText = "Leave site? Changes you made may not be saved.";

    const handleWindowClose = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = warningText);
    };
    const handleBrowseAway = () => {
      if (window.confirm(warningText)) return;
      Router.events.emit("routeChangeError");
    };

    window.addEventListener("beforeunload", handleWindowClose);
    Router.events.on("routeChangeStart", handleBrowseAway);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      Router.events.off("routeChangeStart", handleBrowseAway);
    };
  }, [hasDirtyChanges]);
}
