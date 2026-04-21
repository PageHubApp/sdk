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

export interface MediaUploadHandlerInput {
  /** The file to upload. Already preprocessed (resize + AVIF→JPEG) by the SDK. */
  file: File;
  /** Optional abort signal forwarded from the caller. */
  signal?: AbortSignal;
}

export interface MediaUploadHandlerResult {
  /** Identifier the host's CDN returned for the uploaded file. */
  mediaId: string;
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
