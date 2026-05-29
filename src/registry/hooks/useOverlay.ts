/**
 * `useOverlay({ id, isOpen, onDismiss })` — per-overlay registration into the
 * editor overlay stack.
 *
 * The hook pushes the overlay's dismiss callback onto the module-level stack
 * (`../overlayStack.ts`) while `isOpen` is true, and pops it when `isOpen`
 * flips false or the host unmounts. The registry dispatcher's Escape binding
 * resolves `ph.overlay.dismissTop` against the same stack, so every overlay
 * gets centralized Escape handling without owning its own keydown listener.
 *
 * Re-entry safe: pushing an id that's already on the stack moves it to the
 * top (matches visitor `_shownStack` semantics). Popping an unknown id is a
 * no-op. The latest `onDismiss` closure is captured via a ref so the entry's
 * dismiss callback always sees fresh props without rebuilding the stack on
 * every render.
 *
 * USAGE
 *
 *     useOverlay({ id: "icon-dialog", isOpen, onDismiss: onClose });
 *
 * Stable ids should describe the surface (e.g. `"icon-dialog"`,
 * `"confirm-dialog"`, `"tiptap-context-menu"`). Multi-layer surfaces (the
 * canvas context menu cascade — flyout → insert panel → main menu) register
 * one id per layer; the stack's LIFO ordering then drives the cascade
 * automatically.
 */
import { useEffect, useRef } from "react";
import { popOverlay, pushOverlay } from "../overlayStack";
import { sdkLog } from "../../utils/logger";

export interface UseOverlayArgs {
  /** Stable id — used for re-entry detection and dispatcher debugging. */
  id: string;
  /** Whether the overlay is currently visible / active. */
  isOpen: boolean;
  /** Called when the dispatcher pops this entry off the stack. */
  onDismiss: () => void;
}

export function useOverlay(args: UseOverlayArgs): void {
  const { id, isOpen, onDismiss } = args;

  // Capture the latest onDismiss in a ref so the entry's dismiss callback can
  // always invoke the freshest closure without re-pushing the stack each
  // render. Without this, swapping handler identity would either churn the
  // stack or fire stale state setters.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!isOpen || !id) return;
    pushOverlay({
      id,
      dismiss: () => {
        try {
          onDismissRef.current();
        } catch (e) {
          sdkLog.error(`[ph.useOverlay] onDismiss for "${id}" threw:`, e);
        }
      },
    });
    return () => {
      popOverlay(id);
    };
  }, [id, isOpen]);
}
