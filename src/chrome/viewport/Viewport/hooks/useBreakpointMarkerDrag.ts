import { ROOT_NODE } from "@craftjs/utils";
import { useCallback, useEffect } from "react";
import {
  rewriteBreakpoints,
  rewriteMediaToContainer,
} from "../../../../utils/breakpointRewrite";
import { EDITOR_CANVAS_BREAKPOINT_PX } from "../../../../utils/tailwind/className";
import {
  type AppliedBreakpointsShape,
} from "../../atoms";
import { breakpointMarkerOrder, type BpKey } from "../constants";

interface UseBreakpointMarkerDragArgs {
  actions: any;
  themeBreakpoints: Record<string, number> | undefined;
  appliedBreakpoints: AppliedBreakpointsShape;
  setAppliedBreakpoints: (next: AppliedBreakpointsShape) => void;
  pendingBreakpointOverride: Record<string, number>;
  setPendingBreakpointOverride: (
    next: (prev: Record<string, number>) => Record<string, number>
  ) => void;
  canvasZoomActive: boolean;
  breakpointZoom: number;
}

/**
 * Per-breakpoint marker drag (sm/md/lg/xl/2xl). Live-preview goes to
 * `PendingBreakpointOverrideAtom` (no commit); pointer-up commits to
 * `ROOT.props.theme.breakpoints` as a single history entry, then rewrites
 * the live `<style id="tailwind-compiled">` in place so the canvas reflects
 * the new value immediately without an SSR round-trip.
 *
 * Mount effect seeds `AppliedBreakpointsAtom` from theme.breakpoints +
 * applies a rewrite to the SSR-baked `<style>` tag in case it didn't run
 * with the current theme.
 */
export function useBreakpointMarkerDrag({
  actions,
  themeBreakpoints,
  appliedBreakpoints,
  setAppliedBreakpoints,
  pendingBreakpointOverride,
  setPendingBreakpointOverride,
  canvasZoomActive,
  breakpointZoom,
}: UseBreakpointMarkerDragArgs) {
  const getCommittedBpPx = useCallback(
    (bp: BpKey): number => {
      const fromTheme = themeBreakpoints?.[bp];
      if (typeof fromTheme === "number") return fromTheme;
      return EDITOR_CANVAS_BREAKPOINT_PX[bp];
    },
    [themeBreakpoints]
  );

  const getEffectiveBpPx = useCallback(
    (bp: BpKey): number => pendingBreakpointOverride[bp] ?? getCommittedBpPx(bp),
    [pendingBreakpointOverride, getCommittedBpPx]
  );

  const handleMarkerPointerDown = useCallback(
    (bp: BpKey) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = getEffectiveBpPx(bp);
      const z = canvasZoomActive && breakpointZoom !== 1 ? breakpointZoom : 1;
      // Clamp inside neighboring breakpoints (keep ordering monotonically increasing).
      const idx = breakpointMarkerOrder.indexOf(bp);
      const prev = idx > 0 ? breakpointMarkerOrder[idx - 1] : null;
      const next = idx < breakpointMarkerOrder.length - 1 ? breakpointMarkerOrder[idx + 1] : null;
      const minW = prev ? getCommittedBpPx(prev) + 1 : 240;
      const maxW = next ? getCommittedBpPx(next) - 1 : 3840;

      const onMove = (ev: PointerEvent) => {
        const dxScreen = ev.clientX - startX;
        const nextPx = Math.max(minW, Math.min(maxW, Math.round(startWidth + dxScreen / z)));
        setPendingBreakpointOverride(prevState => ({ ...prevState, [bp]: nextPx }));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onUp);

        // Read the final pending value before clearing.
        let finalPx: number | undefined;
        setPendingBreakpointOverride(prevState => {
          finalPx = prevState[bp];
          const { [bp]: _drop, ...rest } = prevState;
          return rest;
        });
        if (typeof finalPx !== "number" || finalPx === startWidth) return;

        // Commit: persist to ROOT.props.theme.breakpoints as one history entry.
        actions.setProp(ROOT_NODE, (props: any) => {
          if (!props.theme) props.theme = {};
          if (!props.theme.breakpoints) props.theme.breakpoints = {};
          props.theme.breakpoints[bp] = finalPx;
        });

        // Rewrite the live <style id="tailwind-compiled"> from currently-applied
        // values to the new committed values, in place.
        const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
        if (styleEl) {
          const fromBps = appliedBreakpoints;
          const toBps = { ...fromBps, [bp]: finalPx };
          // Editor-only: also normalize any new `@media` to `@container` so
          // dynamic classes added during editing land in the same container-query
          // namespace as SSR-baked CSS.
          styleEl.textContent = rewriteMediaToContainer(
            rewriteBreakpoints(styleEl.textContent || "", fromBps, toBps)
          );
          setAppliedBreakpoints(toBps);
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onUp);
    },
    [
      actions,
      appliedBreakpoints,
      breakpointZoom,
      canvasZoomActive,
      getCommittedBpPx,
      getEffectiveBpPx,
      setAppliedBreakpoints,
      setPendingBreakpointOverride,
    ]
  );

  const resetMarkerBreakpoint = useCallback(
    (bp: BpKey) => () => {
      const defaultPx = EDITOR_CANVAS_BREAKPOINT_PX[bp];
      const current = themeBreakpoints?.[bp];
      if (current === undefined || current === defaultPx) return;

      // Remove the override from theme.breakpoints (delete the key, keep others).
      actions.setProp(ROOT_NODE, (props: any) => {
        if (props.theme?.breakpoints) {
          delete props.theme.breakpoints[bp];
          if (Object.keys(props.theme.breakpoints).length === 0) delete props.theme.breakpoints;
        }
      });

      const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
      if (styleEl) {
        const fromBps = appliedBreakpoints;
        const toBps = { ...fromBps, [bp]: defaultPx };
        styleEl.textContent = rewriteMediaToContainer(
          rewriteBreakpoints(styleEl.textContent || "", fromBps, toBps)
        );
        setAppliedBreakpoints(toBps);
      }
    },
    [actions, appliedBreakpoints, setAppliedBreakpoints, themeBreakpoints]
  );

  // On mount: seed AppliedBreakpointsAtom from theme.breakpoints + apply rewrite
  // to the SSR-baked <style> tag in case it didn't run with current theme.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
    if (!styleEl) return;
    const target: AppliedBreakpointsShape = {
      sm: themeBreakpoints?.sm ?? 640,
      md: themeBreakpoints?.md ?? 768,
      lg: themeBreakpoints?.lg ?? 1024,
      xl: themeBreakpoints?.xl ?? 1280,
      "2xl": themeBreakpoints?.["2xl"] ?? 1536,
    };
    // Only rewrite if appliedBreakpoints differs from target.
    const sameAsApplied = (Object.keys(target) as Array<keyof typeof target>).every(
      k => appliedBreakpoints[k] === target[k]
    );
    if (!sameAsApplied) {
      styleEl.textContent = rewriteMediaToContainer(
        rewriteBreakpoints(styleEl.textContent || "", appliedBreakpoints, target)
      );
      setAppliedBreakpoints(target);
    }
    // Run only when committed theme.breakpoints changes (not on every appliedBreakpoints write).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    themeBreakpoints?.sm,
    themeBreakpoints?.md,
    themeBreakpoints?.lg,
    themeBreakpoints?.xl,
    themeBreakpoints?.["2xl"],
  ]);

  return {
    getEffectiveBpPx,
    handleMarkerPointerDown,
    resetMarkerBreakpoint,
  };
}
