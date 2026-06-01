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

  /**
   * Fetch page settings (props + metadata) for a page not currently in the CraftJS tree.
   * Called when opening the page settings modal for an unloaded page shard.
   * When omitted, settings are only readable for in-tree pages.
   */
  fetchPageSettings?: (pageNodeId: string) => Promise<PageSettingsPayload | null>;

  /**
   * Save page settings for a page not currently in the CraftJS tree.
   * Called when committing settings changes for an unloaded page shard.
   * When omitted, settings are only writable for in-tree pages.
   */
  savePageSettings?: (pageNodeId: string, settings: PageSettingsPayload) => Promise<void>;

  /**
   * Create a new page in the database (sharding mode).
   * Called instead of tree-first AddElement when fetchPage is available.
   */
  createPage?: (params: {
    pageNodeId: string;
    displayName: string;
    pageSlug?: string;
    pageTitle?: string;
    pageDescription?: string;
  }) => Promise<{ nodeId: string }>;
}

/** Shape exchanged between SDK and host for remote page settings. */
export interface PageSettingsPayload {
  displayName: string;
  isHomePage: boolean;
  is404Page: boolean;
  props: Record<string, any>;
}
