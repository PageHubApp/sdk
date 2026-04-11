import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

const TOOLBAR_GAP_PX = 8; // matches mt-2 under text

/**
 * Portals children into #viewport or #device-tools-portal and positions the box
 * just below the anchor node's bounding rect (same scroll/resize behavior as node tools).
 */
export function PortalToolbarBelowNode({
  dom,
  portalTargetId = "viewport",
  children,
}: {
  dom: HTMLElement;
  portalTargetId?: string;
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

    ref.current.style.position = "absolute";
    ref.current.style.top = `${nodeRect.bottom - portalRect.top + portalTarget.scrollTop + TOOLBAR_GAP_PX}px`;
    ref.current.style.left = `${nodeRect.left - portalRect.left + portalTarget.scrollLeft}px`;
    ref.current.style.width = `${nodeRect.width}px`;
    ref.current.style.height = "auto";
  }, [dom, portalTarget]);

  useEffect(() => {
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

    return () => {
      if (viewport) viewport.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
      observer.disconnect();
      ro?.disconnect();
    };
  }, [dom, portalTarget, updatePosition]);

  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    <div ref={ref} className="pointer-events-none absolute z-110" style={{ position: "absolute" }}>
      {children}
    </div>,
    portalTarget
  );
}
