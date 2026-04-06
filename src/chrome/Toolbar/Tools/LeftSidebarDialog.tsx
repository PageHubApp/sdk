import React, { ReactNode, useEffect, useRef } from "react";
import { TbX } from "react-icons/tb";
import { useFocusTrap } from "../../../utils/hooks/useAccessibility";

interface LeftSidebarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  width?: string;
  position?: "fixed" | "absolute";
  top?: string;
}

/**
 * Reusable left-aligned sidebar dialog component
 * Matches the Design System sidebar style
 *
 * @param isOpen - Controls visibility of the dialog
 * @param onClose - Callback when dialog should close (Escape key, outside click, or close button)
 * @param title - Header title text
 * @param icon - Optional icon to show before title
 * @param headerRight - Optional custom header right content (default: close button)
 * @param children - Dialog content
 * @param width - Optional custom width (default: 360px for fixed, 100% for absolute)
 * @param position - Position type: "fixed" (default, left sidebar) or "absolute" (full width under toolbar)
 * @param top - Top position (default: 0 for fixed, 40px for absolute)
 */
export function LeftSidebarDialog({
  isOpen,
  onClose,
  title,
  icon,
  headerRight,
  children,
  width,
  position = "fixed",
  top,
}: LeftSidebarDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);

  // Set defaults based on position
  const finalWidth = width || (position === "absolute" ? "100%" : "360px");
  const finalTop = top || (position === "absolute" ? "40px" : "40px");

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Don't close if clicking inside this modal
      if (modalRef.current && !modalRef.current.contains(target)) {
        // Don't close if clicking on another modal/dialog (like MediaManagerModal)
        const isClickOnModal = (target as HTMLElement).closest(
          '[role="dialog"], .modal, [data-modal="true"]'
        );
        if (isClickOnModal) return;

        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="left-sidebar-dialog-title"
      className={`${position} left-0 z-9999 flex flex-col bg-background text-foreground`}
      style={{
        width: finalWidth,
        top: finalTop,
        height: position === "fixed" ? `calc(100vh - ${finalTop})` : undefined,
        bottom: position === "absolute" ? "0" : undefined,
        pointerEvents: position === "absolute" ? "auto" : undefined,
      }}
    >
      <div
        ref={modalRef}
        className="flex h-full flex-col overflow-hidden border-r border-border shadow-2xl"
      >
        {/* Header - Matches Design System style */}
        <div className="flex items-center justify-between border-b border-border bg-accent p-3 text-accent-foreground">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h2 id="left-sidebar-dialog-title" className="text-lg font-bold">{title}</h2>
          </div>
          <div className="flex items-center gap-1">
            {headerRight}
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg p-1 text-accent-foreground transition-colors hover:bg-accent-foreground/10"
              aria-label="Close"
            >
              <TbX />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-muted text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default LeftSidebarDialog;
