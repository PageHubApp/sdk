// ─── Instance API — returned by PageHub.init() ───────────────────────────────

import type { PageData } from "./page";
import type { SaveMeta, SaveResult, SaveStatus } from "./save";
import type { PageHubTheme } from "./theme";
import type { PageHubFeatures } from "./features";
import type { PageHubEvent, PageHubEventMap } from "./events";
import type {
  PageHubCommandsRegistryStub,
  PageHubMenusRegistryStub,
  PageHubSlotsRegistryStub,
  PageHubKeybindingsRegistryStub,
  PageHubContextRegistryStub,
} from "../registry/stubTypes";

export interface PageHubInstance {
  /**
   * Programmatically save the current editor state. Resolves with the
   * resulting `{ pageId, updatedAt }` and rejects with a typed error
   * (`SaveConflictError`, `SaveEmptyError`, or `SaveFailedError`).
   * Concurrent calls coalesce — the same `Promise<SaveResult>` is returned
   * to every caller while one save is in flight.
   */
  save: (options?: SaveMeta) => Promise<SaveResult>;

  /** Subscribe to save status (drives the toolbar save indicator). */
  subscribeStatus: (handler: (status: SaveStatus) => void) => () => void;

  /** Load a page into the editor */
  load: (pageId: string) => Promise<void>;

  /** Get the current page data without saving */
  getPageData: () => PageData;

  /** Switch between editor and viewer mode */
  setReadOnly: (readOnly: boolean) => void;

  /** Update theme at runtime */
  setTheme: (theme: Partial<PageHubTheme>) => void;

  /** Update feature flags at runtime */
  setFeatures: (features: Partial<PageHubFeatures>) => void;

  /** Destroy the editor and clean up DOM */
  destroy: () => void;

  /** Listen to SDK events */
  on: <E extends PageHubEvent>(
    event: E,
    handler: (...args: PageHubEventMap[E]) => void
  ) => () => void;

  /** Get the rendered HTML string */
  getHTML: () => string;

  /** Serialise the current state to a JSON string (for export) */
  exportJSON: () => string;

  /** Import a previously exported JSON string */
  importJSON: (json: string) => void;

  /** Render the current editor state to static HTML + CSS class list */
  exportHTML: (options?: {
    view?: "desktop" | "mobile";
    document?: boolean;
    includeThemeVars?: boolean;
    title?: string;
    extraCSS?: string;
    extraHead?: string;
  }) => {
    html: string;
    classes: string[];
    fontUrls: string[];
    scrollObserverScript: string;
    renderError?: string;
  };

  /**
   * Command / menu / slot / keybinding / context registries.
   * Phase 1 Wave A — registries are populated with builtin catalogs but
   * surface migration lands in Phase 2.
   */
  commands?: PageHubCommandsRegistryStub;
  menus?: PageHubMenusRegistryStub;
  slots?: PageHubSlotsRegistryStub;
  keybindings?: PageHubKeybindingsRegistryStub;
  context?: PageHubContextRegistryStub;
}
