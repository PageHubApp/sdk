/**
 * @pagehub/sdk — Event emitter
 *
 * Lightweight typed event bus for SDK lifecycle events.
 */

import type { PageHubEvent } from "./types";

type Handler = (...args: unknown[]) => void;

/** SDK-only bridge between `PageHub.init()` and the React tree — not exposed on `instance.on()`. */
export type SdkInternalEvent = "_doLoad" | "_nodes_changed" | "_setFeatures";

export class EventEmitter {
  private listeners = new Map<PageHubEvent, Set<Handler>>();
  private internalListeners = new Map<SdkInternalEvent, Set<Handler>>();

  on(event: PageHubEvent, handler: Handler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit(event: PageHubEvent, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[PageHub] Error in "${event}" handler:`, err);
      }
    });
  }

  onInternal(event: SdkInternalEvent, handler: Handler): () => void {
    if (!this.internalListeners.has(event)) {
      this.internalListeners.set(event, new Set());
    }
    this.internalListeners.get(event)!.add(handler);

    return () => {
      this.internalListeners.get(event)?.delete(handler);
    };
  }

  emitInternal(event: SdkInternalEvent, ...args: unknown[]): void {
    const handlers = this.internalListeners.get(event);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[PageHub] Error in internal "${event}" handler:`, err);
      }
    });
  }

  removeAll(): void {
    this.listeners.clear();
    this.internalListeners.clear();
  }
}
