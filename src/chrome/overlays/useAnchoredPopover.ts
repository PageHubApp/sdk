import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Boundary,
  type FlipOptions,
  type Middleware,
  type Placement,
  type RootBoundary,
  type Strategy,
} from "@floating-ui/react-dom";

export type AnchoredPopoverDismissOptions = {
  onDismiss: () => void;
  ignoreFloatingRefs?: ReadonlyArray<RefObject<HTMLElement | null>>;
};

export type UseAnchoredPopoverOptions = {
  open: boolean;
  placement?: Placement;
  strategy?: Strategy;
  mainAxisOffset?: number;
  crossAxisOffset?: number;
  flipOptions?: FlipOptions;
  shiftPadding?: number;
  boundary?: Boundary;
  rootBoundary?: RootBoundary;
  /** Enables `size` middleware: max-height from available space capped at this value */
  maxHeightCeiling?: number;
  maxHeightMin?: number;
  matchReferenceMinMaxWidth?: { min: number; max: number };
  middleware?: Middleware[];
  whileElementsMounted?: typeof autoUpdate | null;
  dismiss?: AnchoredPopoverDismissOptions;
  transform?: boolean;
};

export function useAnchoredPopover({
  open,
  placement = "bottom-start",
  strategy = "fixed",
  mainAxisOffset = 4,
  crossAxisOffset = 0,
  flipOptions,
  shiftPadding = 8,
  boundary = "clippingAncestors",
  rootBoundary = "viewport",
  maxHeightCeiling,
  maxHeightMin = 100,
  matchReferenceMinMaxWidth,
  middleware: extraMiddleware = [],
  whileElementsMounted = autoUpdate,
  dismiss,
  transform = true,
}: UseAnchoredPopoverOptions) {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  const extraMwRef = useRef(extraMiddleware);
  extraMwRef.current = extraMiddleware;

  const mmwMin = matchReferenceMinMaxWidth?.min;
  const mmwMax = matchReferenceMinMaxWidth?.max;

  const middleware = useMemo(() => {
    const list: Middleware[] = [
      offset({ mainAxis: mainAxisOffset, crossAxis: crossAxisOffset }),
      flip(flipOptions),
      shift({ padding: shiftPadding, boundary, rootBoundary }),
    ];

    if (maxHeightCeiling != null) {
      list.push(
        size({
          boundary,
          rootBoundary,
          apply({ availableHeight, rects, elements }) {
            const capped = Math.min(maxHeightCeiling, availableHeight);
            const maxH = Math.max(maxHeightMin, capped);
            Object.assign(elements.floating.style, { maxHeight: `${maxH}px` });
            if (mmwMin != null && mmwMax != null) {
              const w = rects.reference.width;
              const clamped = Math.min(Math.max(w, mmwMin), mmwMax);
              elements.floating.style.minWidth = `${clamped}px`;
            }
          },
        })
      );
    }

    list.push(...extraMwRef.current);
    return list;
  }, [
    mainAxisOffset,
    crossAxisOffset,
    flipOptions,
    shiftPadding,
    boundary,
    rootBoundary,
    maxHeightCeiling,
    maxHeightMin,
    mmwMin,
    mmwMax,
  ]);

  const floating = useFloating({
    open,
    placement,
    strategy,
    middleware,
    whileElementsMounted: whileElementsMounted ?? undefined,
    transform,
  });

  useEffect(() => {
    if (!open) return;
    const d = dismissRef.current;
    if (!d) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) return;
      const t = e.target as Node;
      const refEl = floating.refs.reference.current as HTMLElement | null | undefined;
      if (refEl?.contains(t)) return;
      if (floating.refs.floating.current?.contains(t)) return;
      for (const r of d.ignoreFloatingRefs || []) {
        if (r?.current?.contains(t)) return;
      }
      d.onDismiss();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") d.onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, floating.refs.reference, floating.refs.floating]);

  return floating;
}
