import { getCdnUrl } from "../../../../utils/cdn";
import { MediaUploadError, uploadImageToCdn } from "../../../../utils/media/upload";
import { clampCrop, type PixelCrop } from "./cropMath";

export type CropSaveMode = "copy" | "replace";

export interface SaveCropArgs {
  /** The library item being cropped (`MediaItem`-shaped; hosts pass their own). */
  media: any;
  /** In the natural pixels of the image at `cropSourceUrl(media)`. */
  crop: PixelCrop;
  mode: CropSaveMode;
  /** Cancels the upload mid-flight. */
  signal?: AbortSignal;
}

/**
 * Widest delivery we ask Cloudflare Images for. Uploads are capped at 2680px
 * (`prepareImageForUpload` / `prepareImageBuffer`), and `fit=scale-down` never
 * enlarges, so this returns the stored original at its own size. The named
 * `public` variant does NOT: it is downscaled (a 2680px upload comes back 1151px).
 */
export const CROP_SOURCE_MAX_WIDTH = 4096;

/** Cloudflare Images' direct_upload ceiling, on every plan. */
export const CF_IMAGES_MAX_BYTES = 10 * 1024 * 1024;

/** JPEG quality for opaque crops — the same 0.92 the AVIF→JPEG transcode uses. */
export const CROP_JPEG_QUALITY = 0.92;

export type CropOutputType = "image/png" | "image/jpeg";

/** Library items with no `type` are CDN images (see `getMediaContent`). */
function isCdnMedia(media: any): boolean {
  return !!media && (media.type === "cdn" || media.type == null);
}

/**
 * URL of the full-size original to crop from (not a downscaled preview).
 * Load it with `crossOrigin="anonymous"` — imagedelivery.net answers
 * `Access-Control-Allow-Origin: *`, so the canvas stays readable. The crop's
 * pixel coordinates are in THIS image's natural size, so the UI must show
 * this same URL.
 */
export function cropSourceUrl(media: any): string | null {
  if (!media) return null;
  if (media.type === "url") return media.metadata?.url || null;
  if (!isCdnMedia(media)) return null; // svg, r2, anything unknown
  const id = media.cdnId || media.id;
  if (!id) return null;
  return getCdnUrl(id, { width: CROP_SOURCE_MAX_WIDTH, fit: "scale-down", quality: 100 }) || null;
}

/**
 * Replace keeps the item's id and points it at the cropped upload via `cdnId`.
 * Only CDN items can do that through the hosts' `update(id, { cdnId, metadata })`:
 * a `type: "url"` item would also need `type` flipped to "cdn", which the hosts
 * don't forward yet — offer "copy" only for those.
 */
export function canReplaceInPlace(media: any): boolean {
  return isCdnMedia(media);
}

/** "Beach (cropped)" — name = title, else name, else id. */
export function cropTitle(media: any): string {
  return `${mediaName(media)} (cropped)`;
}

/** "beach-cropped.jpg" — the upload's file name; extension follows the output type. */
export function cropFileName(media: any, type: CropOutputType): string {
  const base =
    mediaName(media)
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image";
  return `${base}-cropped.${type === "image/png" ? "png" : "jpg"}`;
}

/** Whether the source is a PNG we know of (stored content type, or the URL / name says so). */
export function isPngSource(media: any): boolean {
  const meta = media?.metadata || {};
  if (meta.contentType === "image/png") return true;
  const named = [meta.url, meta.title, media?.name].filter(Boolean).join(" ");
  return /\.png(\?|#|\s|$)/i.test(named);
}

/** Any pixel not fully opaque in RGBA data (`ImageData.data`). */
export function hasTransparency(rgba: ArrayLike<number>): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 255) return true;
  return false;
}

/**
 * PNG when the crop has see-through pixels or the source was a PNG (keeps
 * flat graphics lossless); JPEG otherwise. Not WebP: Safari's `toBlob` can't
 * encode it and silently hands back a PNG, and Cloudflare re-encodes to
 * AVIF/WebP on delivery anyway.
 */
export function cropOutputType(opts: {
  sourceIsPng: boolean;
  transparent: boolean;
}): CropOutputType {
  return opts.transparent || opts.sourceIsPng ? "image/png" : "image/jpeg";
}

/**
 * The library item handed to the host's `onSave`.
 * - copy: a new item (new id) in the same folder, flagged `isVariant`.
 * - replace: the same id with `cdnId` = the crop, so every page using it updates.
 *   Metadata merges on `update`, so fields from a previous type are cleared with
 *   `undefined`, the same as Media Manager's Replace.
 */
export function buildCroppedItem(args: {
  media: any;
  mode: CropSaveMode;
  /** The uploaded crop's media id. */
  mediaId: string;
  width: number;
  height: number;
  file: { size: number; type: string };
  now?: number;
}): any {
  const { media, mode, mediaId, width, height, file } = args;
  const meta = media?.metadata || {};
  const dimensions = { width, height, aspectRatio: width / height };

  if (mode === "replace") {
    return {
      ...media,
      type: "cdn",
      cdnId: mediaId,
      metadata: {
        ...meta,
        size: file.size,
        contentType: file.type,
        dimensions,
        url: undefined,
        svg: undefined,
        deliveryURL: undefined,
      },
    };
  }

  return {
    id: mediaId,
    type: "cdn",
    uploadedAt: args.now ?? Date.now(),
    metadata: {
      title: cropTitle(media),
      ...(meta.alt ? { alt: meta.alt } : {}),
      ...(meta.description ? { description: meta.description } : {}),
      ...(meta.folderId ? { folderId: meta.folderId } : {}),
      size: file.size,
      contentType: file.type,
      dimensions,
      isVariant: true,
    },
  };
}

/**
 * Cut `crop` out of the full-size original, upload it, and return the library
 * item for the host's `onSave`: a new item for "copy", the same id pointing at
 * the cropped file (`cdnId`) for "replace". Throws `MediaUploadError` with a
 * message to show the person.
 */
export async function saveCrop({ media, crop, mode, signal }: SaveCropArgs): Promise<any> {
  const src = cropSourceUrl(media);
  if (!src) {
    throw new MediaUploadError("bad_mime", "Only photos and images can be cropped.");
  }
  if (mode === "replace" && !canReplaceInPlace(media)) {
    throw new MediaUploadError(
      "bad_mime",
      "This image links to another site, so it can't be replaced. Save the crop as a copy instead."
    );
  }

  const img = await loadImage(src, media?.type === "url");
  const area = clampCrop(crop, { width: img.naturalWidth, height: img.naturalHeight });

  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new MediaUploadError("unknown", "Your browser couldn't crop this image. Try again.");
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

    let transparent: boolean;
    try {
      transparent = hasTransparency(ctx.getImageData(0, 0, area.width, area.height).data);
    } catch {
      throw new MediaUploadError(
        "bad_mime",
        "The site hosting this image doesn't allow editing it here. Download it, upload it to your library, and crop that."
      );
    }

    let type = cropOutputType({ sourceIsPng: isPngSource(media), transparent });
    let blob = await toBlob(canvas, type);
    // An opaque PNG can always fall back to JPEG to fit under Cloudflare's limit.
    if (blob.size > CF_IMAGES_MAX_BYTES && type === "image/png" && !transparent) {
      type = "image/jpeg";
      blob = await toBlob(canvas, type);
    }
    if (blob.size > CF_IMAGES_MAX_BYTES) {
      throw new MediaUploadError(
        "too_large",
        `That crop makes a ${(blob.size / 1024 / 1024).toFixed(1)} MB file, over the 10 MB limit. Crop a smaller area.`
      );
    }

    const file = new File([blob], cropFileName(media, type), { type, lastModified: Date.now() });
    // No preprocess: the bytes are already a JPEG/PNG (no AVIF), the source is
    // the ≤2680px original so there's nothing to downscale, and a second
    // encode would only cost quality and break the 1:1 crop size.
    const { mediaId } = await uploadImageToCdn(file, {
      skipPreprocess: true,
      includeDimensions: false,
      signal,
    });

    return buildCroppedItem({
      media,
      mode,
      mediaId,
      width: area.width,
      height: area.height,
      file,
    });
  } finally {
    // Free the bitmap now; iOS Safari counts canvas memory until GC.
    canvas.width = 0;
    canvas.height = 0;
  }
}

function mediaName(media: any): string {
  return String(media?.metadata?.title || media?.name || media?.id || "Image").trim();
}

function loadImage(src: string, external: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new MediaUploadError(
          "network",
          external
            ? "Couldn't open this image. The site hosting it may not allow editing it here. Download it, upload it to your library, and crop that."
            : "Couldn't load the full-size image. Check your connection and try again."
        )
      );
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: CropOutputType): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob =>
        blob
          ? resolve(blob)
          : reject(
              new MediaUploadError("unknown", "Your browser couldn't save the crop. Try again.")
            ),
      type,
      type === "image/jpeg" ? CROP_JPEG_QUALITY : undefined
    )
  );
}
