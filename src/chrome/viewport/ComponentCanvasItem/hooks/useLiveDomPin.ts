import React from "react";
import {
  CANVAS_SLOT_W,
  CanvasSize,
} from "../../../../utils/component/componentCanvas";
import {
  getLiveComponent,
  subscribeLive,
} from "../../../../utils/component/liveComponentRegistry";
import { CARD_PAD, SURFACE_SELECTOR } from "../constants";

interface Args {
  containerId: string;
  isStatePin: boolean;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  slotRef: React.RefObject<HTMLDivElement | null>;
  innerRef: React.RefObject<HTMLDivElement | null>;
  liveSizeRef: React.RefObject<CanvasSize>;
  applyPinRef: React.RefObject<() => void>;
}

/**
 * Pin the live CraftJS-rendered DOM to our slot via position: fixed in
 * screen coords. The element stays in its React-managed parent so
 * reconciliation isn't broken; we just override its visual position.
 *
 * Re-runs on:
 *  - mount + containerId change
 *  - ph-canvas-tick from the surface (pan/zoom changed)
 *  - ResizeObserver on slot (slot height changed)
 *  - scroll/resize (slot screen position shifted)
 *  - savedPos change (caller invokes applyPinRef.current())
 *  - pointermove (drag handler invokes applyPinRef.current())
 *  - registry change (Container mounts/unmounts the live element)
 */
export function useLiveDomPin({
  containerId,
  isStatePin,
  wrapperRef,
  slotRef,
  innerRef,
  liveSizeRef,
  applyPinRef,
}: Args) {
  React.useLayoutEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let rafId = 0;

    const apply = () => {
      if (cancelled || !slotRef.current) return;
      // Prefer the registry (Container registers itself on mount/unmount —
      // race-free). Fall back to querySelector for components that aren't
      // Containers (Dropdown, Tabs, ...) — they apply `node-id` on their
      // root element via createElement props so the lookup works.
      const src =
        getLiveComponent(containerId) ||
        (document.querySelector(`[node-id="${containerId}"]`) as HTMLElement | null);
      if (!src) {
        slotRef.current.style.opacity = "0";
        return;
      }
      slotRef.current.style.opacity = "1";
      const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
      const zoomNow = surface
        ? parseFloat(getComputedStyle(surface).getPropertyValue("--ph-zoom")) || 1
        : 1;
      const slotR = slotRef.current.getBoundingClientRect();
      // Pin the live component INSIDE the slot's padding, so the slot's chrome
      // (border/rounded/shadow) frames it like a card. The padding is in canvas
      // coords (pre-zoom) so the offset scales with zoom.
      const padScaled = CARD_PAD * zoomNow;
      const liveW = liveSizeRef.current.w;
      const liveH = liveSizeRef.current.h;
      src.style.setProperty("position", "fixed", "important");
      // Chrome multiplies `position: fixed` coordinates by CSS `zoom` (and
      // any inherited zoom from an ancestor — which state-pinned descendants
      // get from the master). Divide left/top by zoom so the rendered
      // position lands at the slot's actual screen coords.
      src.style.setProperty("left", `${(slotR.left + padScaled) / zoomNow}px`, "important");
      src.style.setProperty("top", `${(slotR.top + padScaled) / zoomNow}px`, "important");
      // Width: when liveW is set the user has explicitly sized the card via
      // the right-edge drag handle — respect that even if content overflows.
      // Otherwise let the live element size to its natural content width
      // and the slot grows to match (mirrors height auto-fit).
      if (liveW !== undefined) {
        src.style.setProperty("width", `${liveW}px`, "important");
      } else {
        src.style.removeProperty("width");
      }
      // Use CSS `zoom` instead of `transform: scale` so the master DOESN'T
      // become a containing block for position:fixed descendants (state-card
      // panels). With transform: scale(z), a child Dropdown panel pinned via
      // position:fixed anchors to the master's transformed bbox instead of
      // the viewport — its left/top compound with master's offset and break
      // pinning. CSS `zoom` scales without creating a CB.
      //
      // Skip zoom on state-pinned descendants — they inherit `zoom` from
      // the master ancestor via CSS cascade, and re-applying would compound
      // (1.1 × 1.1 = 1.21).
      if (!isStatePin) {
        src.style.setProperty("zoom", `${zoomNow}`, "important");
      }
      src.style.setProperty("z-index", "40", "important");
      // For state-pinned subtrees (Modal backdrops, etc.) neutralize layout
      // utilities like `h-screen` / `w-screen` / `right:0` / `bottom:0` so the
      // node sizes naturally inside the card instead of trying to fill the
      // viewport.
      if (isStatePin) {
        src.style.setProperty("height", "auto", "important");
        src.style.setProperty("max-height", "none", "important");
        src.style.setProperty("max-width", "none", "important");
        src.style.setProperty("min-height", "0", "important");
        src.style.setProperty("min-width", "0", "important");
        src.style.setProperty("right", "auto", "important");
        src.style.setProperty("bottom", "auto", "important");
      }
      // Re-observe src so dimension changes (e.g. force-visible kicks in
      // after the data-attribute lands and `display:none` lifts) trigger a
      // re-pin. Calling observe on the same element is a no-op.
      if (observer) observer.observe(src);

      // Slot height: when liveH is set the user has explicitly sized the card
      // (bottom-edge drag), otherwise auto-fit to the live component's natural
      // rendered height + padding on both sides.
      if (liveH !== undefined) {
        slotRef.current.style.height = `${liveH}px`;
      } else {
        const naturalH = src.offsetHeight;
        if (naturalH > 0) {
          slotRef.current.style.height = `${naturalH + CARD_PAD * 2}px`;
        }
      }
      // Slot + inner-wrapper width: same auto-fit / committed-value pattern
      // as height. When liveW unset, follow the live element's natural width
      // so content doesn't overflow the card frame.
      const targetW = liveW !== undefined ? liveW : src.offsetWidth || CANVAS_SLOT_W;
      const targetWPx = `${targetW + CARD_PAD * 2}px`;
      if (innerRef.current) innerRef.current.style.width = targetWPx;
    };

    const schedule = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(apply);
    };

    applyPinRef.current = apply;
    apply();
    observer = new ResizeObserver(schedule);
    if (slotRef.current) observer.observe(slotRef.current);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
    surface?.addEventListener("ph-canvas-tick", apply);

    // Re-pin whenever the registry's entry for this container changes
    // (Container mounted/unmounted). Replaces the old polling loop.
    const unsubRegistry = subscribeLive(containerId, schedule);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      surface?.removeEventListener("ph-canvas-tick", apply);
      unsubRegistry();
      const src =
        getLiveComponent(containerId) ||
        (document.querySelector(`[node-id="${containerId}"]`) as HTMLElement | null);
      if (src) {
        [
          "position",
          "left",
          "top",
          "width",
          "zoom",
          "z-index",
          "height",
          "max-height",
          "max-width",
          "min-height",
          "min-width",
          "right",
          "bottom",
        ].forEach(p => src.style.removeProperty(p));
      }
    };
  }, [containerId, isStatePin]);
}
