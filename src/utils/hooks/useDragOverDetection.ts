import { useEffect, useRef, useState } from "react";

/**
 * Watches global drag events and reports whether the dragged item is
 * currently over the registered ref. Exposes the same `ref` callback the
 * caller wires onto the target element.
 *
 * Listens at the document level (not React JSX props) so the gesture stays
 * tracked even if the target re-renders or the pointer crosses overlays —
 * see `.claude/rules/drag-listeners.md`.
 */
export function useDragOverDetection<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const handleDragOver = (e: DragEvent) => {
      setIsDragOver(e.target === target);
    };
    const handleDragLeave = (e: DragEvent) => {
      if (e.target === target) setIsDragOver(false);
    };
    const handleDragEnd = () => setIsDragOver(false);

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragend", handleDragEnd);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  return { ref, isDragOver };
}
