import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import ReactDOM from "react-dom";

const TOOLBAR_GAP_PX = 8; // matches mt-2 under text
const VIEWPORT_EDGE_PAD = 4;

/**
 * Portals children into #viewport or #device-tools-portal and positions the box
 * just below the anchor node's bounding rect (same scroll/resize behavior as node tools).
 * When `measureRef` is set, flips above the node if the toolbar would extend past the portal bottom.
 */
export function PortalToolbarBelowNode({
  dom,
  portalTargetId = "viewport",
  measureRef,
  children,
}: {
  dom: HTMLElement;
  portalTargetId?: string;
  /** Element whose height is used for vertical flip (e.g. inline toolbar root). */
  measureRef?: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById(portalTargetId));
  }, [portalTargetId]);

  const updatePosition = useCallback(() => {
    if (!ref.current || !dom || !portalTarget) return;

    const nodeRect = dom.getBoundingClientRect();
    const portalRect = portalTarget.getBoundingClientRect();
    const measureEl = measureRef?.current ?? null;
    const toolbarH = measureEl?.offsetHeight ?? 48;

    const spaceBelow = portalRect.bottom - nodeRect.bottom - VIEWPORT_EDGE_PAD;
    const spaceAbove = nodeRect.top - portalRect.top - VIEWPORT_EDGE_PAD;
    const needBelow = toolbarH + TOOLBAR_GAP_PX;
    const wouldClipBelow = needBelow > spaceBelow;
    const canPlaceAbove = spaceAbove >= needBelow + VIEWPORT_EDGE_PAD;

    const placeAbove = wouldClipBelow && canPlaceAbove;

    ref.current.style.position = "absolute";
    if (placeAbove) {
      ref.current.style.top = `${nodeRect.top - portalRect.top + portalTarget.scrollTop - TOOLBAR_GAP_PX - toolbarH}px`;
    } else {
      ref.current.style.top = `${nodeRect.bottom - portalRect.top + portalTarget.scrollTop + TOOLBAR_GAP_PX}px`;
    }
    ref.current.style.left = `${nodeRect.left - portalRect.left + portalTarget.scrollLeft}px`;
    ref.current.style.width = `${nodeRect.width}px`;
    ref.current.style.height = "auto";
  }, [dom, portalTarget, measureRef]);

  useLayoutEffect(() => {
    if (!dom || !portalTarget) return;

    updatePosition();

    const viewport = document.getElementById("viewport");
    let raf = 0;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updatePosition);
    };
    if (viewport) viewport.addEventListener("scroll", handleScroll);

    const observer = new MutationObserver(updatePosition);
    observer.observe(dom, { attributes: true, childList: false, subtree: true });

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updatePosition());
      ro.observe(dom);
    }

    let roMeasure: ResizeObserver | undefined;
    const attachMeasureRo = () => {
      const measured = measureRef?.current;
      if (!measured || typeof ResizeObserver === "undefined") return;
      roMeasure?.disconnect();
      roMeasure = new ResizeObserver(() => updatePosition());
      roMeasure.observe(measured);
    };
    attachMeasureRo();
    let rafAttach = 0;
    if (measureRef && !measureRef.current) {
      rafAttach = requestAnimationFrame(() => {
        updatePosition();
        attachMeasureRo();
      });
    }

    return () => {
      if (viewport) viewport.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafAttach);
      observer.disconnect();
      ro?.disconnect();
      roMeasure?.disconnect();
    };
  }, [dom, portalTarget, updatePosition, measureRef]);

  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    <div ref={ref} className="pointer-events-none absolute z-110" style={{ position: "absolute" }}>
      {children}
    </div>,
    portalTarget
  );
}
