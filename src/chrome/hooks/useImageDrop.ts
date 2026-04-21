import { useCallback, useState } from "react";

export type ImageDropRejectReason = "bad_mime" | "too_large" | "over_max_count";

interface UseImageDropOptions {
  /** Called with accepted files */
  onFiles: (files: File[]) => void;
  /** MIME prefix filter — e.g. "image/" (default). Pass "*" to accept all files. */
  accept?: string;
  /** Max files to accept per drop (default: 10) */
  max?: number;
  /** Per-file size ceiling in bytes — rejected files never reach onFiles. */
  maxSizeBytes?: number;
  /** Called once per rejected file so callers can surface a toast / inline error. */
  onRejected?: (file: File, reason: ImageDropRejectReason) => void;
  /** Whether drop is disabled */
  disabled?: boolean;
}

/**
 * Shared hook for drag-and-drop file handling.
 * Returns props to spread on a container element + isDragOver state.
 */
export function useImageDrop({
  onFiles,
  accept = "image/",
  max = 10,
  maxSizeBytes,
  onRejected,
  disabled = false,
}: UseImageDropOptions) {
  const [isDragOver, setIsDragOver] = useState(false);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only leave when exiting the container, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const accepted: File[] = [];
      for (const f of Array.from(e.dataTransfer.files)) {
        if (accept !== "*" && !f.type.startsWith(accept)) {
          onRejected?.(f, "bad_mime");
          continue;
        }
        if (maxSizeBytes && f.size > maxSizeBytes) {
          onRejected?.(f, "too_large");
          continue;
        }
        if (accepted.length >= max) {
          onRejected?.(f, "over_max_count");
          continue;
        }
        accepted.push(f);
      }

      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles, accept, max, maxSizeBytes, onRejected, disabled]
  );

  return {
    isDragOver,
    dropProps: { onDragOver, onDragEnter, onDragLeave, onDrop },
  };
}
