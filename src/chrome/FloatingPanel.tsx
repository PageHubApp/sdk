import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom";
import { TbX } from "react-icons/tb";
import { useDraggableWindow } from "./hooks/useDraggableWindow";
import { useResizable } from "./hooks/useResizable";

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
    x: Math.round((typeof window !== "undefined" ? window.innerWidth : 1200) / 2 - defaultWidth / 2),
    y: 40,
  };

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
    <AnimatePresence>
      {backdrop && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/75 backdrop-blur-sm"
          style={{ zIndex: zIndex - 1 }}
          onClick={onClose}
        />
      )}

      <motion.div
        key="panel"
        ref={windowRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="pointer-events-auto fixed overflow-hidden rounded-lg border border-border bg-background shadow-xl"
        style={{ top: position.y, left: position.x, width, height, zIndex }}
      >
        {(edges as string[]).map(e => (handleProps as any)[e] ? <div key={e} {...(handleProps as any)[e]} /> : null)}

        <div className="flex h-full flex-col">
          {/* Header — drag handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`flex items-center justify-between border-b border-border bg-accent px-3 py-1.5 text-accent-foreground ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {icon}
              <span className="text-xs font-semibold">{title}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded p-0.5 text-accent-foreground transition-colors hover:bg-accent-foreground/10"
            >
              <TbX className="size-3.5" />
            </button>
          </div>

          {children}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.querySelector(".pagehub-sdk-root") || document.body,
  );
}
