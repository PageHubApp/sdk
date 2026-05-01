/**
 * usePopoverAutoOpen — combined auto-open driver for property-row popover
 * triggers. Replaces ~17 copies of:
 *
 *   - SessionAddedAtom  (legacy "added but no value yet" signal — opens once
 *                        on first mount when the row was just created)
 *   - PopoverOpenRequestAtom (versioned bump bus from AccordionAddMenu /
 *                              PropertySection empty-state title click)
 *
 * Both fire `onOpen` inside `requestAnimationFrame` so the trigger has laid
 * out before measuring.
 *
 * Hides the documented footgun (`lastVersion = useRef(0)` init rule from
 * editor-popover-pattern.md §4) inside one place.
 *
 * Opt-in: triggers without a `def` (ColorInputPopover, IconInput) skip this
 * hook entirely.
 */
import { useAtomValue } from "@zedux/react";
import { useEffect, useRef } from "react";
import { PopoverOpenRequestAtom, popoverRequestKey } from "../popoverOpenRequestAtom";
import { SessionAddedAtom, sessionKey } from "../sessionAddedAtom";

export function usePopoverAutoOpen({
  nodeId,
  defId,
  enabled = true,
  onOpen,
}: {
  nodeId: string;
  defId: string | undefined;
  enabled?: boolean;
  onOpen: () => void;
}) {
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  // Legacy auto-open from sessionAdded — fire once.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!enabled || autoOpenedRef.current || !defId) return;
    if (sessionAdded.has(sessionKey(nodeId, defId))) {
      autoOpenedRef.current = true;
      requestAnimationFrame(() => onOpenRef.current());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdded, nodeId, defId, enabled]);

  // Versioned popover-open-request bus — fire each bump.
  const lastRequestVersion = useRef(0);
  useEffect(() => {
    if (!enabled || !defId) return;
    const version = popoverRequests.get(popoverRequestKey(nodeId, defId)) || 0;
    if (version === 0 || version === lastRequestVersion.current) return;
    lastRequestVersion.current = version;
    requestAnimationFrame(() => onOpenRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverRequests, nodeId, defId, enabled]);
}
