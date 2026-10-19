/**
 * Media library entry shapes — one row of `ROOT.props.pageMedia` (or of a
 * host's library store) and one folder. Lives in `utils/` so the store seam
 * (`./libraryStore`) and the Media Manager chrome share it without `utils/`
 * importing from `chrome/`.
 */

/** Logical kind of a media item, derived from `type` + `metadata.contentType`
 *  (`getMediaKind`). Drives badges, filters, pickers and same-kind replace. */
export type MediaKind = "image" | "video" | "audio" | "pdf" | "archive" | "other";

export interface MediaDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface MediaMetadata {
  title?: string;
  alt?: string;
  description?: string;
  url?: string;
  svg?: string;
  size?: number;
  dimensions?: MediaDimensions;
  originalUrl?: string;
  isVariant?: boolean;
  aiGenerated?: boolean;
  aiPrompt?: string;
  source?: string;
  /** For `type: "r2"`, the ready-to-use public URL (avoids re-deriving at render). */
  deliveryURL?: string;
  /** The original MIME type — helpful for `r2` media (video/audio/pdf) where
   *  the type prefix changes how we render it. */
  contentType?: string;
  /** Optional single-level folder assignment. */
  folderId?: string;
}

export interface MediaItem {
  id: string;
  type?: "cdn" | "url" | "svg" | "r2";
  cdnId?: string;
  order?: number;
  uploadedAt?: number;
  createdAt?: number;
  metadata?: MediaMetadata;
}

export interface MediaFolder {
  id: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}
