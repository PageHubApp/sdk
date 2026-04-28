/**
 * AnchoredPopover — single primitive for every anchored popover/dropdown in the
 * editor chrome. Wraps useAnchoredPopover (Floating UI) + portal + z-index +
 * fade animation + delayed unmount for the exit fade.
 *
 * Use for: selects, color pickers, variable pickers, searchable menus,
 * spacing/sizing dropdowns. NOT for FloatingPanel-style draggable windows.
 *
 * Two anchor modes:
 *  - element ref: pass `anchor={someRef}` or `anchor={someElement}`
 *  - DOMRect (for atom-driven dialogs): pass `anchorRect={rect}`
 */
import type { Boundary, FlipOptions, Placement, RootBoundary } from "@floating-ui/react-dom";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useFloatingPanelPortalRegister } from "../floating/FloatingPanel";
import { OVERLAY_Z_ANCHORED } from "./overlayZIndex";
import { useAnchoredPopover } from "./useAnchoredPopover";

const FADE_OUT_MS = 75;

export type AnchoredPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Anchor element — ref, raw element, or virtual element. Mutually exclusive with anchorRect. */
  anchor?: RefObject<HTMLElement | null> | HTMLElement | null;
  /** Static rect (e.g. captured at click time from a Zedux atom). Mutually exclusive with anchor. */
  anchorRect?: DOMRect | null;
  placement?: Placement;
  mainAxisOffset?: number;
  crossAxisOffset?: number;
  flipOptions?: FlipOptions;
  shiftPadding?: number;
  boundary?: Boundary;
  rootBoundary?: RootBoundary;
  /** Cap floating element max-height to available viewport space, up to this ceiling. */
  maxHeightCeiling?: number;
  matchAnchorWidth?: { min: number; max: number };
  /** Skip fade-out unmount delay (e.g. when caller already debounces). */
  immediate?: boolean;
  zIndex?: number;
  /** Extra classes applied to the floating element. */
  className?: string;
  /** Inline styles merged after Floating UI's positioning styles. */
  style?: CSSProperties;
  /** Portal target. Defaults to `.pagehub-sdk-root` then `document.body`. */
  portalTarget?: HTMLElement | null;
  /** Refs of elements that should not count as "outside" for click-outside dismiss. */
  ignoreOutsideClicks?: ReadonlyArray<RefObject<HTMLElement | null>>;
  /** Skip the built-in click-outside + Escape dismissal (parent owns visibility). */
  disableDismiss?: boolean;
  children: ReactNode;
};

function resolveAnchor(
  anchor: AnchoredPopoverProps["anchor"]
): HTMLElement | null {
  if (!anchor) return null;
  if (anchor instanceof HTMLElement) return anchor;
  return (anchor as RefObject<HTMLElement | null>).current ?? null;
}

function getPortalTarget(target?: HTMLElement | null): HTMLElement {
  if (target) return target;
  if (typeof document === "undefined") return null as unknown as HTMLElement;
  return (
    (document.querySelector(".pagehub-sdk-root") as HTMLElement | null) ?? document.body
  );
}

export function AnchoredPopover({
  open,
  onOpenChange,
  anchor,
  anchorRect,
  placement = "bottom-start",
  mainAxisOffset = 4,
  crossAxisOffset = 0,
  flipOptions,
  shiftPadding = 8,
  boundary = "clippingAncestors",
  rootBoundary = "viewport",
  maxHeightCeiling,
  matchAnchorWidth,
  immediate = false,
  zIndex = OVERLAY_Z_ANCHORED,
  className,
  style,
  portalTarget,
  ignoreOutsideClicks,
  disableDismiss = false,
  children,
}: AnchoredPopoverProps) {
  // Mount/unmount with a brief delay so the exit fade can play.
  // The element renders with data-state matching `open` directly — CSS animations
  // run when the element is FIRST inserted, no RAF needed. Going via RAF caused
  // a one-frame flash where the freshly mounted element rendered with
  // data-state="closed" → the fade-out keyframe started → RAF flipped state to
  // "open" → fade-in started over a partially-faded element. The user saw
  // popovers "re-opening" on every parent re-render.
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closed">(open ? "open" : "closed");

  useEffect(() => {
    if (open) {
      setMounted(true);
      setState("open");
      return;
    }
    // Only kick off fade-out if we were actually mounted (avoid running the
    // exit keyframe on a popover that was never opened).
    setState(prev => (prev === "open" ? "closed" : prev));
    if (immediate) {
      setMounted(false);
      return;
    }
    const id = window.setTimeout(() => setMounted(false), FADE_OUT_MS);
    return () => window.clearTimeout(id);
  }, [open, immediate]);

  const floating = useAnchoredPopover({
    open: mounted,
    placement,
    mainAxisOffset,
    crossAxisOffset,
    flipOptions,
    shiftPadding,
    boundary,
    rootBoundary,
    maxHeightCeiling,
    matchReferenceMinMaxWidth: matchAnchorWidth,
    dismiss: disableDismiss
      ? undefined
      : { onDismiss: () => onOpenChange(false), ignoreFloatingRefs: ignoreOutsideClicks },
  });

  // Sync the anchor (element or virtual rect) into Floating UI.
  useLayoutEffect(() => {
    if (!mounted) return;
    if (anchorRect) {
      floating.refs.setReference({
        getBoundingClientRect: () => anchorRect,
      } as unknown as HTMLElement);
    } else {
      floating.refs.setReference(resolveAnchor(anchor));
    }
    void floating.update();
    // floating identity changes each render — re-attach only on visibility/anchor swap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, anchor, anchorRect]);

  const target = useMemo(() => getPortalTarget(portalTarget), [portalTarget]);

  // If we're rendered inside a FloatingPanel, register our portal root with
  // its outside-click skip set. Without this, clicking inside this popover
  // would dismiss the parent panel.
  const registerWithParentPanel = useFloatingPanelPortalRegister();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const setFloatingRef = useCallback(
    (el: HTMLElement | null) => {
      floating.refs.setFloating(el);
      setPortalNode(el);
    },
    [floating.refs]
  );
  useEffect(() => {
    if (!portalNode || !registerWithParentPanel) return;
    return registerWithParentPanel(portalNode);
  }, [portalNode, registerWithParentPanel]);

  if (!mounted || !target) return null;

  const mergedStyle: CSSProperties = {
    ...floating.floatingStyles,
    zIndex,
    ...style,
  };

  return ReactDOM.createPortal(
    <div
      ref={setFloatingRef}
      data-ph-popover=""
      data-state={state}
      style={mergedStyle}
      className={className}
    >
      {children}
    </div>,
    target
  );
}

/** Re-exported for callers that need to pass a custom z-index. */
export { OVERLAY_Z_ANCHORED };

/** Bare ref helper — get a stable ref attachable to an arbitrary DOM element. */
export function useAnchorRef<T extends HTMLElement = HTMLElement>() {
  return useRef<T | null>(null);
}
