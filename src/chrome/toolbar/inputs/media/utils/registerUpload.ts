/**
 * One way to put an uploaded file into the media library, shared by every
 * upload surface (Media Manager upload / paste / save-URL-to-CDN, AI image
 * save, `ImageUploadInput`).
 */
import type { MediaLibraryStore } from "../../../../../utils/media/libraryStore";
import type { MediaItem, MediaMetadata } from "../../../../../utils/media/libraryTypes";
import type { UploadImageResult } from "../../../../../utils/media/upload";

const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "");

/** The library entry for a file `uploadImageToCdn` just stored. */
export function uploadedMediaItem(
  { mediaId, destination, deliveryURL, file, width, height }: UploadImageResult,
  metadata: MediaMetadata = {}
): MediaItem {
  const isR2 = destination === "r2";
  const fallbackName = isR2 ? mediaId : "Pasted Image";
  return {
    id: mediaId,
    type: isR2 ? "r2" : "cdn",
    uploadedAt: Date.now(),
    metadata: {
      title: file.name || fallbackName,
      alt: file.name ? stripExtension(file.name) : fallbackName,
      size: file.size,
      ...(isR2 ? { contentType: file.type, deliveryURL } : {}),
      ...(width && height ? { dimensions: { width, height, aspectRatio: width / height } } : {}),
      ...metadata,
    },
  };
}

/**
 * A host store's site-scoped upload confirm already registered the row, so
 * revalidate and patch in what only the client knows (dimensions, title, alt).
 * When the entry isn't there (the tree store, or an upload path the host
 * doesn't register), add it instead.
 */
export async function registerUploadedMedia(
  library: Pick<MediaLibraryStore, "refresh" | "update" | "add">,
  item: MediaItem
): Promise<MediaItem> {
  await library.refresh();
  try {
    return await library.update(item.id, { type: item.type, metadata: item.metadata });
  } catch {
    const [added] = await library.add([item]);
    return added ?? item;
  }
}
