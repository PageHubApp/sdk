import React, { useEffect, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { TbX } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
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
  /** When false, backdrop does not close the panel on click (backdrop still blocks pointer events). Default true. */
  backdropCloseOnClick?: boolean;
  /** Extra classes for the backdrop (e.g. `ph-modal-backdrop--light`). */
  backdropClassName?: string;
  /** useResizable options */
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  edges?: ResizeEdge[];
  /** Persist resized size to storage. Default true. Pass false for ephemeral popovers. */
  persistSize?: boolean;
  /** Initial position — defaults to centered */
  initialPosition?: { x: number; y: number };
  /**
   * Snap the panel to a screen edge when opened or when this value changes.
   * Uses current panel width (e.g. after persisted resize). Omit to keep free placement / `initialPosition` only.
   */
  dockToEdge?: "left" | "right";
  /** Header close button side. Default: right. */
  closeButtonSide?: "left" | "right";
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
  backdropCloseOnClick = true,
  backdropClassName,
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth = 300,
  maxWidth = 1200,
  minHeight = 300,
  maxHeight = Math.round(typeof window !== "undefined" ? window.innerHeight * 0.95 : 800),
  edges = ["e", "s", "se"],
  initialPosition,
  dockToEdge,
  closeButtonSide = "right",
  zIndex = 999,
  persistSize = true,
  children,
}: FloatingPanelProps) {
  const [viewport, setViewport] = React.useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const viewportInset = 12;
  const boundedMaxWidth = Math.max(180, Math.min(maxWidth, viewport.width - viewportInset * 2));
  const boundedMaxHeight = Math.max(180, Math.min(maxHeight, viewport.height - viewportInset * 2));

  const defaultPos = (() => {
    if (initialPosition) return initialPosition;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    if (dockToEdge === "right") {
      return { x: Math.max(8, vw - defaultWidth - 12), y: 40 };
    }
    if (dockToEdge === "left") {
      return { x: 8, y: 40 };
    }
    return {
      x: Math.round(vw / 2 - defaultWidth / 2),
      y: 40,
    };
  })();

  const focusTrapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const { position, isDragging, windowRef, handleMouseDown, setPosition } = useDraggableWindow({
    initialPosition: defaultPos,
    bounds: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const { width, height, handleProps } = useResizable({
    storageKey,
    defaultWidth,
    defaultHeight,
    minWidth,
    maxWidth: boundedMaxWidth,
    minHeight,
    maxHeight: boundedMaxHeight,
    edges,
    persist: persistSize,
  });

  useLayoutEffect(() => {
    if (!isOpen || !dockToEdge) return;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const x = dockToEdge === "right" ? Math.max(8, vw - width - 12) : 8;
    setPosition({ x, y: 40 });
  }, [isOpen, dockToEdge, setPosition, width, viewport.width]);

  useLayoutEffect(() => {
    if (!isOpen || dockToEdge) return;
    setPosition(prev => ({
      x: Math.max(0, Math.min(prev.x, Math.max(0, viewport.width - width))),
      y: Math.max(0, Math.min(prev.y, Math.max(0, viewport.height - height))),
    }));
  }, [dockToEdge, height, isOpen, setPosition, viewport.height, viewport.width, width]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen]);

  if (!isOpen) return null;

  const closeButton = (
    <button
      onClick={onClose}
      className="text-accent-content hover:bg-accent-content/10 rounded p-0.5 transition-colors"
    >
      <TbX className="size-3.5" />
    </button>
  );

  const titleNode = (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs font-semibold">{title}</span>
    </div>
  );

  return ReactDOM.createPortal(
    <>
      {backdrop && (
        <div
          className={twMerge("pagehub-sdk-root ph-modal-backdrop", backdropClassName)}
          style={{ zIndex: zIndex - 1 }}
          onClick={backdropCloseOnClick ? onClose : undefined}
          aria-hidden="true"
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
            className={`text-base-content flex items-center justify-between px-3 py-1.5 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {closeButtonSide === "left" ? (
              <>
                <div className="flex min-w-0 items-center gap-2">
                  {closeButton}
                  {titleNode}
                </div>
                <span className="size-5" aria-hidden="true" />
              </>
            ) : (
              <>
                {titleNode}
                {closeButton}
              </>
            )}
          </div>

          {children}
        </div>
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
