/**
 * Media upload handler registry.
 *
 * The SDK ships UI (Media Manager, image crop, standalone picker, etc.) that
 * needs to upload image files somewhere, but it does NOT know where "somewhere"
 * is — that's host-app business. Hosts register a handler on boot; the SDK
 * calls it through `uploadImageToCdn`.
 *
 * Mirrors `registerClientDataFetcher` / `registerSubmissionHandler`.
 */

export type MediaUploadDestination = "cf-images" | "r2";

export interface MediaUploadHandlerInput {
  /** The file to upload. Already preprocessed (resize + AVIF→JPEG) by the SDK
   *  for images. Non-image files pass through untouched. */
  file: File;
  /** Optional abort signal forwarded from the caller. */
  signal?: AbortSignal;
}

export interface MediaUploadHandlerResult {
  /** Identifier the host's CDN returned for the uploaded file. */
  mediaId: string;
  /** Which storage tier holds the file — drives delete routing and the
   *  delivery URL shape on the SDK side. */
  destination: MediaUploadDestination;
  /** Public URL ready to drop into `<img>`, `<video>`, or `<a href>`.
   *  Hosts can compute this however they like (CF variant URL, R2 public
   *  bucket, signed URL, custom domain); the SDK just passes it through. */
  deliveryURL: string;
}

/**
 * Host-supplied implementation. Throws on failure — ideally a
 * {@link MediaUploadError} from `./errors` so the SDK UI can read a typed
 * `code` and message.
 */
export type MediaUploadHandler = (
  input: MediaUploadHandlerInput
) => Promise<MediaUploadHandlerResult>;

let _handler: MediaUploadHandler | null = null;

export function registerMediaUploadHandler(fn: MediaUploadHandler | null): void {
  _handler = fn;
}

export function getMediaUploadHandler(): MediaUploadHandler | null {
  return _handler;
}

/**
 * Default `<input accept>` value when no host has registered an accept
 * provider — the SDK's known-good image MIME list (matches what Cloudflare
 * Images accepts via direct_upload).
 */
export const DEFAULT_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/svg+xml";

/**
 * Returns the comma-separated MIME / extension list to pass to a file
 * `<input accept>` for *new* uploads. The SDK has no concept of "plan tiers"
 * or "allowed media types" — that policy lives in the host app. Hosts that
 * support more than images register a provider; otherwise the SDK falls back
 * to {@link DEFAULT_IMAGE_ACCEPT}.
 */
export type MediaAcceptProvider = () => string;

let _acceptProvider: MediaAcceptProvider | null = null;

export function registerMediaUploadAccept(fn: MediaAcceptProvider | null): void {
  _acceptProvider = fn;
}

export function getUploadAccept(): string {
  return _acceptProvider?.() ?? DEFAULT_IMAGE_ACCEPT;
}
