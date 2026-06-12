// ─── Events ───────────────────────────────────────────────────────────────────

import type { PageData } from "./page";
import type { SaveMeta, SaveStatus } from "./save";
import type { SaveConflictError } from "../core/saveErrors";

export type PageHubEvent =
  | "ready"
  | "save"
  | "load"
  | "change"
  | "publish"
  | "error"
  | "modeChange"
  | "componentSelect"
  | "componentDeselect"
  | "unsaved_changes"
  | "save_status"
  | "save_conflict"
  | "saved"
  | "updated_at_changed";

export interface PageHubEventMap {
  ready: [];
  save: [options?: SaveMeta];
  load: [pageData: PageData];
  change: [];
  publish: [pageData: PageData];
  error: [error: unknown];
  modeChange: [mode: "editor" | "viewer"];
  componentSelect: [nodeId: string];
  componentDeselect: [];
  /** Emitted when dirty state toggles (editor tracks serialized graph when dirty). */
  unsaved_changes: [dirty: boolean];
  /** Save coordinator status taps — drives `<SaveIndicator />` etc. */
  save_status: [status: SaveStatus];
  /**
   * Save coordinator hit a 409 — error carries bound `reload()` /
   * `override()` retry methods. Modal hook listens for this and offers
   * the user a choice without dispatching window events.
   */
  save_conflict: [error: SaveConflictError];
  /**
   * Save succeeded — carries the host's full response payload (e.g. the
   * persisted page document). Necessary because nested zedux ecosystems
   * mean a host-side `setSettings` doesn't always reach atom subscribers
   * mounted inside the SDK's inner `EcosystemProvider`.
   */
  saved: [data: any];
  /**
   * Server has stamped a fresh `updatedAt` outside the normal save path
   * (e.g. after a conflict reload, or after the AI agent's MCP write).
   * Hosts use this to bump their `expectedUpdatedAt` ref.
   */
  updated_at_changed: [updatedAt: string];
}
