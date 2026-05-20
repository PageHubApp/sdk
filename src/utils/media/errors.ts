import { PageHubError } from "../errors";

export type MediaUploadErrorCode =
  | "too_large"
  | "bad_mime"
  | "quota"
  | "cf_rejected"
  | "auth"
  | "rate_limited"
  | "network"
  | "unknown";

/**
 * Map the lowercase MediaUploadErrorCode → canonical SCREAMING_SNAKE_CASE
 * `code` exposed via `PageHubError.code`. The original lowercase value is
 * preserved on the instance as `code` (typed as MediaUploadErrorCode) for
 * existing consumers; new consumers can rely on `e instanceof PageHubError`
 * and `e.code`.
 */
const MEDIA_CODE_MAP: Record<MediaUploadErrorCode, string> = {
  too_large: "MEDIA_TOO_LARGE",
  bad_mime: "MEDIA_BAD_MIME",
  quota: "MEDIA_QUOTA",
  cf_rejected: "MEDIA_CF_REJECTED",
  auth: "MEDIA_AUTH",
  rate_limited: "MEDIA_RATE_LIMITED",
  network: "MEDIA_NETWORK",
  unknown: "MEDIA_UNKNOWN",
};

export class MediaUploadError extends PageHubError {
  // Override the base `code` with the narrower legacy lowercase union for
  // backwards compat — consumers that destructure `{ code }` keep working with
  // the same values. The SCREAMING_SNAKE_CASE PageHubError code is still
  // assigned via super().
  declare readonly code: MediaUploadErrorCode;
  status?: number;

  constructor(code: MediaUploadErrorCode, message: string, status?: number) {
    super({ code: MEDIA_CODE_MAP[code] ?? "MEDIA_UNKNOWN", message });
    this.name = "MediaUploadError";
    (this as { code: MediaUploadErrorCode }).code = code;
    this.status = status;
  }
}

/**
 * Map a signed-URL-issuer non-OK response into a MediaUploadError. Building
 * block for {@link MediaUploadHandler} implementations whose backend returns
 * `{ error, code, status }` (with or without the structured code). Falls
 * back sensibly on missing fields (older deploy, proxy error page, etc).
 */
export async function parseApiMediaGetError(res: Response): Promise<MediaUploadError> {
  const status = res.status;
  let body: { error?: string; code?: MediaUploadErrorCode } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }

  const message = body.error || `Upload request failed (${status})`;

  if (body.code) {
    return new MediaUploadError(body.code, message, status);
  }
  if (status === 401 || status === 403) return new MediaUploadError("auth", message, status);
  if (status === 413) return new MediaUploadError("too_large", message, status);
  if (status === 415) return new MediaUploadError("bad_mime", message, status);
  if (status === 429) return new MediaUploadError("rate_limited", message, status);
  return new MediaUploadError("unknown", message, status);
}

/**
 * Map a Cloudflare direct_upload non-OK response into a MediaUploadError.
 * Cloudflare returns `{ errors: [{ message }], success: false }` for most
 * failures; 415 is AVIF-rejection territory.
 */
export async function parseCloudflareError(res: Response): Promise<MediaUploadError> {
  const status = res.status;
  let cfMessage = "";
  try {
    const body = await res.json();
    if (Array.isArray(body?.errors) && body.errors[0]?.message) {
      cfMessage = body.errors[0].message;
    } else if (body?.message) {
      cfMessage = body.message;
    }
  } catch {
    /* non-JSON response */
  }
  const message = cfMessage || `Upload to CDN failed (${status})`;

  if (status === 415) return new MediaUploadError("bad_mime", message, status);
  if (status === 413) return new MediaUploadError("too_large", message, status);
  return new MediaUploadError("cf_rejected", message, status);
}
