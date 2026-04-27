/**
 * ViewportScopeCoachmark — first-run hint shown the first time the user
 * switches the canvas view to a non-base breakpoint. Explains the new
 * "viewport = scope" mental model:
 *
 *   "Your edits now write `md:` classes. Switch back to mobile to edit
 *    defaults."
 *
 * Shows once per browser (phStorage `coachmark-viewport-scope-shown`),
 * dismissable via X or by clicking "Got it". Anchored below the
 * CanvasScopeBand so the visual relationship is obvious.
 */
import { useEffect, useState } from "react";
import { TbX } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { phStorage } from "../../utils/phStorage";
import { ViewAtom } from "./atoms";

const STORAGE_KEY = "coachmark-viewport-scope-shown";

const BASE_VIEWS = new Set(["mobile", "desktop", "tablet"]);

function chipPrefix(view: string): string {
  // ViewAtom "desktop" / "mobile" / "tablet" are quiet base states — coachmark
  // gates them out before this runs, so we only see sm/md/lg/xl/2xl here.
  if (view === "2xl") return "2xl:";
  return `${view}:`;
}

export function ViewportScopeCoachmark() {
  const view = useAtomValue(ViewAtom);
  const [open, setOpen] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  // Persisted-once gate: if storage says we've shown it, we never show again.
  // The session flag is a within-render guard so we don't re-trigger on
  // every viewport flip while the popover is mounted.
  useEffect(() => {
    if (hasShownThisSession) return;
    if (BASE_VIEWS.has(view)) return;
    try {
      if (phStorage.get(STORAGE_KEY) === "true") return;
    } catch {
      // phStorage unavailable (SSR / locked-down browser) — skip silently.
      return;
    }
    setOpen(true);
    setHasShownThisSession(true);
  }, [view, hasShownThisSession]);

  const dismiss = () => {
    setOpen(false);
    try {
      phStorage.set(STORAGE_KEY, "true");
    } catch {}
  };

  if (!open) return null;
  if (BASE_VIEWS.has(view)) return null;

  return (
    <div
      role="dialog"
      aria-label="Viewport scope hint"
      className="bg-base-100 border-base-300 absolute top-[26px] left-1/2 z-40 flex max-w-[420px] -translate-x-1/2 items-start gap-3 rounded-md border p-3 shadow-lg"
    >
      <div className="flex-1">
        <div className="text-base-content text-sm font-semibold">
          Your edits now write{" "}
          <span className="bg-base-200 text-primary rounded px-1 py-0.5 font-mono text-xs">
            {chipPrefix(view)}
          </span>{" "}
          classes
        </div>
        <div className="text-base-content/70 mt-1 text-xs leading-relaxed">
          Switch back to mobile to edit base defaults. The colored band reminds
          you which breakpoint your changes will land on.
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="bg-primary text-primary-content hover:bg-primary/90 mt-2 inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold transition-colors"
        >
          Got it
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss hint"
        className="text-base-content/50 hover:text-base-content -mt-1 -mr-1 rounded p-1 transition-colors"
      >
        <TbX className="size-4" />
      </button>
    </div>
  );
}
