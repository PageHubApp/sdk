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
import { sdkLog } from "../utils/logger";

type OnSaveFn = (
  pageData: PageData,
  meta?: SaveMeta
) => Promise<SaveResponse> | SaveResponse;

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
  /**
   * Apply a fresh tree to the editor (used by conflict reload). Takes what
   * `onConflictReload` returned — an LZ-compressed string or a node map.
   */
  applyServerContent?: (content: any) => void | Promise<void>;
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
  /**
   * At most one save queued behind `inflight`. A change made while a save is
   * on the wire is not in that save's payload, so it needs a follow-up; every
   * caller that arrives meanwhile shares the same follow-up.
   */
  private queued: Promise<SaveResult> | null = null;
  private queuedMeta: SaveMeta | undefined;
  private queuedForce = false;
  /** Bumped by `markDirty()` on every node change. */
  private changeSeq = 0;
  /**
   * Content of the last successful send. A draft save whose payload matches
   * it is answered locally — nothing changed, so nothing goes on the wire.
   */
  private lastSaved: { content: string; result: SaveResult } | null = null;
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
        sdkLog.error("[PageHub] save status listener threw:", err);
      }
    });
    if (next === "saved" || next === "failed") {
      // Auto-reset to idle so the indicator returns to its resting glyph.
      this.statusTimer = setTimeout(() => this.setStatus("idle"), next === "saved" ? 3000 : 5000);
    }
  }

  /** Record that the tree changed. The editor calls this on every node change. */
  markDirty(): void {
    this.changeSeq += 1;
  }

  /**
   * Public entrypoint. One save on the wire at a time; a call that arrives
   * while one is in flight gets a follow-up save that runs when it lands.
   */
  save(meta?: SaveMeta): Promise<SaveResult> {
    return this.enqueue(meta, false);
  }

  private enqueue(meta: SaveMeta | undefined, force: boolean): Promise<SaveResult> {
    if (!this.inflight) return this.start(meta, force);

    if (this.queued) {
      // A full save or a forced retry outranks a queued draft autosave.
      if (meta?.isDraft === false) this.queuedMeta = meta;
      if (force) this.queuedForce = true;
      return this.queued;
    }

    this.queuedMeta = meta;
    this.queuedForce = force;
    this.queued = this.inflight
      .then(
        () => undefined,
        () => undefined
      )
      .then(() => {
        const nextMeta = this.queuedMeta;
        const nextForce = this.queuedForce;
        this.queued = null;
        this.queuedMeta = undefined;
        this.queuedForce = false;
        return this.start(nextMeta, nextForce);
      });
    return this.queued;
  }

  private start(meta: SaveMeta | undefined, force: boolean): Promise<SaveResult> {
    const run = this.runOnce(meta, force).finally(() => {
      this.inflight = null;
    });
    this.inflight = run;
    return run;
  }

  /** Clear "unsaved" only when nothing changed after `seq` was captured. */
  private settle(seq: number): void {
    if (seq !== this.changeSeq) return;
    try {
      this.wiring?.onSaveSettled?.();
    } catch {
      /* settled callback errors are swallowed */
    }
  }

  private async runOnce(meta: SaveMeta | undefined, force: boolean): Promise<SaveResult> {
    const wiring = this.wiring;
    if (!wiring) {
      throw new SaveFailedError("Save coordinator is not wired yet — editor still loading", 0);
    }

    // Captured before serialising: a change that lands after this point is
    // not in the payload, so it must keep the tree marked unsaved.
    const seq = this.changeSeq;
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

    if (
      meta?.isDraft === true &&
      !force &&
      this.lastSaved &&
      this.lastSaved.content === pageData.content
    ) {
      this.setStatus("idle");
      this.settle(seq);
      return this.lastSaved.result;
    }

    let response: SaveResponse;
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

    if (response.ok === true) {
      const result = { pageId: response.pageId, updatedAt: response.updatedAt };
      this.lastSaved = { content: pageData.content, result };
      this.setStatus("saved");
      this.settle(seq);
      return result;
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
          await wiring.applyServerContent?.(fresh.content);
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
        return this.enqueue({ isDraft }, true);
      };
      const overrideFn = async (): Promise<SaveResult> => {
        // Override = "discard server, take my version". Bump host's
        // expectedUpdatedAt to the conflict's currentUpdatedAt so the
        // retry's optimistic-concurrency check passes. Forced: the payload
        // may equal the last send and must still go up.
        wiring.notifyUpdatedAt?.(currentUpdatedAt);
        return this.enqueue({ isDraft }, true);
      };
      const conflict = new SaveConflictError(currentUpdatedAt, reload, overrideFn, isDraft);
      // Always fan out — even a caller that immediately swallows the
      // rejection (autosave, UI buttons that don't await) should still pop
      // the modal.
      try {
        wiring.onConflict?.(conflict);
      } catch (notifyErr) {
        sdkLog.error("[PageHub] onConflict notifier threw:", notifyErr);
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
