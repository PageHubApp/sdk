/**
 * Command context store — single source of truth for `when` / `enablement`
 * predicate inputs.
 *
 * Two halves:
 * - SDK-derived: selection, history, mode, tiptap, etc. Populated by
 *   editor surfaces via `setCommandContext(partial)`. In Wave A these are
 *   stub defaults — Phase 2 wires real surfaces.
 * - Host-set: arbitrary string keys via `context.set(key, value)`.
 *
 * Snapshots are immutable per tick; subscribers fire after each update with
 * the merged snapshot. React hook in `./hooks.ts`.
 */
import type { CommandContext } from "./types";

export interface ContextRegistry {
  /** Replace / merge SDK-derived fields. */
  setCommandContext: (patch: Partial<CommandContext>) => void;
  /** Set a single host-controlled key. */
  set: (key: string, value: unknown) => void;
  /** Remove a host-controlled key. */
  unset: (key: string) => void;
  /** Read the current snapshot. */
  getSnapshot: () => CommandContext;
  /** Subscribe to context changes; returns unsubscribe. */
  subscribe: (listener: () => void) => () => void;
}

const DEFAULT_CONTEXT: CommandContext = {
  selection: {
    id: null,
    type: null,
    isCanvas: false,
    isDeletable: false,
    isLinked: false,
    canDelete: false,
  },
  parent: { id: null, displayName: null },
  canUndo: false,
  canRedo: false,
  mode: "editor",
  viewMode: "page",
  features: {},
  isAiEnabled: false,
  tiptap: {
    active: false,
    selectionEmpty: true,
    richTextMode: "full",
    isActive: () => false,
    can: () => ({}),
    activePanel: null,
  },
  overlay: { stackDepth: 0, topId: null },
  clipboard: { hasNode: false, hasClasses: false },
  mouseOver: null,
};

export function createContextRegistry(): ContextRegistry {
  let snapshot: CommandContext = { ...DEFAULT_CONTEXT };
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error("[ph.context] listener error:", err);
      }
    });
  };

  const setCommandContext = (patch: Partial<CommandContext>) => {
    snapshot = { ...snapshot, ...patch };
    notify();
  };

  const set = (key: string, value: unknown) => {
    snapshot = { ...snapshot, [key]: value };
    notify();
  };

  const unset = (key: string) => {
    if (!(key in snapshot)) return;
    const next = { ...snapshot } as CommandContext;
    delete (next as Record<string, unknown>)[key];
    snapshot = next;
    notify();
  };

  const getSnapshot = () => snapshot;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { setCommandContext, set, unset, getSnapshot, subscribe };
}

export { DEFAULT_CONTEXT };
