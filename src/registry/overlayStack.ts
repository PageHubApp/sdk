/**
 * Editor overlay stack — module-level LIFO of dismissable surfaces.
 *
 * Mirrors the shape of `_shownStack` in `packages/sdk/src/utils/state/stateRegistry.ts`
 * (visitor-facing show-hide stack for published-site modals) but lives in the
 * editor-registry namespace. The two stacks are intentionally separate:
 *
 *  - `utils/state/stateRegistry.ts` owns runtime visitor modals authored via
 *    show-hide actions on published sites.
 *  - This file owns editor chrome overlays — settings dialogs, popovers,
 *    confirm prompts, the tiptap context menu, etc.
 *
 * The ⌘`ph.overlay.dismissTop` command and the `overlay.stackDepth` /
 * `overlay.topId` context keys read from THIS stack.
 *
 * Each surface registers via `pushOverlay({ id, dismiss })` when it opens and
 * `popOverlay(id)` when it closes (or on unmount). The dispatcher's Escape
 * binding pops the top entry and calls its `dismiss` callback.
 *
 * Re-entry safety: pushing an id that's already on the stack moves it to the
 * top (matches the visitor stack semantics — last-shown wins). Popping an
 * unknown id is a no-op.
 */

export interface OverlayEntry {
  id: string;
  dismiss: () => void;
}

type StackListener = () => void;

const _stack: OverlayEntry[] = [];
const _listeners = new Set<StackListener>();

function notify(): void {
  _listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error("[ph.overlayStack] listener error:", e);
    }
  });
}

/**
 * Push (or re-push) an overlay onto the stack. If `id` already exists, its
 * entry is removed and re-added at the top so dispatch order matches the
 * latest interaction.
 */
export function pushOverlay(entry: OverlayEntry): void {
  if (!entry || !entry.id) return;
  const idx = _stack.findIndex(e => e.id === entry.id);
  if (idx >= 0) _stack.splice(idx, 1);
  _stack.push(entry);
  notify();
}

/**
 * Remove an overlay by id. Safe to call with an id that isn't on the stack.
 */
export function popOverlay(id: string): void {
  if (!id) return;
  const idx = _stack.findIndex(e => e.id === id);
  if (idx < 0) return;
  _stack.splice(idx, 1);
  notify();
}

/** Read the id of the top entry, or null when the stack is empty. */
export function getTopOverlayId(): string | null {
  if (_stack.length === 0) return null;
  return _stack[_stack.length - 1]!.id;
}

/** Read the current stack depth. */
export function getOverlayDepth(): number {
  return _stack.length;
}

/**
 * Pop the top entry and invoke its dismiss callback. Returns true when an
 * entry was popped, false when the stack was empty. The command runner uses
 * this to drive `ph.overlay.dismissTop`.
 */
export function dismissTopOverlay(): boolean {
  const entry = _stack.pop();
  if (!entry) return false;
  notify();
  try {
    entry.dismiss();
  } catch (e) {
    console.error("[ph.overlayStack] dismiss callback threw:", e);
  }
  return true;
}

/**
 * Subscribe to stack changes (push / pop / clear). Returns unsubscribe.
 * `useRegisterOverlayContext()` uses this to keep `overlay.{stackDepth,topId}`
 * in sync with the live stack.
 */
export function subscribeOverlayStack(listener: StackListener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

/** Test helper — clear all entries. Do not call from production code. */
export function _resetOverlayStackForTests(): void {
  _stack.length = 0;
  notify();
}
