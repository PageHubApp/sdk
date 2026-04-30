import { useEditor } from "@craftjs/core";
import React from "react";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbFocus2, TbGripVertical } from "react-icons/tb";
import {
  CANVAS_MIN_H,
  CANVAS_MIN_W,
  CANVAS_SLOT_H,
  CANVAS_SLOT_W,
  CanvasPos,
  CanvasPosKey,
  CanvasSize,
  getComponentCanvasPos,
  getComponentCanvasSize,
} from "../../utils/componentCanvas";
import { useSetAtomState } from "../../utils/atoms";
import { CanvasIsolateAtom } from "../../utils/componentIsolation";
import { getLiveComponent, subscribeLive } from "../../utils/componentRegistry";

interface Props {
  containerId: string;
  index: number;
  /** When true, the wrapper renders without its drag handle (the user is
      focused on this single component). The position-pinning effect still
      runs so the component stays at its slot. */
  isolated?: boolean;
  /** Used in canvas isolation when the master is shown alongside state cards.
      Overrides the 4-col auto-layout default. The auto-write effect commits
      this value (not the auto-layout fallback) when the node has no saved
      canvasPos yet, so the state card persists at its first-displayed spot. */
  defaultPos?: CanvasPos;
  /** Hide the focus button + noop double-click. Required for state cards —
      isolating a non-`type === "component"` node would trip the safety
      effect in ComponentCanvasViewport and immediately exit isolation. */
  disableIsolate?: boolean;
  /** Tag the live DOM with `data-canvas-state-pin="true"` while this card is
      mounted. Pairs with the body-scoped CSS rule that overrides Tailwind
      `hidden` so the state subtree renders with a real bbox to pin. */
  isStatePin?: boolean;
  /** Picks which `props.custom` key persists this card's position. List view
      uses `canvasPos`; isolation view uses `canvasIsolatePos` so dragging in
      one canvas doesn't shift the layout of the other. Defaults to list. */
  isIsolationCanvas?: boolean;
}

const HANDLE_HEIGHT = 24;
const HANDLE_GAP = 8;
const CARD_PAD = 12;
const SURFACE_SELECTOR = "[data-canvas-zoom-component-canvas]";
const RESIZE_BAND = 8;

type ResizeSide = "right" | "bottom" | "corner";

/**
 * Canvas slot for a single component.
 *
 * Pan + zoom are read from CSS variables on the surface (`--ph-pan-x`,
 * `--ph-pan-y`, `--ph-zoom`) via a calc-based transform on the wrapper.
 * Pan/zoom changes therefore do NOT re-render this component — the wrapper
 * just reads the new var value via CSS. The viewport dispatches a
 * `ph-canvas-tick` event on the surface whenever pan/zoom changes; we listen
 * for it to re-pin the live component DOM (which is `position: fixed` and
 * needs its left/top updated imperatively).
 *
 * Drag is also React-bypassed: pointermove writes the wrapper's `--ph-item-x`
 * / `--ph-item-y` directly via ref + re-pins the live DOM. We only call
 * `actions.setProp` on pointerup. So a 60Hz drag is 60 DOM mutations and ZERO
 * React renders.
 */
export function ComponentCanvasItem({
  containerId,
  index,
  isolated = false,
  defaultPos,
  disableIsolate = false,
  isStatePin = false,
  isIsolationCanvas = false,
}: Props) {
  const { query, actions } = useEditor();
  const setCanvasIsolate = useSetAtomState(CanvasIsolateAtom);

  const posKey: CanvasPosKey = isIsolationCanvas ? "canvasIsolatePos" : "canvasPos";

  // Saved pos comes from props.custom[posKey]; if none, prefer caller-
  // supplied defaultPos (state cards) before the auto-layout fallback.
  const storedPos = (() => {
    try {
      const p = query.node(containerId).get()?.data?.props?.custom?.[posKey];
      if (p && typeof p.x === "number" && typeof p.y === "number") {
        return { x: p.x, y: p.y } as CanvasPos;
      }
    } catch {
      // ignore
    }
    return null;
  })();
  const savedPos: CanvasPos =
    storedPos ?? defaultPos ?? getComponentCanvasPos(containerId, query, index, posKey);
  const savedSize = getComponentCanvasSize(containerId, query);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const slotRef = React.useRef<HTMLDivElement>(null);
  // Inner wrapper holds the scaled slot. Width lives here (in canvas units).
  // Outer wrapper only translates so the drag handle stays at 1:1 (sharp).
  const innerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{
    startCanvas: CanvasPos;
    startScreenX: number;
    startScreenY: number;
  } | null>(null);
  const livePosRef = React.useRef<CanvasPos>(savedPos);
  // Live size mirrors livePos: pointermove writes refs + DOM directly, only
  // pointerup commits to props. h === undefined keeps slot in auto-fit mode.
  const liveSizeRef = React.useRef<CanvasSize>(savedSize);
  const resizeRef = React.useRef<{
    side: ResizeSide;
    startScreenX: number;
    startScreenY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const moveRafRef = React.useRef<number>(0);
  const pendingPosRef = React.useRef<CanvasPos | null>(null);
  const applyPinRef = React.useRef<() => void>(() => {});

  // Persist auto-layout position back to props on first mount, so subsequent
  // reads (and the Container's stored position) line up with the drag handle.
  React.useEffect(() => {
    try {
      const node = query.node(containerId).get();
      const stored = node?.data?.props?.custom?.[posKey];
      if (!stored || typeof stored.x !== "number" || typeof stored.y !== "number") {
        actions.setProp(containerId, (p: any) => {
          if (!p.custom) p.custom = {};
          p.custom[posKey] = savedPos;
        });
      }
    } catch {
      // ignore
    }
  }, [containerId, posKey]);

  // When savedPos changes externally (and we're not dragging), sync the CSS vars.
  React.useLayoutEffect(() => {
    if (dragRef.current) return;
    livePosRef.current = savedPos;
    const w = wrapperRef.current;
    if (!w) return;
    w.style.setProperty("--ph-item-x", `${savedPos.x}px`);
    w.style.setProperty("--ph-item-y", `${savedPos.y}px`);
    applyPinRef.current();
  }, [savedPos.x, savedPos.y]);

  // Unmount safety: tear down any in-flight drag/resize listeners so the
  // window doesn't keep firing into stale closures after the card disappears
  // (entering/exiting isolation, hidden toggle, etc).
  React.useEffect(() => {
    return () => {
      if (dragMoveListenerRef.current) {
        window.removeEventListener("pointermove", dragMoveListenerRef.current);
      }
      if (dragEndListenerRef.current) {
        window.removeEventListener("pointerup", dragEndListenerRef.current);
        window.removeEventListener("pointercancel", dragEndListenerRef.current);
      }
      if (dragBlurListenerRef.current) {
        window.removeEventListener("blur", dragBlurListenerRef.current);
      }
      if (resizeMoveListenerRef.current) {
        window.removeEventListener("pointermove", resizeMoveListenerRef.current);
      }
      if (resizeEndListenerRef.current) {
        window.removeEventListener("pointerup", resizeEndListenerRef.current);
        window.removeEventListener("pointercancel", resizeEndListenerRef.current);
      }
      if (resizeBlurListenerRef.current) {
        window.removeEventListener("blur", resizeBlurListenerRef.current);
      }
      if (moveRafRef.current) cancelAnimationFrame(moveRafRef.current);
      document.body.style.cursor = "";
    };
  }, []);

  // State-card pin: remove the `hidden` Tailwind token from the live DOM so
  // the natural display class (flex/grid/etc) takes over — without this, a
  // Dropdown panel with `hidden flex-col` would lose its flex layout.
  // useLayoutEffect so the class change lands BEFORE the pin effect's first
  // apply() reads `offsetHeight`. Restore on unmount.
  React.useLayoutEffect(() => {
    if (!isStatePin) return;
    const removed = new Set<HTMLElement>();
    // Reapply each tag run: parses className for the "open" display (e.g.
    // `group-focus-within:flex` → flex, `peer-checked:grid` → grid) so the
    // panel renders with its real layout, not block fallback.
    const detectOpenDisplay = (el: HTMLElement): string | null => {
      const tokens = el.className.split(/\s+/);
      for (const t of tokens) {
        const m = t.match(/:(inline-flex|inline-grid|inline-block|flex|grid|block)$/);
        if (m) return m[1];
      }
      return null;
    };
    const tag = () => {
      const el =
        getLiveComponent(containerId) ||
        (document.querySelector(`[node-id="${containerId}"]`) as HTMLElement | null);
      if (!el) return;
      el.setAttribute("data-canvas-state-pin", "true");
      if (el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        removed.add(el);
      }
      const openDisplay = detectOpenDisplay(el);
      if (openDisplay) {
        el.style.setProperty("display", openDisplay, "important");
      }
    };
    tag();
    const unsub = subscribeLive(containerId, tag);
    return () => {
      unsub();
      const el =
        getLiveComponent(containerId) ||
        (document.querySelector(`[node-id="${containerId}"]`) as HTMLElement | null);
      if (el) {
        el.removeAttribute("data-canvas-state-pin");
        el.style.removeProperty("display");
      }
      // Restore the hidden class only on elements we actually stripped.
      for (const r of removed) r.classList.add("hidden");
    };
  }, [containerId, isStatePin]);

  // Same idea for size — keep liveSizeRef + wrapper width in sync with the
  // committed value when we're not in the middle of a resize.
  React.useLayoutEffect(() => {
    if (resizeRef.current) return;
    liveSizeRef.current = { w: savedSize.w, h: savedSize.h };
    // Provisional width — apply() will refine via auto-fit if liveW unset.
    if (innerRef.current) {
      innerRef.current.style.width = `${(savedSize.w ?? CANVAS_SLOT_W) + CARD_PAD * 2}px`;
    }
    applyPinRef.current();
  }, [savedSize.w, savedSize.h]);

  // When `isolated` toggles, the drag handle appears/disappears, which shifts
  // the slot's screen Y by the handle height. ResizeObserver doesn't fire on
  // position-only changes, so we need to re-pin manually. Two rAFs: one for the
  // current frame's layout, one for the next frame in case other layout passes
  // (e.g. pan-to-center setting new pan) haven't committed yet.
  React.useLayoutEffect(() => {
    applyPinRef.current();
    requestAnimationFrame(() => applyPinRef.current());
  }, [isolated]);

  // Cancel any pending rAF on unmount
  React.useEffect(() => {
    return () => {
      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = 0;
      }
    };
  }, []);

  // Pin the live CraftJS-rendered DOM to our slot via position: fixed in
  // screen coords. The element stays in its React-managed parent so
  // reconciliation isn't broken; we just override its visual position.
  //
  // Re-runs on:
  //  - mount + containerId change
  //  - ph-canvas-tick from the surface (pan/zoom changed)
  //  - ResizeObserver on slot (slot height changed)
  //  - scroll/resize (slot screen position shifted)
  //  - savedPos change (item layout-effect calls applyPinRef.current())
  //  - pointermove (drag handler calls applyPinRef.current())
  //  - registry change (Container mounts/unmounts the live element)
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

  const displayName = (() => {
    try {
      const node = query.node(containerId).get();
      return (
        node?.data?.custom?.displayName ||
        node?.data?.props?.custom?.displayName ||
        node?.data?.displayName ||
        "Component"
      );
    } catch {
      return "Component";
    }
  })();

  const readZoom = () => {
    const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
    if (!surface) return 1;
    return parseFloat(getComputedStyle(surface).getPropertyValue("--ph-zoom")) || 1;
  };

  // After a drag finishes, slide our card off any sibling it landed on top of.
  // Returns a non-overlapping position close to `pos`. Operates in CANVAS
  // coords by reading each wrapper's full visible bbox (handle + slot) so the
  // drag-handle bar — which sits ABOVE the slot — is part of the no-overlap
  // zone too. Without this, dropping below another card lets your handle
  // visually overlap their slot, which is the bug.
  const HANDLE_TOTAL = HANDLE_HEIGHT + HANDLE_GAP;
  const measureCardBox = (
    wrapperEl: HTMLElement
  ): { x: number; y: number; w: number; h: number } | null => {
    const wrapperX = parseFloat(wrapperEl.style.getPropertyValue("--ph-item-x")) || 0;
    const wrapperY = parseFloat(wrapperEl.style.getPropertyValue("--ph-item-y")) || 0;
    // Find inner + slot (children[last] is inner; inner.firstElementChild is slot)
    const inner = (wrapperEl.children[wrapperEl.children.length - 1] as HTMLElement) || null;
    const slot = (inner?.firstElementChild as HTMLElement) || null;
    const slotW = slot?.offsetWidth || CANVAS_SLOT_W;
    const slotH = slot?.offsetHeight || CANVAS_SLOT_H;
    // Handle is the first child only when there's more than one (i.e., not
    // isolated). When present it sits at top: -HANDLE_TOTAL relative to the
    // slot, so the visible card extends upward by that much.
    const hasHandle = wrapperEl.children.length > 1;
    const handleEl = hasHandle ? (wrapperEl.children[0] as HTMLElement) : null;
    const handleW = handleEl?.offsetWidth || 0;
    const topPad = hasHandle ? HANDLE_TOTAL : 0;
    return {
      x: wrapperX,
      y: wrapperY - topPad,
      w: Math.max(slotW, handleW),
      h: slotH + topPad,
    };
  };

  const resolveOverlap = (pos: CanvasPos): CanvasPos => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return pos;
    // Build our bbox at the proposed position. Use the same handle/slot math
    // so we don't push half the gap in the wrong direction.
    const ourMeasured = measureCardBox(wrapper);
    if (!ourMeasured) return pos;
    const hasHandle = wrapper.children.length > 1;
    const ourTopPad = hasHandle ? HANDLE_TOTAL : 0;
    const ourW = ourMeasured.w;
    const ourH = ourMeasured.h;

    const surface = wrapper.closest(SURFACE_SELECTOR) as HTMLElement | null;
    if (!surface) return pos;
    const others: Array<{ x: number; y: number; w: number; h: number }> = [];
    surface.querySelectorAll<HTMLElement>("[data-ph-canvas-card='true']").forEach(el => {
      if (el === wrapper) return;
      const box = measureCardBox(el);
      if (box) others.push(box);
    });

    const PAD = 4;
    let { x, y } = pos;
    for (let iter = 0; iter < 8; iter++) {
      let collided = false;
      // Our visible bbox at proposed (x, y): top extends up by ourTopPad.
      const ax = x;
      const ay = y - ourTopPad;
      for (const o of others) {
        const overlapX = ax < o.x + o.w && ax + ourW > o.x;
        const overlapY = ay < o.y + o.h && ay + ourH > o.y;
        if (!overlapX || !overlapY) continue;
        collided = true;
        // Push in the smallest-distance direction. All math in visible-bbox
        // coords; convert back to slot coords (y) at the end of the branch.
        const pushRight = o.x + o.w + PAD - ax;
        const pushLeft = ax + ourW + PAD - o.x;
        const pushDown = o.y + o.h + PAD - ay;
        const pushUp = ay + ourH + PAD - o.y;
        const min = Math.min(pushRight, pushLeft, pushDown, pushUp);
        if (min === pushRight) x = o.x + o.w + PAD;
        else if (min === pushLeft) x = o.x - ourW - PAD;
        else if (min === pushDown) y = o.y + o.h + PAD + ourTopPad;
        else y = o.y - ourH - PAD + ourTopPad;
        break; // restart loop with updated x/y so a new collision is detected
      }
      if (!collided) break;
    }
    return { x, y };
  };

  // Drag handlers attach to window on pointerdown so a missed pointerup —
  // mouse released over an overlay menu, off the document, or after a
  // mid-drag re-render — can never strand the drag. setPointerCapture on the
  // handle isn't enough: capture is lost when the handle DOM re-renders or
  // when a higher-z overlay swallows the up event.
  const dragMoveListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const dragEndListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const dragBlurListenerRef = React.useRef<(() => void) | null>(null);
  const dragPointerIdRef = React.useRef<number | null>(null);

  const detachDragListeners = () => {
    if (dragMoveListenerRef.current) {
      window.removeEventListener("pointermove", dragMoveListenerRef.current);
      dragMoveListenerRef.current = null;
    }
    if (dragEndListenerRef.current) {
      window.removeEventListener("pointerup", dragEndListenerRef.current);
      window.removeEventListener("pointercancel", dragEndListenerRef.current);
      dragEndListenerRef.current = null;
    }
    if (dragBlurListenerRef.current) {
      window.removeEventListener("blur", dragBlurListenerRef.current);
      dragBlurListenerRef.current = null;
    }
    dragPointerIdRef.current = null;
  };

  const finishDrag = () => {
    detachDragListeners();
    if (!dragRef.current) return;
    if (moveRafRef.current) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = 0;
    }
    const flushed = pendingPosRef.current;
    pendingPosRef.current = null;
    const rawPos = flushed ?? livePosRef.current;
    // Auto-correct: if we dropped on top of another card, slide off in the
    // direction that requires the smallest movement.
    const finalPos = resolveOverlap(rawPos);
    livePosRef.current = finalPos;
    if (wrapperRef.current) {
      wrapperRef.current.style.setProperty("--ph-item-x", `${finalPos.x}px`);
      wrapperRef.current.style.setProperty("--ph-item-y", `${finalPos.y}px`);
    }
    applyPinRef.current();
    try {
      actions.setProp(containerId, (p: any) => {
        if (!p.custom) p.custom = {};
        p.custom[posKey] = finalPos;
      });
    } catch (err) {
      console.error("[ComponentCanvasItem] failed to commit pos", err);
    }
    dragRef.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    detachDragListeners();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore — window listeners cover this
    }
    dragPointerIdRef.current = e.pointerId;
    dragRef.current = {
      startCanvas: { ...livePosRef.current },
      startScreenX: e.clientX,
      startScreenY: e.clientY,
    };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      // Buttons released without our up firing (mouseup over an overlay,
      // browser quirk, etc.). Treat this move as the implicit end so the
      // drag can't keep tracking the cursor.
      if (ev.buttons === 0) {
        finishDrag();
        return;
      }
      const zoomNow = readZoom();
      const dx = (ev.clientX - dragRef.current.startScreenX) / zoomNow;
      const dy = (ev.clientY - dragRef.current.startScreenY) / zoomNow;
      pendingPosRef.current = {
        x: dragRef.current.startCanvas.x + dx,
        y: dragRef.current.startCanvas.y + dy,
      };
      if (moveRafRef.current) return;
      moveRafRef.current = requestAnimationFrame(() => {
        moveRafRef.current = 0;
        const next = pendingPosRef.current;
        pendingPosRef.current = null;
        if (!next || !wrapperRef.current) return;
        livePosRef.current = next;
        wrapperRef.current.style.setProperty("--ph-item-x", `${next.x}px`);
        wrapperRef.current.style.setProperty("--ph-item-y", `${next.y}px`);
        applyPinRef.current();
      });
    };
    const onEnd = (_ev: PointerEvent) => {
      finishDrag();
    };
    const onBlur = () => {
      // Window lost focus mid-drag (alt-tab, devtools steal, dropdown
      // grabbed focus). Commit whatever we have and stop tracking.
      finishDrag();
    };

    dragMoveListenerRef.current = onMove;
    dragEndListenerRef.current = onEnd;
    dragBlurListenerRef.current = onBlur;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onBlur);
  };

  const resizeMoveListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const resizeEndListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const resizeBlurListenerRef = React.useRef<(() => void) | null>(null);

  const detachResizeListeners = () => {
    if (resizeMoveListenerRef.current) {
      window.removeEventListener("pointermove", resizeMoveListenerRef.current);
      resizeMoveListenerRef.current = null;
    }
    if (resizeEndListenerRef.current) {
      window.removeEventListener("pointerup", resizeEndListenerRef.current);
      window.removeEventListener("pointercancel", resizeEndListenerRef.current);
      resizeEndListenerRef.current = null;
    }
    if (resizeBlurListenerRef.current) {
      window.removeEventListener("blur", resizeBlurListenerRef.current);
      resizeBlurListenerRef.current = null;
    }
  };

  const finishResize = () => {
    detachResizeListeners();
    document.body.style.cursor = "";
    const r = resizeRef.current;
    if (!r) return;
    const final = liveSizeRef.current;
    const wroteWidth = r.side !== "bottom";
    const wroteHeight = r.side !== "right";
    resizeRef.current = null;
    try {
      actions.setProp(containerId, (p: any) => {
        if (!p.custom) p.custom = {};
        const prev = p.custom.canvasSize || {};
        const next: CanvasSize = {};
        if (wroteWidth && final.w !== undefined) {
          next.w = Math.round(final.w);
        } else if (typeof prev.w === "number") {
          next.w = prev.w;
        }
        if (wroteHeight && final.h !== undefined) {
          next.h = Math.round(final.h);
        } else if (typeof prev.h === "number") {
          next.h = prev.h;
        }
        p.custom.canvasSize = next;
      });
    } catch (err) {
      console.error("[ComponentCanvasItem] failed to commit size", err);
    }
  };

  const onResizePointerDown = (side: ResizeSide) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    detachResizeListeners();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore — window listeners cover this
    }
    // Start from the currently displayed sizes, not the saved ones — this
    // matters in auto-fit mode where neither dim has a committed value yet.
    // Read the slot's actual rendered size and convert back to canvas units
    // (slot is inside the scaled inner wrapper, so offsetWidth/Height are
    // pre-scale canvas coords already).
    const slotEl = slotRef.current;
    const startW =
      liveSizeRef.current.w !== undefined
        ? liveSizeRef.current.w
        : slotEl
          ? Math.max(CANVAS_MIN_W, slotEl.offsetWidth - CARD_PAD * 2)
          : CANVAS_SLOT_W;
    const startH =
      liveSizeRef.current.h !== undefined
        ? liveSizeRef.current.h
        : slotEl
          ? slotEl.offsetHeight
          : CANVAS_MIN_H;
    resizeRef.current = {
      side,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startW,
      startH,
    };
    document.body.style.cursor =
      side === "right" ? "ew-resize" : side === "bottom" ? "ns-resize" : "nwse-resize";

    const onMove = (ev: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      if (ev.buttons === 0) {
        finishResize();
        return;
      }
      const zoomNow = readZoom();
      const dx = (ev.clientX - r.startScreenX) / zoomNow;
      const dy = (ev.clientY - r.startScreenY) / zoomNow;
      let nextW = liveSizeRef.current.w;
      let nextH = liveSizeRef.current.h;
      if (r.side === "right" || r.side === "corner") {
        nextW = Math.max(CANVAS_MIN_W, r.startW + dx);
      }
      if (r.side === "bottom" || r.side === "corner") {
        nextH = Math.max(CANVAS_MIN_H, r.startH + dy);
      }
      liveSizeRef.current = { w: nextW, h: nextH };
      if (innerRef.current && nextW !== undefined) {
        innerRef.current.style.width = `${nextW + CARD_PAD * 2}px`;
      }
      // applyPinRef writes the live component's width + slot height from
      // liveSizeRef and re-pins position in one frame.
      applyPinRef.current();
    };
    const onEnd = (_ev: PointerEvent) => {
      finishResize();
    };
    const onBlur = () => {
      finishResize();
    };

    resizeMoveListenerRef.current = onMove;
    resizeEndListenerRef.current = onEnd;
    resizeBlurListenerRef.current = onBlur;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onBlur);
  };

  const onIsolate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableIsolate) return;
    setCanvasIsolate(containerId);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableIsolate) return;
    setCanvasIsolate(containerId);
  };

  // Two-wrapper structure to keep chrome (drag handle) sharp at any zoom:
  //   outer  → translate only (pan + item*zoom). No scale → handle text/icons
  //            render at 1:1 device pixels.
  //   inner  → scale(zoom). The slot card + its background pattern + the live
  //            component all scale uniformly here.
  // Without this split, the handle bar sat inside a scaled wrapper and got
  // bitmap-scaled (blurry text + icons whenever zoom != 1).
  return (
    <div
      ref={wrapperRef}
      data-ph-canvas-card="true"
      className="pointer-events-none absolute"
      style={
        {
          left: 0,
          top: 0,
          willChange: "transform",
          "--ph-item-x": `${savedPos.x}px`,
          "--ph-item-y": `${savedPos.y}px`,
          transform:
            "translate3d(" +
            "calc(var(--ph-pan-x, 0px) + var(--ph-item-x, 0px) * var(--ph-zoom, 1))," +
            "calc(var(--ph-pan-y, 0px) + var(--ph-item-y, 0px) * var(--ph-zoom, 1))," +
            "0)",
        } as React.CSSProperties
      }
    >
      {!isolated && (
        <div
          className="text-base-content/60 pointer-events-auto absolute inline-flex w-fit items-center gap-1 px-1 text-xs font-medium select-none"
          style={{
            height: HANDLE_HEIGHT,
            top: -(HANDLE_HEIGHT + HANDLE_GAP),
            left: 0,
          }}
        >
          <div
            className="hover:text-base-content flex cursor-move items-center gap-1"
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={
              disableIsolate ? "Drag to move" : "Drag to move · Double-click to isolate"
            }
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
          >
            <TbGripVertical className="size-3.5 shrink-0 opacity-60" />
            <span className="truncate">{displayName}</span>
          </div>
          {!disableIsolate && (
            <button
              type="button"
              onClick={onIsolate}
              className="hover:text-base-content ml-1 flex size-5 cursor-pointer items-center justify-center rounded opacity-70 hover:opacity-100"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Isolate this component"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
              aria-label={`Isolate ${displayName}`}
            >
              <TbFocus2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
      <div
        ref={innerRef}
        style={{
          width: (savedSize.w ?? CANVAS_SLOT_W) + CARD_PAD * 2,
          transform: "scale(var(--ph-zoom, 1))",
          transformOrigin: "0 0",
        }}
      >
        <div
          ref={slotRef}
          className="border-base-300 rounded-lg border bg-white bg-[radial-gradient(#bfdbfe_1px,transparent_1px)] bg-size-[20px_20px] transition-opacity duration-150 dark:bg-[#0a0a0a] dark:bg-[radial-gradient(#3b82f680_1px,transparent_1px)]"
          style={{
            minHeight: 60 + CARD_PAD * 2,
            pointerEvents: "none",
            opacity: 0,
            position: "relative",
          }}
        >
          {!isolated && (
            <>
              {/* Right edge — width resize. Sits half-outside the slot so the
                cursor flips just before the visible border. */}
              <div
                onPointerDown={onResizePointerDown("right")}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: -RESIZE_BAND / 2,
                  width: RESIZE_BAND,
                  cursor: "ew-resize",
                  pointerEvents: "auto",
                  zIndex: 1,
                }}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Drag to resize width"
                data-tooltip-place="left"
                data-tooltip-offset={6}
              />
              {/* Bottom edge — height resize. */}
              <div
                onPointerDown={onResizePointerDown("bottom")}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -RESIZE_BAND / 2,
                  height: RESIZE_BAND,
                  cursor: "ns-resize",
                  pointerEvents: "auto",
                  zIndex: 1,
                }}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Drag to resize height"
                data-tooltip-place="top"
                data-tooltip-offset={6}
              />
              {/* Bottom-right corner — both at once. Higher z-index so it wins
                over the right/bottom bands in the overlap. */}
              <div
                onPointerDown={onResizePointerDown("corner")}
                style={{
                  position: "absolute",
                  right: -RESIZE_BAND,
                  bottom: -RESIZE_BAND,
                  width: RESIZE_BAND * 2,
                  height: RESIZE_BAND * 2,
                  cursor: "nwse-resize",
                  pointerEvents: "auto",
                  zIndex: 2,
                }}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Drag to resize"
                data-tooltip-place="top-end"
                data-tooltip-offset={6}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
