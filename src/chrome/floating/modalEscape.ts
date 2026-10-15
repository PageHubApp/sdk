import { getTopOverlayId } from "../../registry/overlayStack";

/**
 * Whether a keydown should close the overlay registered as `overlayId`.
 *
 * Inside the editor the keybinding dispatcher (a `document` listener) already
 * turns Escape into `ph.overlay.dismissTop` and calls `preventDefault()`. Every
 * other surface (dashboard, marketing) has no dispatcher, so `Modal` also
 * listens on `window`, which hears the event after `document`. Skipping events
 * that are already handled keeps the two from both closing something, and
 * the top-of-stack check means only the innermost overlay closes.
 */
export function shouldCloseOnEscape(
  event: Pick<KeyboardEvent, "key" | "defaultPrevented">,
  overlayId: string
): boolean {
  return event.key === "Escape" && !event.defaultPrevented && getTopOverlayId() === overlayId;
}
