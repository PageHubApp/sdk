import { useCallback, useEffect, useRef, useState } from "react";

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
 * Hook to make a window/modal draggable
 * Returns position, drag handlers, and a ref for the draggable element
 */
export const useDraggableWindow = (options: UseDraggableWindowOptions = {}) => {
  const { initialPosition = { x: 40, y: 40 }, bounds } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const elementStartPos = useRef<Position>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only drag if clicking directly on the handle, not on buttons inside it
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }

      e.preventDefault();
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      elementStartPos.current = { ...position };
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      let newX = elementStartPos.current.x + deltaX;
      let newY = elementStartPos.current.y + deltaY;

      // Apply bounds if specified
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
    [isDragging, bounds]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      // Add visual feedback
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    isDragging,
    windowRef,
    handleMouseDown,
    setPosition,
  };
};
