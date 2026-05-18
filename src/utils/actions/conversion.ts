/**
 * Conversion-event firing — one entry point used by every action handler.
 *
 * Three provider modes:
 *   - `google-ads`: `gtag('event','conversion',{ send_to, value, currency })`
 *   - `ga4`:       `gtag('event', eventName, { value, currency })`
 *   - `meta`:      `fbq('track', eventName, { value, currency })`
 *
 * The optional `navigate` callback wires `event_callback` so the gtag beacon
 * completes before same-tab navigation. A 1 s safety timer guarantees
 * navigation even if the callback never resolves (stubbed gtag, blocked
 * network, etc.). A `fired` flag prevents double-firing when both the
 * callback and timer race to completion.
 *
 * For `target="_blank"` / `tel:` / `mailto:` and non-navigating actions,
 * call `fireConversion(c)` with no `navigate` callback — the popup or dialer
 * is already opened by the synchronous user-gesture handler, and the gtag
 * call fires-and-forgets after.
 */
import type { ActionConversion } from "../action";

interface FireOpts {
  /** Same-tab navigation to perform after the beacon flushes (or 1 s elapses). */
  navigate?: () => void;
}

export function fireConversion(c: ActionConversion | undefined, opts?: FireOpts): void {
  if (!c) {
    opts?.navigate?.();
    return;
  }

  const w = window as any;
  const value = typeof c.value === "number" && !Number.isNaN(c.value) ? c.value : undefined;
  const currency = c.currency || undefined;
  const navigate = opts?.navigate;
  let fired = false;
  const safeNavigate = navigate
    ? () => {
        if (fired) return;
        fired = true;
        navigate();
      }
    : undefined;

  if (c.provider === "meta") {
    try {
      w.fbq?.("track", c.eventName, { value, currency });
    } catch {
      /* swallow — beacon errors must not block navigation */
    }
    safeNavigate?.();
    return;
  }

  // Both `google-ads` and `ga4` route through gtag.
  const payload: Record<string, unknown> = {};
  if (value !== undefined) payload.value = value;
  if (currency) payload.currency = currency;
  if (c.provider === "google-ads") {
    if (!c.sendTo) {
      // Misconfigured — bail out gracefully and still navigate.
      safeNavigate?.();
      return;
    }
    payload.send_to = c.sendTo;
  }
  if (safeNavigate) {
    payload.event_callback = safeNavigate;
    payload.event_timeout = 1000;
    // Safety timer: gtag stub or blocked network won't invoke callback. Fire
    // navigation anyway after 1 s. `fired` flag in safeNavigate dedupes.
    window.setTimeout(safeNavigate, 1000);
  }

  const eventName = c.provider === "google-ads" ? "conversion" : c.eventName;
  try {
    w.gtag?.("event", eventName, payload);
  } catch {
    /* swallow */
  }
  // If gtag is missing entirely, safeNavigate still fires via the 1 s timer.
}
