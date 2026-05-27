/**
 * `useRegisterOverlayContext()` — subscribes the command context's
 * `overlay.{stackDepth,topId}` keys to the editor overlay stack.
 *
 * Mounted once at editor boot (alongside `mountMouseOverTracker` /
 * `mountKeybindingDispatcher`). The `ph.overlay.dismissTop` keybinding's
 * `when` clause reads `ctx.overlay.stackDepth > 0`; without this hook the
 * context would never reflect actual overlay state and the Escape chord
 * would silently pass through to `ph.editor.clearSelection`.
 */
import { useEffect } from "react";
import {
  getOverlayDepth,
  getTopOverlayId,
  subscribeOverlayStack,
} from "../overlayStack";
import { useRegistries } from "../provider";

export function useRegisterOverlayContext(): void {
  const { context } = useRegistries();

  useEffect(() => {
    const publish = () => {
      context.setCommandContext({
        overlay: {
          stackDepth: getOverlayDepth(),
          topId: getTopOverlayId(),
        },
      });
    };
    // Publish current state immediately so a freshly-mounted dispatcher
    // sees the right values without waiting for the first push.
    publish();
    return subscribeOverlayStack(publish);
  }, [context]);
}
