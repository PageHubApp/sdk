import { MediaUploadError } from "./errors";
import { convertAvifToJpeg, resizeImageIfNeeded } from "./transform";

/**
 * Client-side image preparation before upload.
 *
 * Steps (in order):
 * 1. Convert AVIF → JPEG (Cloudflare Images 415s AVIFs despite spec).
 * 2. Resize if wider than `maxWidth` (default 2680px) to sidestep CF's
 *    dimension and size ceilings.
 *
 * Non-image files pass through unchanged.
 *
 * Throws a typed {@link MediaUploadError} with `code: "bad_mime"` when
 * AVIF-→-JPEG conversion fails (browser can't decode AVIF, etc.) — callers
 * surface the message; there's no useful retry path since manual conversion
 * would run the same failed decoder. Resize failures are swallowed (we fall
 * back to the original file) because CF will still accept it, just without
 * our dimension hint.
 */
export async function prepareImageForUpload(
  file: File,
  opts: { maxWidth?: number } = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let prepared = file;
  if (file.type === "image/avif") {
    try {
      prepared = await convertAvifToJpeg(file);
    } catch (e) {
      throw new MediaUploadError(
        "bad_mime",
        "AVIF upload failed — your browser can't decode AVIF for conversion. Try a JPEG or PNG."
      );
    }
  }

  try {
    prepared = await resizeImageIfNeeded(prepared, opts.maxWidth ?? 2680);
  } catch {
    /* keep prepared as-is */
  }

  return prepared;
}
