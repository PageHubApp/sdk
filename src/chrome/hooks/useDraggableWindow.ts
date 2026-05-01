import { useRef, useState } from "react";
import { useDragGesture } from "./useDragGesture";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableWindowOptions {
  initialPosition?: Position;
  bounds?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * Hook to make a window/modal draggable. Handler is wired to `onPointerDown`
 * on the drag handle. Built on `useDragGesture` so missed pointerup, blur,
 * and unmount can never strand the drag.
 */
export const useDraggableWindow = (options: UseDraggableWindowOptions = {}) => {
  const { initialPosition = { x: 40, y: 40 }, bounds } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const elementStartPos = useRef<Position>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const { onPointerDown: handlePointerDown } = useDragGesture({
    onStart: (e) => {
      // Only drag if clicking directly on the handle, not on buttons inside.
      if ((e.target as HTMLElement).closest("button")) return false;
      e.preventDefault();
      elementStartPos.current = { ...position };
      setIsDragging(true);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    onMove: (_e, m) => {
      let newX = elementStartPos.current.x + m.dx;
      let newY = elementStartPos.current.y + m.dy;

      if (bounds) {
        if (bounds.left !== undefined) newX = Math.max(bounds.left, newX);
        if (bounds.top !== undefined) newY = Math.max(bounds.top, newY);
        if (windowRef.current) {
          const rect = windowRef.current.getBoundingClientRect();
          if (bounds.right !== undefined) {
            newX = Math.min(window.innerWidth - rect.width - bounds.right, newX);
          }
          if (bounds.bottom !== undefined) {
            newY = Math.min(window.innerHeight - rect.height - bounds.bottom, newY);
          }
        }
      }

      setPosition({ x: newX, y: newY });
    },
    onEnd: () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
  });

  return {
    position,
    isDragging,
    windowRef,
    handlePointerDown,
    setPosition,
  };
};
