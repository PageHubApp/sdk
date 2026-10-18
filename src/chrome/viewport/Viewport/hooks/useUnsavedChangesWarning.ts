import Router from "next/router";
import { useEffect, useRef } from "react";

import { useConfirm } from "../../../primitives/layout/useConfirm";

/** Next.js treats a thrown routeChangeStart handler as a cancelled navigation. */
const CANCEL_NAVIGATION = "ph:navigation-cancelled-unsaved-changes";

/**
 * Warns before leaving the editor with dirty changes. Closing or reloading the
 * tab gets the browser's own `beforeunload` prompt (the only thing browsers
 * allow there). A Next.js navigation is cancelled, asked about in a
 * `ConfirmDialog`, and replayed if you choose to leave. Page switches use
 * `pushState` (not the Next.js router), so they never trigger this.
 *
 * Returns the dialog; the caller renders it.
 */
export function useUnsavedChangesWarning(unsavedChanges: string | null) {
  const hasDirtyChanges = typeof unsavedChanges === "string" && unsavedChanges.length > 0;
  const { ask, dialog } = useConfirm();
  const leaving = useRef(false);

  useEffect(() => {
    if (!hasDirtyChanges) return;

    const handleWindowClose = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const handleBrowseAway = (url: string) => {
      if (leaving.current) return;
      Router.events.emit("routeChangeError");
      void ask({
        title: "Leave without saving?",
        message: "Your latest changes haven't saved yet. If you leave now, they'll be lost.",
        confirmText: "Leave",
        cancelText: "Stay",
        variant: "warning",
      }).then(ok => {
        if (!ok) return;
        leaving.current = true;
        void Router.push(url);
      });
      throw CANCEL_NAVIGATION;
    };

    window.addEventListener("beforeunload", handleWindowClose);
    Router.events.on("routeChangeStart", handleBrowseAway);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      Router.events.off("routeChangeStart", handleBrowseAway);
    };
  }, [hasDirtyChanges, ask]);

  return dialog;
}
