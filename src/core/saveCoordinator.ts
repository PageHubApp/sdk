/**
 * @pagehub/sdk — SaveCoordinator
 *
 * Single authoritative owner of the save lifecycle. Replaces the old
 * `emit("save")` + window CustomEvent (`pagehub:saved` / `pagehub:save-failed`
 * / `pagehub:save-conflict`) tangle where every caller invented its own
 * race-with-timeout.
 *
 * Responsibilities:
 *   1. Mutex / coalesce — concurrent `save()` callers get the same Promise.
 *   2. Build PageData (serialise + shard) once per save.
 *   3. Call host `onSave` and route its `SaveResponse` to resolve / reject.
 *   4. Status pub/sub for the toolbar save indicator.
 *   5. Conflict factory — bind `reload()` / `override()` to the rejection.
 */

import type { PageData, SaveMeta, SaveResponse, SaveResult, SaveStatus } from "../types";
import { SaveConflictError, SaveEmptyError, SaveFailedError } from "../types";

type OnSaveFn = (
  pageData: PageData,
  meta?: SaveMeta
) => Promise<SaveResponse | void> | SaveResponse | void;

type OnConflictReloadFn = () => Promise<{ content: any; updatedAt: string } | null>;

interface CoordinatorWiring {
  /**
   * Build the next save's PageData from the live editor state.
   * Returns `null` when the canvas is empty / unserialisable — coordinator
   * rejects with `SaveEmptyError` and never calls the host.
   */
  buildPageData: () => Promise<PageData | null>;
  /** Host save callback (returns `SaveResponse`). */
  onSave: OnSaveFn;
  /** Apply a fresh CraftJS node map to the editor (used by conflict reload). */
  applyServerContent?: (content: any) => void;
  /** Host fetcher used by conflict.reload() — returns the server's draft. */
  onConflictReload?: OnConflictReloadFn;
  /**
   * Tell the host "the server's updatedAt is now X" so its expectedUpdatedAt
   * ref bumps before the next save/retry. Fired before override-retry and
   * after a successful conflict reload.
   */
  notifyUpdatedAt?: (updatedAt: string) => void;
  /** Called after every successful save so the host can clear "unsaved". */
  onSaveSettled?: () => void;
  /**
   * Called whenever the coordinator throws `SaveConflictError`. The editor
   * fans this onto the typed `save_conflict` event so the modal hook can
   * surface reload/override even when the immediate caller swallowed the
   * rejection (autosave, fire-and-forget UI saves).
   */
  onConflict?: (error: SaveConflictError) => void;
}

export class SaveCoordinator {
  private wiring: CoordinatorWiring | null = null;
  private inflight: Promise<SaveResult> | null = null;
  private status: SaveStatus = "idle";
  private statusListeners = new Set<(s: SaveStatus) => void>();
  private statusTimer: ReturnType<typeof setTimeout> | null = null;

  /** Wire the coordinator (called by `<PageHubEditor />` on mount). */
  configure(wiring: CoordinatorWiring): void {
    this.wiring = wiring;
  }

  /** True once the editor has wired the coordinator. */
  isReady(): boolean {
    return this.wiring !== null;
  }

  subscribeStatus(handler: (status: SaveStatus) => void): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  private setStatus(next: SaveStatus): void {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    this.status = next;
    this.statusListeners.forEach(cb => {
      try {
        cb(next);
      } catch (err) {
        console.error("[PageHub] save status listener threw:", err);
      }
    });
    if (next === "saved" || next === "failed") {
      // Auto-reset to idle so the indicator returns to its resting glyph.
      this.statusTimer = setTimeout(
        () => this.setStatus("idle"),
        next === "saved" ? 3000 : 5000
      );
    }
  }

  /** Public entrypoint. Coalesces concurrent calls. */
  save(meta?: SaveMeta): Promise<SaveResult> {
    if (this.inflight) return this.inflight;
    const run = this.runOnce(meta).finally(() => {
      this.inflight = null;
    });
    this.inflight = run;
    return run;
  }

  private async runOnce(meta?: SaveMeta): Promise<SaveResult> {
    const wiring = this.wiring;
    if (!wiring) {
      throw new SaveFailedError("Save coordinator is not wired yet — editor still loading", 0);
    }

    this.setStatus("saving");

    let pageData: PageData | null;
    try {
      pageData = await wiring.buildPageData();
    } catch (err) {
      this.setStatus("failed");
      throw new SaveFailedError(
        err instanceof Error ? err.message : "Failed to build page data",
        undefined,
        err
      );
    }
    if (!pageData) {
      // "Empty canvas" isn't a failure the user should see in the indicator —
      // they just haven't drawn anything yet. Reset to idle and let the
      // caller decide how to surface it (Clippy renders a friendly message).
      this.setStatus("idle");
      throw new SaveEmptyError();
    }

    let response: SaveResponse | void;
    try {
      response = await wiring.onSave(pageData, meta);
    } catch (err) {
      this.setStatus("failed");
      throw new SaveFailedError(
        err instanceof Error ? err.message : "Host onSave threw",
        undefined,
        err
      );
    }

    // Back-compat: hosts that haven't migrated to SaveResponse return void.
    if (!response) {
      this.setStatus("failed");
      throw new SaveFailedError("Host onSave returned no result (legacy void)", 0);
    }

    if (response.ok === true) {
      this.setStatus("saved");
      try {
        wiring.onSaveSettled?.();
      } catch {
        /* settled callback errors are swallowed */
      }
      return { pageId: response.pageId, updatedAt: response.updatedAt };
    }

    if ("conflict" in response) {
      this.setStatus("failed");
      const isDraft = !!response.isDraft;
      const currentUpdatedAt = response.conflict.currentUpdatedAt;
      // Build retry closures bound to this conflict's fresh updatedAt.
      const reload = async (): Promise<SaveResult> => {
        if (!wiring.onConflictReload) {
          throw new SaveFailedError("Host did not provide onConflictReload", 0);
        }
        const fresh = await wiring.onConflictReload();
        if (!fresh) throw new SaveFailedError("Conflict reload returned no data", 0);
        try {
          wiring.applyServerContent?.(fresh.content);
        } catch (err) {
          throw new SaveFailedError(
            err instanceof Error ? err.message : "Failed to apply reloaded content",
            undefined,
            err
          );
        }
        // Bump the host's expectedUpdatedAt to the freshly fetched value
        // before the retry, otherwise the next save will 409 again.
        wiring.notifyUpdatedAt?.(fresh.updatedAt);
        return this.save({ isDraft });
      };
      const overrideFn = async (): Promise<SaveResult> => {
        // Override = "discard server, take my version". Bump host's
        // expectedUpdatedAt to the conflict's currentUpdatedAt so the
        // retry's optimistic-concurrency check passes.
        wiring.notifyUpdatedAt?.(currentUpdatedAt);
        return this.save({ isDraft });
      };
      const conflict = new SaveConflictError(currentUpdatedAt, reload, overrideFn, isDraft);
      // Always fan out — even a caller that immediately swallows the
      // rejection (autosave, UI buttons that don't await) should still pop
      // the modal.
      try {
        wiring.onConflict?.(conflict);
      } catch (notifyErr) {
        console.error("[PageHub] onConflict notifier threw:", notifyErr);
      }
      throw conflict;
    }

    this.setStatus("failed");
    const failure = response as Extract<SaveResponse, { ok: false; reason: string }>;
    throw new SaveFailedError(failure.reason || "Save failed", failure.status, undefined);
  }
}

// One coordinator per emitter — keyed via WeakMap so multiple SDK instances
// in the same document don't collide.
const COORDINATORS = new WeakMap<object, SaveCoordinator>();

export function getSaveCoordinator(emitter: object): SaveCoordinator {
  let c = COORDINATORS.get(emitter);
  if (!c) {
    c = new SaveCoordinator();
    COORDINATORS.set(emitter, c);
  }
  return c;
}
