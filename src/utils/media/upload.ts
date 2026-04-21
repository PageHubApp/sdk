import { getImageDimensionsFromFile } from "../imageDimensions";
import { MediaUploadError } from "./errors";
import { prepareImageForUpload } from "./preprocess";
import { getMediaUploadHandler } from "./registry";

export { MediaUploadError } from "./errors";
export type { MediaUploadErrorCode } from "./errors";
export { parseApiMediaGetError, parseCloudflareError } from "./errors";
export { prepareImageForUpload } from "./preprocess";
export {
  registerMediaUploadHandler,
  getMediaUploadHandler,
  type MediaUploadHandler,
  type MediaUploadHandlerInput,
  type MediaUploadHandlerResult,
} from "./registry";

export interface UploadImageResult {
  mediaId: string;
  /** Post-preprocessing file that was actually sent to the host CDN. */
  file: File;
  width?: number;
  height?: number;
}

export interface UploadImageOptions {
  /** Skip `prepareImageForUpload`. Use when the caller already shaped the file
   *  (e.g. the image cropper outputs exact dimensions). */
  skipPreprocess?: boolean;
  /** Abort mid-flight via AbortController. */
  signal?: AbortSignal;
  /** Extract and return image dimensions. Default true for images. */
  includeDimensions?: boolean;
}

/**
 * Shared upload entry point used by every SDK editor surface that needs to
 * put an image on the host's CDN: Media Manager, image crop, AI generation,
 * standalone picker, and the host's own chat assistant.
 *
 * Pipeline:
 *   1. `prepareImageForUpload` (AVIF→JPEG + resize) — skippable per-call.
 *   2. Delegate network work to the registered {@link MediaUploadHandler}.
 *   3. Best-effort dimension extraction.
 *
 * Throws {@link MediaUploadError} on every failure; callers surface
 * `err.message` to the user.
 */
export async function uploadImageToCdn(
  file: File,
  opts: UploadImageOptions = {}
): Promise<UploadImageResult> {
  const handler = getMediaUploadHandler();
  if (!handler) {
    throw new MediaUploadError(
      "unknown",
      "No media upload handler registered — call registerMediaUploadHandler() at app boot"
    );
  }

  const prepared = opts.skipPreprocess ? file : await prepareImageForUpload(file);

  const { mediaId } = await handler({ file: prepared, signal: opts.signal });
  if (!mediaId) {
    throw new MediaUploadError("unknown", "Media upload handler returned no mediaId");
  }

  let width: number | undefined;
  let height: number | undefined;
  if (opts.includeDimensions !== false && prepared.type.startsWith("image/")) {
    try {
      const dims = await getImageDimensionsFromFile(prepared);
      width = dims.width;
      height = dims.height;
    } catch {
      /* dimensions best-effort */
    }
  }

  return { mediaId, file: prepared, width, height };
}
