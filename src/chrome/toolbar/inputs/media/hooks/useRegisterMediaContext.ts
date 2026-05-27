/**
 * Publish the Media Manager's open/selection state into the SDK command
 * context, and stash the live `selectAllVisible` / `handleDeleteSelected`
 * callbacks on the media backref so the registry-dispatched commands
 * (`ph.media.selectAll`, `ph.media.deleteSelected`) can reach them.
 *
 * Mirrors `useRegisterSelectionContext` (selection/parent/clipboard) and
 * `useRegisterTiptapContext` (active editor). Mounted from inside
 * `useMediaManager` so a single point publishes the truth.
 */
import { useEffect } from "react";
import { useRegistries } from "../../../../../registry";
import { setMediaBackref } from "../../../../../registry/mediaBackref";

interface UseRegisterMediaContextOptions {
  isOpen: boolean;
  selectionMode: boolean;
  selectedCount: number;
  selectAllVisible: () => void;
  handleDeleteSelected: () => void;
}

export function useRegisterMediaContext({
  isOpen,
  selectionMode,
  selectedCount,
  selectAllVisible,
  handleDeleteSelected,
}: UseRegisterMediaContextOptions): void {
  const { context } = useRegistries();

  // Context keys (when-clause inputs).
  useEffect(() => {
    context.set("media.modalOpen", isOpen);
    return () => {
      context.set("media.modalOpen", false);
    };
  }, [context, isOpen]);

  useEffect(() => {
    context.set("media.selectionMode", selectionMode);
  }, [context, selectionMode]);

  useEffect(() => {
    context.set("media.selectedCount", selectedCount);
  }, [context, selectedCount]);

  // Backref (live callbacks for command run bodies). Only register while
  // the modal is open so a stale backref doesn't fire after unmount.
  useEffect(() => {
    if (!isOpen) {
      setMediaBackref(null);
      return;
    }
    setMediaBackref({ selectAllVisible, handleDeleteSelected });
    return () => {
      setMediaBackref(null);
    };
  }, [isOpen, selectAllVisible, handleDeleteSelected]);
}
