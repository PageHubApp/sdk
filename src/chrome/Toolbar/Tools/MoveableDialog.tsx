import React, { ReactNode, useEffect } from "react";
import { TbX } from "react-icons/tb";
import { useFocusTrap } from "../../../utils/hooks/useAccessibility";
import { useDraggableWindow } from "../../hooks/useDraggableWindow";

interface MoveableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  width?: string;
  height?: string;
  initialPosition?: { x: number; y: number };
}

const VIEW_MARGIN = 8;

/**
 * Moveable dialog that can be dragged around the window.
 * Only closes from the X button (not outside click). Position is clamped to the viewport.
 */
export function MoveableDialog({
  isOpen,
  onClose,
  title,
  icon,
  headerRight,
  children,
  width = "320px",
  height = "500px",
  initialPosition = { x: 100, y: 100 },
}: MoveableDialogProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const { position, isDragging, windowRef, handleMouseDown } = useDraggableWindow({
    initialPosition,
    bounds: {
      top: VIEW_MARGIN,
      left: VIEW_MARGIN,
      right: VIEW_MARGIN,
      bottom: VIEW_MARGIN,
    },
  });

  const setDialogRef = (el: HTMLDivElement | null) => {
    (windowRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    (focusTrapRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

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

  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-9999" style={{ pointerEvents: "none" }}>
      <div
        ref={setDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="moveable-dialog-title"
        className="pagehub-sdk-root ph-panel-heavy pointer-events-auto absolute flex flex-col text-base-content"
        style={{
          width,
          height,
          left: position.x,
          top: position.y,
          maxWidth: "90vw",
          maxHeight: "90vh",
        }}
      >
        {/* Header - Draggable */}
        <div
          role="presentation"
          aria-hidden="true"
          className={`flex select-none items-center justify-between border-b border-base-300 bg-accent p-3 text-accent-content ${
            isDragging ? "cursor-grabbing" : "cursor-move"
          }`}
          data-draggable="true"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h2 id="moveable-dialog-title" className="text-lg font-bold">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {headerRight}
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg p-1 text-accent-content transition-colors hover:bg-accent-content/10"
              aria-label="Close"
            >
              <TbX />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden rounded-b-lg bg-neutral text-neutral-content">
          {children}
        </div>
      </div>
    </div>
  );
}
