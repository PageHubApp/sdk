import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { OVERLAY_Z_TOOLBAR_DROPDOWN } from "../overlays/overlayZIndex";
import { useAnchoredPopover } from "../overlays/useAnchoredPopover";

/**
 * ToolbarPortalDropdown - Renders dropdown content through a React portal
 * so it escapes overflow:hidden on parent containers (e.g. bento cards).
 *
 * Uses Floating UI (`useAnchoredPopover`) for window-bound flip/shift (not `#viewport`,
 * so editor chrome outside the canvas does not pull menus away from triggers).
 */
export const ToolbarPortalDropdown = ({
  trigger,
  children,
  className = "",
  align = "center", // "center" | "left" | "right"
  openOn = "click",
  hoverCloseDelayMs = 180,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: "center" | "left" | "right";
  openOn?: "click" | "hover";
  hoverCloseDelayMs?: number;
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const placement = align === "left" ? "bottom-start" : align === "right" ? "bottom-end" : "bottom";

  const floating = useAnchoredPopover({
    open: isOpen,
    placement,
    mainAxisOffset: 4,
    dismiss: {
      onDismiss: () => setIsOpen(false),
    },
  });

  const setReferenceNode = useCallback(
    (node: HTMLDivElement | null) => {
      triggerRef.current = node;
      floating.refs.setReference(node);
    },
    [floating.refs]
  );

  useLayoutEffect(() => {
    if (isOpen) floating.update();
  }, [isOpen, floating]);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      hoverCloseTimerRef.current = null;
    }, hoverCloseDelayMs);
  }, [clearHoverCloseTimer, hoverCloseDelayMs]);

  useEffect(() => () => clearHoverCloseTimer(), [clearHoverCloseTimer]);

  const openFromHover = useCallback(() => {
    clearHoverCloseTimer();
    setIsOpen(true);
  }, [clearHoverCloseTimer]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isOpen]);

  return (
    <div
      ref={setReferenceNode}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      className={openOn === "hover" ? "inline-flex" : undefined}
      onClick={openOn === "click" ? handleToggle : undefined}
      onMouseEnter={openOn === "hover" ? openFromHover : undefined}
      onMouseLeave={openOn === "hover" ? scheduleHoverClose : undefined}
    >
      {trigger}
      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={floating.refs.setFloating}
            role="menu"
            tabIndex={-1}
            className={`pagehub-sdk-root ${className}`}
            style={{
              ...floating.floatingStyles,
              zIndex: OVERLAY_Z_TOOLBAR_DROPDOWN,
            }}
            onClick={e => e.stopPropagation()}
            onMouseEnter={openOn === "hover" ? clearHoverCloseTimer : undefined}
            onMouseLeave={openOn === "hover" ? scheduleHoverClose : undefined}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
};
