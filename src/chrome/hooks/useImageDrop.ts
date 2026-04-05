import { useCallback, useState } from "react";

interface UseImageDropOptions {
  /** Called with accepted files */
  onFiles: (files: File[]) => void;
  /** MIME prefix filter — e.g. "image/" (default). Pass "*" to accept all files. */
  accept?: string;
  /** Max files to accept per drop (default: 10) */
  max?: number;
  /** Whether drop is disabled */
  disabled?: boolean;
}

/**
 * Shared hook for drag-and-drop file handling.
 * Returns props to spread on a container element + isDragOver state.
 */
export function useImageDrop({ onFiles, accept = "image/", max = 10, disabled = false }: UseImageDropOptions) {
  const [isDragOver, setIsDragOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only leave when exiting the container, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files)
      .filter(f => accept === "*" || f.type.startsWith(accept))
      .slice(0, max);

    if (files.length > 0) onFiles(files);
  }, [onFiles, max, disabled]);

  return {
    isDragOver,
    dropProps: { onDragOver, onDragEnter, onDragLeave, onDrop },
  };
}
