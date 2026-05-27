import React, { ReactNode, useEffect, useRef } from "react";
import { TbX } from "react-icons/tb";
import { useFocusTrap } from "../../../utils/hooks/useAccessibility";
import { useOverlay } from "../../../registry/hooks/useOverlay";

interface LeftSidebarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Visible title, or dialog aria-label when hideHeader */
  title: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  /** Omit title row (children provide their own chrome, e.g. tabs). */
  hideHeader?: boolean;
  /** Default true. Set false when chrome above (e.g. toolbar) already exposes dismiss. */
  showCloseButton?: boolean;
  /** Top edge against toolbar / sibling chrome */
  showTopBorder?: boolean;
  children: ReactNode;
  width?: string;
  position?: "fixed" | "absolute";
  top?: string;
  /** Default true. Set false when the dialog should only close via the X button, Escape, or upstream state change (e.g. selected-node change). */
  closeOnOutsideClick?: boolean;
}

/**
 * Reusable left-aligned sidebar dialog component
 * Neutral header + base content area (aligned with toolbox / left panel chrome).
 *
 * @param isOpen - Controls visibility of the dialog
 * @param onClose - Callback when dialog should close (Escape key, outside click, or close button)
 * @param title - Header title text
 * @param icon - Optional icon to show before title
 * @param headerRight - Optional custom header right content (before optional close button)
 * @param hideHeader - When true, no title row; use `title` for aria-label on the dialog
 * @param showCloseButton - When false, omit header X (Escape and click-outside still call onClose)
 * @param showTopBorder - Border between this panel and the bar above (e.g. under editor header)
 * @param children - Dialog content
 * @param width - Optional custom width (default: 360px for fixed, 100% for absolute)
 * @param position - Position type: "fixed" (default, left sidebar) or "absolute" (full width under toolbar)
 * @param top - Top offset. Absolute default: `var(--editor-nav-height)` from `#toolbar` (measured icon bar).
 */
export function LeftSidebarDialog({
  isOpen,
  onClose,
  title,
  icon,
  headerRight,
  hideHeader = false,
  showCloseButton = true,
  showTopBorder = false,
  children,
  width,
  position = "fixed",
  top,
  closeOnOutsideClick = true,
}: LeftSidebarDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);

  // Set defaults based on position (absolute panels live in `#toolbar` and anchor under the measured icon row)
  const finalWidth = width || (position === "absolute" ? "100%" : "360px");
  const finalTop = top ?? (position === "absolute" ? "var(--editor-nav-height, 3rem)" : "40px");

  // Escape dismissal is handled by the registry dispatcher via the editor
  // overlay stack — the dialog title is unique enough to disambiguate, and
  // multiple LeftSidebarDialogs are not stacked in practice.
  useOverlay({
    id: `left-sidebar-dialog:${title}`,
    isOpen,
    onDismiss: onClose,
  });

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;
    if (!closeOnOutsideClick) return;

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
  }, [isOpen, onClose, closeOnOutsideClick]);

  if (!isOpen) return null;

  return (
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      {...(hideHeader
        ? { "aria-label": title }
        : { "aria-labelledby": "left-sidebar-dialog-title" })}
      className={`${position} bg-base-100 text-base-content left-0 z-9999 flex flex-col`}
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
        className={`border-base-300 flex h-full flex-col overflow-hidden border-r shadow-2xl${showTopBorder ? "border-base-300 border-t" : ""}`}
      >
        {!hideHeader ? (
          <div
            className={`border-base-300 bg-base-100 text-base-content flex items-center border-b px-3 py-2.5 ${
              headerRight || showCloseButton ? "justify-between" : "justify-start"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {icon && <span className="text-base-content/70 shrink-0 text-lg">{icon}</span>}
              <h2
                id="left-sidebar-dialog-title"
                className="truncate text-sm font-semibold tracking-tight"
              >
                {title}
              </h2>
            </div>
            {(headerRight || showCloseButton) && (
              <div className="flex shrink-0 items-center gap-1">
                {headerRight}
                {showCloseButton ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-base-content/50 hover:bg-base-200 hover:text-base-content flex items-center justify-center rounded-md p-1.5 transition-colors"
                    aria-label="Close"
                  >
                    <TbX className="size-5" />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Content */}
        <div className="bg-base-100 text-base-content flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
