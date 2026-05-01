/**
 * Mount-time wiring effects for the editor canvas — none of these need
 * arguments beyond the obvious atoms; grouped so they don't sprawl across
 * 8 single-effect files.
 */
import { useEditor } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { useEffect } from "react";
import { OnlineAtom, ShowGridLinesAtom } from "../../../../utils/atoms";
import { phStorage } from "../../../../utils/phStorage";
import { useEditorStore } from "../../../../core/store";
import {
  BreakpointZoomAtom,
  PreviewAtom,
  UnsavedChangesAtom,
  ViewAtom,
} from "../../state/atoms";

interface UseViewportSetupEffectsArgs {
  handleBodyKeyDown: (e: KeyboardEvent) => void;
}

export function useViewportSetupEffects({ handleBodyKeyDown }: UseViewportSetupEffectsArgs) {
  const { actions, query } = useEditor();
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const [, setOnline] = useAtomState(OnlineAtom);
  const [, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);
  const [view] = useAtomState(ViewAtom);
  const [preview] = useAtomState(PreviewAtom);
  const [, setBreakpointZoom] = useAtomState(BreakpointZoomAtom);
  const { setView: setStoreView, setPreview: setStorePreview } = useEditorStore();

  // Enable CraftJS editing after initial paint settles (avoids flash of unstyled nodes)
  useEffect(() => {
    if (!window) return;
    window.requestAnimationFrame(() => {
      setTimeout(
        () =>
          actions.setOptions(options => {
            options.enabled = true;
          }),
        200
      );
    });
  }, [actions]);

  // Grid-lines: read on mount, write data attr + phStorage on change.
  useEffect(() => {
    const saved = phStorage.get("grid-lines");
    if (saved !== null) setShowGridLines(saved === "true");
  }, [setShowGridLines]);

  useEffect(() => {
    const viewport = document.getElementById("viewport");
    if (viewport) viewport.setAttribute("data-show-gridlines", showGridLines.toString());
    phStorage.set("grid-lines", showGridLines.toString());
  }, [showGridLines]);

  // Expose query for style guide resolution
  useEffect(() => {
    if (typeof window !== "undefined") (window as any).__CRAFT_EDITOR__ = { query };
    return () => {
      if (typeof window !== "undefined") delete (window as any).__CRAFT_EDITOR__;
    };
  }, [query]);

  // Sync atoms → store
  useEffect(() => {
    setStoreView(view);
  }, [view, setStoreView]);
  useEffect(() => {
    setStorePreview(preview);
  }, [preview, setStorePreview]);

  // Init clipboard storage. Phase 2 deleted the canvas → scope chip sync effect —
  // the canvas viewport IS the scope now; no separate atom to mirror.
  useEffect(() => {
    phStorage.set("clipboard", {});
  }, []);

  // Online / offline: write to atom; clear unsaved-changes warning when back online.
  useEffect(() => {
    const handler = (event: Event) => {
      setOnline(event.type === "online");
      if (event.type === "online") setUnsavedChanged(null);
    };
    setOnline(window.navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, []);

  // Document-level keyboard listener (e.g. Cmd+S handlers, Escape)
  useEffect(() => {
    document.addEventListener("keydown", handleBodyKeyDown);
    return () => document.removeEventListener("keydown", handleBodyKeyDown);
  }, []);

  // Reset breakpoint zoom when view changes — a 50% zoom set for 2XL would
  // shrink MD unnecessarily; start each view fresh.
  useEffect(() => {
    setBreakpointZoom(1);
  }, [view, setBreakpointZoom]);
}
