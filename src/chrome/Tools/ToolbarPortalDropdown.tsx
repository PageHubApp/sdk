import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

/**
 * ToolbarPortalDropdown - Renders dropdown content through a React portal
 * so it escapes overflow:hidden on parent containers (e.g. bento cards).
 *
 * Replaces the CSS group-hover pattern with JS-based hover tracking,
 * since portaled content isn't a CSS descendant of the trigger.
 * Auto-clamps to the **browser window** so dropdowns stay on-screen.
 * (Do not use #viewport — editor chrome like the header sits outside it; clamping
 *  to the canvas rect pulls menus away from their triggers.)
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

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

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left: number;
    if (align === "left") {
      left = rect.left;
    } else if (align === "right") {
      left = rect.right;
    } else {
      left = rect.left + rect.width / 2;
    }
    setPosition({
      top: rect.bottom + 4,
      left,
    });
  }, [align]);

  const openFromHover = useCallback(() => {
    clearHoverCloseTimer();
    updatePosition();
    setIsOpen(true);
  }, [clearHoverCloseTimer, updatePosition]);

  // Clamp horizontally within the visual window (fixed positioning = client coords).
  useLayoutEffect(() => {
    const el = dropdownRef.current;
    if (!el || !isOpen) return;

    const margin = 8;
    const vw = typeof window !== "undefined" ? window.innerWidth : 0;
    if (!vw) return;

    const elRect = el.getBoundingClientRect();

    let shiftX = 0;
    if (elRect.right > vw - margin) {
      shiftX = vw - margin - elRect.right;
    }
    if (elRect.left + shiftX < margin) {
      shiftX = margin - elRect.left;
    }

    if (shiftX !== 0) {
      el.style.left = `${position.left + shiftX}px`;
    }
  }, [isOpen, position]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  const translateX = align === "left" ? "0" : align === "right" ? "-100%" : "-50%";

  return (
    <div
      ref={triggerRef}
      role="presentation"
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
            ref={dropdownRef}
            role="menu"
            tabIndex={-1}
            className={`pagehub-sdk-root fixed z-99999 ${className}`}
            style={{
              top: position.top,
              left: position.left,
              transform: `translateX(${translateX})`,
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
