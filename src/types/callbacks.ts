// ─── Callbacks — the customer's integration points ────────────────────────────

import type { PageData } from "./page";
import type { SaveMeta, SaveResponse } from "./save";

export interface PageHubCallbacks {
  /**
   * Called when the user saves a page.
   *
   * Return a `SaveResponse` so the SDK coordinator can resolve the
   * `instance.save()` promise with a typed result (success / conflict /
   * failure).
   */
  onSave: (
    pageData: PageData,
    meta?: SaveMeta
  ) => Promise<SaveResponse> | SaveResponse;

  /**
   * Optional: when the save coordinator surfaces a conflict and the caller
   * picks "Reload", it invokes this to refetch the server's current draft.
   * Return the deserialised CraftJS node map (raw object — the SDK will
   * `JSON.stringify` + `actions.deserialize`) plus the new `updatedAt`.
   * The SDK then retries the save against the fresh `expectedUpdatedAt`.
   */
  onConflictReload?: () => Promise<{ content: any; updatedAt: string } | null>;

  /**
   * Called when the editor needs to load a page.
   * The customer fetches from their own database.
   * Return `null` for a blank canvas.
   */
  onLoad: (pageId?: string) => Promise<PageData | null> | PageData | null;

  /** Emitted on every editor state change (debounced). Useful for auto-save. */
  onChange?: (pageData: PageData) => void;

  /**
   * Fetch a single page shard for lazy loading.
   * Called when the user switches to a page not yet in the CraftJS tree.
   * Return compressed assembled content (shared + page), or null if unavailable.
   * When omitted, SDK assumes all pages are in-tree (standalone mode).
   */
  fetchPage?: (pageNodeId: string) => Promise<{ content: string } | null>;

  /** Called when the user publishes (promotes draft → live). */
  onPublish?: (pageData: PageData) => Promise<void> | void;

  /** Called when media needs to be uploaded. Return the public URL. */
  onMediaUpload?: (file: File) => Promise<string>;

  /** Called when media should be deleted */
  onMediaDelete?: (url: string) => Promise<void>;

  /** Called when a user clicks an "Add to Cart" button. Item is the current repeater item context. */
  onAddToCart?: (item: Record<string, any>, quantity: number) => void;
}
