import React, { ReactNode, useEffect, useRef, useState } from "react";
import { TbX } from "react-icons/tb";
import { useFocusTrap } from "../../../utils/hooks/useAccessibility";

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

/**
 * Moveable dialog component that can be dragged around
 * Only closes when clicking the X button, not when clicking outside
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).closest('[data-draggable="true"]')
    ) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

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
        ref={(el) => { dialogRef.current = el; (focusTrapRef as any).current = el; }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="moveable-dialog-title"
        className="pagehub-sdk-root ph-panel-heavy pointer-events-auto absolute flex flex-col text-foreground"
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
          className="flex cursor-move select-none items-center justify-between border-b border-border bg-accent p-3 text-accent-foreground"
          data-draggable="true"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h2 id="moveable-dialog-title" className="text-lg font-bold">{title}</h2>
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
        <div className="flex-1 overflow-hidden rounded-b-lg bg-muted text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

export default MoveableDialog;
