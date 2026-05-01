import { useEffect, useState } from "react";
import type { MediaItem } from "../utils/media-helpers";

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

  useEffect(() => {
    if (!previewMedia) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewMedia(null);
      else if (e.key === "ArrowLeft") handlePreviewPrevious();
      else if (e.key === "ArrowRight") handlePreviewNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [previewMedia, filteredMedia]);

  return { previewMedia, setPreviewMedia, handlePreviewNext, handlePreviewPrevious };
}
