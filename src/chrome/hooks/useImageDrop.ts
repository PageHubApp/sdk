import { useCallback, useState } from "react";

export type ImageDropRejectReason = "bad_mime" | "too_large" | "over_max_count";

/** Match a file's MIME against an HTML-style `accept` value. */
function matchesAccept(fileType: string, accept: string): boolean {
  const a = accept.trim();
  if (!a || a === "*" || a === "*/*") return true;
  return a.split(",").some(raw => {
    const p = raw.trim();
    if (!p) return false;
    if (p === "*" || p === "*/*") return true;
    if (p.endsWith("/*")) return fileType.startsWith(p.slice(0, -1));
    if (p.endsWith("/")) return fileType.startsWith(p);
    return fileType === p;
  });
}

interface UseImageDropOptions {
  /** Called with accepted files */
  onFiles: (files: File[]) => void;
  /**
   * Accept filter. Supports the same shapes as HTML `<input accept>`:
   * - `"*"` or `"*\/*"` — accept everything
   * - single MIME prefix — `"image/"` (default)
   * - comma-separated MIME list with wildcards — `"image/png,video/*,application/pdf"`
   */
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
        if (!matchesAccept(f.type, accept)) {
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
