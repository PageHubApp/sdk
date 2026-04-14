import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { TbX } from "react-icons/tb";
import { useDraggableWindow } from "../hooks/useDraggableWindow";
import { useResizable } from "../hooks/useResizable";
import { useFocusTrap } from "../../utils/hooks/useAccessibility";

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  /** Show a backdrop overlay behind the panel */
  backdrop?: boolean;
  /** useResizable options */
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  edges?: ResizeEdge[];
  /** Initial position — defaults to centered */
  initialPosition?: { x: number; y: number };
  /** z-index for the panel (default 999) */
  zIndex?: number;
  children: React.ReactNode;
}

export function FloatingPanel({
  isOpen,
  onClose,
  title,
  icon,
  backdrop = false,
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth = 300,
  maxWidth = 1200,
  minHeight = 300,
  maxHeight = Math.round(typeof window !== "undefined" ? window.innerHeight * 0.95 : 800),
  edges = ["e", "s", "se"],
  initialPosition,
  zIndex = 999,
  children,
}: FloatingPanelProps) {
  const defaultPos = initialPosition ?? {
    x: Math.round(
      (typeof window !== "undefined" ? window.innerWidth : 1200) / 2 - defaultWidth / 2
    ),
    y: 40,
  };

  const focusTrapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const { position, isDragging, windowRef, handleMouseDown } = useDraggableWindow({
    initialPosition: defaultPos,
    bounds: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const { width, height, handleProps } = useResizable({
    storageKey,
    defaultWidth,
    defaultHeight,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    edges,
  });

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {backdrop && (
        <div
          className="pagehub-sdk-root ph-modal-backdrop"
          style={{ zIndex: zIndex - 1 }}
          onClick={onClose}
        />
      )}

      <div
        ref={el => {
          (windowRef as any).current = el;
          (focusTrapRef as any).current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pagehub-sdk-root ph-modal-surface pointer-events-auto fixed overflow-hidden"
        style={{ top: position.y, left: position.x, width, height, zIndex }}
      >
        {(edges as string[]).map(e =>
          (handleProps as any)[e] ? <div key={e} {...(handleProps as any)[e]} /> : null
        )}

        <div className="flex h-full flex-col">
          {/* Header — drag handle */}
          <div
            role="presentation"
            aria-hidden="true"
            onMouseDown={handleMouseDown}
            className={`border-base-300 bg-accent text-accent-content flex items-center justify-between border-b px-3 py-1.5 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {icon}
              <span className="text-xs font-semibold">{title}</span>
            </div>
            <button
              onClick={onClose}
              className="text-accent-content hover:bg-accent-content/10 rounded p-0.5 transition-colors"
            >
              <TbX className="size-3.5" />
            </button>
          </div>

          {children}
        </div>
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
