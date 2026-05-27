import { useEffect, useState } from "react";
import type { MediaItem } from "../utils/media-helpers";
import { useOverlay } from "../../../../../registry/hooks/useOverlay";

export function useMediaPreviewState(filteredMedia: MediaItem[]) {
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);

  const handlePreviewNext = () => {
    if (!previewMedia) return;
    const idx = filteredMedia.findIndex(m => m.id === previewMedia);
    if (idx < filteredMedia.length - 1) setPreviewMedia(filteredMedia[idx + 1].id);
  };

  const handlePreviewPrevious = () => {
    if (!previewMedia) return;
    const idx = filteredMedia.findIndex(m => m.id === previewMedia);
    if (idx > 0) setPreviewMedia(filteredMedia[idx - 1].id);
  };

  // Arrow Left/Right stay inline — they're picker UX, not overlay dismissal.
  useEffect(() => {
    if (!previewMedia) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePreviewPrevious();
      else if (e.key === "ArrowRight") handlePreviewNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [previewMedia, filteredMedia]);

  // Escape dismissal: registry overlay stack.
  useOverlay({
    id: "media-preview",
    isOpen: previewMedia != null,
    onDismiss: () => setPreviewMedia(null),
  });

  return { previewMedia, setPreviewMedia, handlePreviewNext, handlePreviewPrevious };
}
