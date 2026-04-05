// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { InlineRenderContext } from "./InlineRenderContext";
import { DeviceAtom, ViewAtom } from "./Viewport/atoms";
import { useAtomValue } from "@zedux/react";

/**
 * Checks if any ancestor of the node's DOM element has overflow clipping
 * (overflow-hidden, overflow-auto, overflow-scroll).
 * If so, inline tools will get clipped, so we need to portal them out.
 */
function hasOverflowAncestor(dom: HTMLElement | null): boolean {
  if (!dom) return false;

  let el: HTMLElement | null = dom;
  while (el) {
    // Stop at the viewport container — don't check beyond it
    if (el.id === "viewport") break;

    const style = getComputedStyle(el);
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;

    if (
      overflowX === "hidden" || overflowX === "auto" || overflowX === "scroll" ||
      overflowY === "hidden" || overflowY === "auto" || overflowY === "scroll"
    ) {
      return true;
    }

    el = el.parentElement;
  }

  return false;
}

/**
 * PortalToolsWrapper - Renders tools via createPortal to a target element,
 * positioned to overlay the node's bounding box.
 *
 * When in device mode, portals to #device-tools-portal (outside the zoomed frame).
 * Otherwise portals to #viewport.
 */
function PortalToolsWrapper({
  dom,
  children,
  portalTargetId = "viewport",
}: {
  dom: HTMLElement;
  children: React.ReactNode;
  portalTargetId?: string;
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
    ref.current.style.top = `${nodeRect.top - portalRect.top + portalTarget.scrollTop}px`;
    ref.current.style.left = `${nodeRect.left - portalRect.left + portalTarget.scrollLeft}px`;
    ref.current.style.width = `${nodeRect.width}px`;
    ref.current.style.height = `${nodeRect.height}px`;
  }, [dom, portalTarget]);

  useEffect(() => {
    if (!dom || !portalTarget) return;

    updatePosition();

    // Track scroll on viewport (content scrolls there)
    const viewport = document.getElementById("viewport");
    let raf;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updatePosition);
    };
    if (viewport) viewport.addEventListener("scroll", handleScroll);

    // Track DOM mutations (resize, style changes)
    const observer = new MutationObserver(updatePosition);
    observer.observe(dom, { attributes: true, childList: false, subtree: true });

    return () => {
      if (viewport) viewport.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [dom, portalTarget, updatePosition]);

  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    <div ref={ref} className="pointer-events-none absolute z-50" style={{ position: "absolute" }}>
      {children}
    </div>,
    portalTarget
  );
}

/**
 * InlineToolsRenderer - Shared component that renders node tools inline
 * instead of using portals. This eliminates position calculation lag.
 *
 * When the node is inside an overflow-clipped container, automatically
 * switches to portal rendering so tools don't get cut off.
 *
 * In device preview mode, always portals tools to #device-tools-portal
 * which sits outside the zoomed/clipped device frame.
 *
 * Usage in selectors:
 * 1. With craft config (requires selection):
 *    <InlineToolsRenderer craftComponent={Container} props={props} />
 *
 * 2. Always visible with custom children:
 *    <InlineToolsRenderer alwaysVisible>
 *      <AddSectionNodeController position="bottom" align="middle" />
 *    </InlineToolsRenderer>
 */
export const InlineToolsRenderer = ({
  craftComponent,
  props: selectorProps,
  alwaysVisible = false,
  children,
}: {
  craftComponent?: any;
  props?: any;
  alwaysVisible?: boolean;
  children?: React.ReactNode;
}) => {
  const { id, dom } = useNode((node) => ({
    dom: node.dom,
  }));
  const { enabled, isActive } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    isActive: query.getEvent("selected").contains(id),
  }));

  const device = useAtomValue(DeviceAtom);
  const view = useAtomValue(ViewAtom);
  const isDeviceMode = device && view === "mobile";

  // Don't render on server (SSR)
  const isClient = typeof window !== "undefined";

  // Get tools from craft config
  // Memoize to avoid recalculating on every render
  // MUST be called before any early returns to follow rules of hooks
  const tools = useMemo(
    () => craftComponent?.craft?.props?.tools?.(selectorProps) || [],
    [craftComponent, selectorProps]
  );

  // Check if node is inside an overflow-clipped ancestor
  const needsPortal = useMemo(() => {
    if (!isActive || !dom) return false;
    // In device mode, always portal to escape the zoomed/clipped frame
    if (isDeviceMode) return true;
    return hasOverflowAncestor(dom);
  }, [isActive, dom, isDeviceMode]);

  // Don't render if not in edit mode or on server
  if (!enabled || !isClient) {
    return null;
  }

  // Determine what to show based on selection state
  const showTools = isActive && tools.length > 0;
  const showChildren = alwaysVisible || isActive;

  // Don't render if nothing to show
  if (!showTools && !showChildren) {
    return null;
  }

  const content = (
    <InlineRenderContext.Provider value={true}>
      {/* Wrapper to shield editor UI from component CSS inheritance (like text-transform or CSS vars) */}
      <div className="pagehub-sdk-root contents font-sans text-base! normal-case not-italic leading-normal tracking-normal text-foreground" style={{ letterSpacing: 'normal', whiteSpace: 'normal', textIndent: '0' }}>
        {/* Always visible children (if any) */}
        {showChildren && children}

        {/* Selection-required tools */}
        {showTools &&
          tools.map((tool, index) => (
            <React.Fragment key={`inline-tool-${index}`}>{tool}</React.Fragment>
          ))}
      </div>
    </InlineRenderContext.Provider>
  );

  // In device mode or overflow-clipped: portal tools to viewport/device container
  if (needsPortal && dom) {
    return (
      <PortalToolsWrapper
        dom={dom}
        portalTargetId={isDeviceMode ? "device-tools-portal" : "viewport"}
      >
        {content}
      </PortalToolsWrapper>
    );
  }

  // Portal tools into the component's own DOM element
  if (dom) {
    return ReactDOM.createPortal(content, dom);
  }

  return content;
};
