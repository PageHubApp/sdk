// ─── Save result contracts ──────────────────────────────────────────────────
//
// The host's `onSave` callback returns a `SaveResponse` — a discriminated union
// covering success, optimistic-concurrency conflict, and arbitrary failure.
// The SDK's save coordinator routes that into a typed Promise/error so every
// caller (`instance.save()`, Clippy's "send", ConnectorsTab, etc.) gets the
// same authoritative result instead of racing window CustomEvents.
//
// The runtime `Save*Error` classes live in `core/saveErrors.ts` (runtime
// doesn't belong in a types module); they're re-exported from `types/index.ts`.

export interface SaveResult {
  /** Site / page id (always present after a successful save). */
  pageId: string;
  /** Server-stamped `updatedAt` after the write. */
  updatedAt: string;
}

export type SaveResponse =
  | { ok: true; pageId: string; updatedAt: string }
  | {
      ok: false;
      conflict: { currentUpdatedAt: string };
      isDraft: boolean;
    }
  | { ok: false; reason: string; status?: number };

/** Save metadata passed from the caller through `onSave`. */
export interface SaveMeta {
  isDraft?: boolean;
}

/** Status taps for the editor's save indicator (`SaveIndicator`, etc.). */
export type SaveStatus = "idle" | "saving" | "saved" | "failed";
