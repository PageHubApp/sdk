/**
 * Unified action system — single `action: NodeAction` prop on interactive
 * components.
 */

import { resolvePageRef, type PageIndex } from "./page/pageManagement";
import type { ConditionGroup } from "./conditions/types";

// ─── Types ─────────────────────────────────────────────────────────────

export type ActionType =
  | "link"
  | "open-modal"
  | "show-hide"
  | "copy-to-clipboard"
  | "download-file"
  | "toggle-theme"
  | "add-to-cart"
  | "toggle-cart"
  | "cart-checkout"
  | "manage-subscription"
  | "agent-send"
  | "set-local-storage"
  | "remove-local-storage"
  | "set-state"
  | "toggle-state"
  | "clear-state"
  | "increment-state"
  | "decrement-state";

/**
 * Conversion-tracking metadata attached to a single action. The runtime fires
 * a `gtag('event', …)` or `fbq('track', …)` call after the action runs.
 *
 * Provider semantics:
 *   - `google-ads`: `gtag('event','conversion',{ send_to, value, currency })`
 *     — `eventName` is ignored; `sendTo` is REQUIRED (`AW-XXXXXXXXXX/AbCdEf`).
 *   - `ga4`: `gtag('event', eventName, { value, currency })`
 *   - `meta`: `fbq('track', eventName, { value, currency })`
 *
 * Same-tab `link` actions (no `target: "_blank"`) honor `event_callback` +
 * a 1 s safety timer so the network beacon fires before navigation. External
 * tabs / `tel:` / `mailto:` fire-and-forget (popup or dialer is already open).
 */
export interface ActionConversion {
  provider: "google-ads" | "ga4" | "meta";
  eventName: string;
  sendTo?: string;
  value?: number;
  currency?: string;
}

interface ActionBase {
  type: ActionType;
  /**
   * Optional gate — action only fires when conditions evaluate truthy. Same
   * shape as node-level visibility / page-access conditions
   * (`packages/sdk/src/utils/conditions/types.ts`). Multiple groups are OR'd
   * (Elementor-style); within a group, `logic: "all" | "any"` chooses AND/OR.
   *
   * Currently only `fireLoadAction` reads this field — load-trigger banners
   * use it for first-visit gating. Click/hover gating in `addActionHandlers`
   * is a follow-up.
   */
  conditions?: ConditionGroup[];
  /**
   * Optional conversion-tracking metadata. Fires once after the action runs.
   * Same-tab `link` actions defer navigation through `event_callback` so the
   * gtag beacon completes (with a 1 s safety timer to guarantee navigation).
   */
  conversion?: ActionConversion;
}

/**
 * Unified link action — one action type for every link-ish destination.
 *
 * The `href` field encodes the destination using HTML conventions:
 *   - `https://example.com` / `//cdn.example.com` — external URL
 *   - `/blog/hello` — relative URL (host app routing)
 *   - `ref:<pageId>[/path|?query|#hash]` — internal page reference (resolved at render time)
 *   - `#hero` — in-page anchor (renderer adds smooth-scroll behavior)
 *   - `mailto:hi@example.com?subject=…&body=…` — email (subject/body via querystring)
 *   - `tel:+15551234` — phone
 */
export interface LinkAction extends ActionBase {
  type: "link";
  href: string;
  target?: LinkTarget;
}

export interface OpenModalAction extends ActionBase {
  type: "open-modal";
  anchor: string;
}

export interface ShowHideAction extends ActionBase {
  type: "show-hide";
  target: string;
  direction: "show" | "hide" | "toggle" | "tab";
  method?: "class" | "style";
  group?: string;
  /**
   * What fires the action.
   *  - `"click"` (default) / `"hover"` — DOM event handlers.
   *  - `"load"` — fires once on mount in viewer mode. Use the inherited
   *    `conditions` field (e.g. a `localStorage not-exists` group) for
   *    first-visit-only banners (cookie consent, popups). Editor
   *    auto-reveal uses `useShowOnLoadAutoReveal` so authors can edit the
   *    banner regardless of conditions.
   */
  trigger?: "click" | "hover" | "load";
}

export interface CopyToClipboardAction extends ActionBase {
  type: "copy-to-clipboard";
  text: string;
}

export interface DownloadFileAction extends ActionBase {
  type: "download-file";
  url: string;
  filename?: string;
}

/** Add item to shopping cart. Fires `config.callbacks.onAddToCart` with the current item context. */
export interface AddToCartAction extends ActionBase {
  type: "add-to-cart";
  /** Static quantity to add (default 1). Overridden by quantityField when set. */
  quantity?: number;
  /**
   * Name of a form field (e.g. an `<input name="quantity">`) to read at click
   * time. The field is located via a closest-ancestor search from the button.
   * Falls back to `quantity` (static) if the field is missing or non-numeric.
   */
  quantityField?: string;
  /**
   * Read the matched variant from this state key (typically the output of a
   * `computedStateBindings` entry with `compute.type === "variant-match"`).
   * The handler reads `getStateValue(key)` (anchor tokens supported), parses
   * it as JSON, and merges over the current item context as the cart payload.
   * When unset or empty, the bare item context is used (single-variant
   * products).
   */
  variantMatchStateKey?: string;
}

/** Toggle the shopping cart drawer open/closed. */
export interface ToggleCartAction extends ActionBase {
  type: "toggle-cart";
}

/** Trigger Stripe checkout with current cart contents. */
export interface CartCheckoutAction extends ActionBase {
  type: "cart-checkout";
}

/** Redirect to Stripe Billing Portal for subscription management. */
export interface ManageSubscriptionAction extends ActionBase {
  type: "manage-subscription";
}

/**
 * Send the current visitor-composed message to the nearest Agent chat.
 * Reads the value of `[name=field]` inside the closest `[data-ph-agent-chat]`
 * ancestor, then writes `${chatId}:outbox` (`{ nonce, value }` JSON) to the
 * central state registry. The `AgentChat` wrapper subscribes via
 * `useStateValue` and calls its `send()` runtime when the nonce changes.
 * No CustomEvent bus — observable, gateable, testable via `getStateValue`.
 */
export interface AgentSendAction extends ActionBase {
  type: "agent-send";
  /** Name of the form field holding the composed message (default: "agentMessage"). */
  field?: string;
}

/**
 * Write a key/value pair to `window.localStorage`. Pairs naturally with a
 * load-trigger `show-hide` action whose `conditions` include a `localStorage`
 * `not-exists` check — once the key is set, the banner/popup is gated out on
 * subsequent visits.
 */
export interface SetLocalStorageAction extends ActionBase {
  type: "set-local-storage";
  key: string;
  value: string;
}

/** Remove a key from `window.localStorage` (e.g. "show this banner again"). */
export interface RemoveLocalStorageAction extends ActionBase {
  type: "remove-local-storage";
  key: string;
}

/**
 * Write to the central state registry. The generic primitive that drives
 * tab-active styling, modal-open flags, drawer-open, selection groups, etc.
 * Pair with a `state` condition (visibility / className gating) to react.
 */
export interface SetStateAction extends ActionBase {
  type: "set-state";
  /** Registry key — element id (implicit) or named state declared on ROOT. */
  key: string;
  /** Discriminator — used by the editor to offer the right operator suite. Defaults to "value". */
  kind?: "visibility" | "selection" | "flag" | "value";
  /** Value to write. Supports `{{item.*}}` interpolation at runtime. */
  value: string;
  trigger?: "click" | "hover" | "load";
}

/** Toggle a state between two values (defaults: visibility "shown"/"hidden", flag "on"/"off"). */
export interface ToggleStateAction extends ActionBase {
  type: "toggle-state";
  key: string;
  kind?: "visibility" | "selection" | "flag" | "value";
  /** Optional value pair. If omitted, kind decides ("shown"|"hidden", "on"|"off"). */
  values?: [string, string];
  trigger?: "click" | "hover" | "load";
}

/** Remove a state entry entirely. Useful for "reset" buttons. */
export interface ClearStateAction extends ActionBase {
  type: "clear-state";
  key: string;
  trigger?: "click" | "hover" | "load";
}

/**
 * Numeric arithmetic on a state value — `value = parseInt(currentValue || 0) + step`,
 * then clamp to [min, max] (when set) or wrap-around (when `wrap: true`).
 *
 * Powers carousel prev/next, stepper inputs, "show N more" pagination, etc.
 *
 * `trigger: "interval"` + `intervalMs` fires the action on a setInterval —
 * autoscroll carousels, timed slideshows, ticker bands. Pause via the SAME
 * action with a node `data-state-interval-pause` attr (added on hover by
 * authors via CSS `:hover` — no JS needed for the pause itself).
 */
export interface IncrementStateAction extends ActionBase {
  type: "increment-state";
  key: string;
  /** Defaults to 1. */
  step?: number;
  /** Optional clamp lower bound. */
  min?: number;
  /**
   * Optional clamp upper bound. Numeric literal OR a state-key reference of the
   * shape `state:<otherKey>` (e.g. `"state:carousel-1-max"`) that resolves at
   * fire time — useful when max depends on dynamic content (slide count).
   */
  max?: number | string;
  /** Wrap to min when above max (and vice-versa for decrement). Default false. */
  wrap?: boolean;
  trigger?: "click" | "hover" | "load" | "interval";
  /** Required when trigger === "interval". */
  intervalMs?: number;
}

/** Mirror of IncrementStateAction with negated step. Same min/max/wrap semantics. */
export interface DecrementStateAction extends ActionBase {
  type: "decrement-state";
  key: string;
  step?: number;
  min?: number;
  max?: number | string;
  wrap?: boolean;
  trigger?: "click" | "hover" | "load" | "interval";
  intervalMs?: number;
}

/** Toggle `html.dark` and persist `ph-theme` (same contract as editor chrome + _document bootstrap). */
export interface ToggleThemeAction extends ActionBase {
  type: "toggle-theme";
  /** Optional element id to hide after toggling (e.g. mobile drawer `woh-mobile-nav`). */
  dismissTarget?: string;
  dismissMethod?: "class" | "style";
}

export type NodeAction =
  | LinkAction
  | OpenModalAction
  | ShowHideAction
  | CopyToClipboardAction
  | DownloadFileAction
  | ToggleThemeAction
  | AddToCartAction
  | ToggleCartAction
  | CartCheckoutAction
  | ManageSubscriptionAction
  | AgentSendAction
  | SetLocalStorageAction
  | RemoveLocalStorageAction
  | SetStateAction
  | ToggleStateAction
  | ClearStateAction
  | IncrementStateAction
  | DecrementStateAction;

export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";

// ─── Helpers ───────────────────────────────────────────────────────────

/** Actions that resolve to an href (render as <a>) */
export function isLinkAction(action: NodeAction | null | undefined): action is LinkAction {
  return !!action && action.type === "link";
}

/**
 * Anchor-style links — renderer attaches preventDefault + smooth-scroll behavior.
 * A unified `link` action with `href` starting `#` is an in-page anchor.
 */
export function isAnchorAction(action: NodeAction | null | undefined): boolean {
  return (
    !!action &&
    action.type === "link" &&
    typeof action.href === "string" &&
    action.href.startsWith("#")
  );
}

/** Actions that need JS event handlers at runtime */
export function isHandlerAction(
  action: NodeAction | null | undefined
): action is
  | OpenModalAction
  | ShowHideAction
  | ToggleThemeAction
  | AddToCartAction
  | ToggleCartAction
  | CartCheckoutAction
  | ManageSubscriptionAction
  | AgentSendAction
  | SetLocalStorageAction
  | RemoveLocalStorageAction
  | SetStateAction
  | ToggleStateAction
  | ClearStateAction
  | IncrementStateAction
  | DecrementStateAction {
  if (!action) return false;
  return (
    action.type === "open-modal" ||
    action.type === "show-hide" ||
    action.type === "toggle-theme" ||
    action.type === "add-to-cart" ||
    action.type === "toggle-cart" ||
    action.type === "cart-checkout" ||
    action.type === "manage-subscription" ||
    action.type === "agent-send" ||
    action.type === "set-local-storage" ||
    action.type === "remove-local-storage" ||
    action.type === "set-state" ||
    action.type === "toggle-state" ||
    action.type === "clear-state" ||
    action.type === "increment-state" ||
    action.type === "decrement-state"
  );
}

/**
 * Resolve any action to an href string for <a> tags and static HTML.
 * Returns null for actions that only work via JS handlers (open-modal, show-hide, toggle-theme).
 *
 * @param pageIndex - Page index for `ref:<pageId>` resolution. Editor callers
 *   build via `buildPageIndexFromQuery(query)`; walker callers pass
 *   `rootProps._pageIndex`. Pass null/undefined to skip ref resolution.
 */
export function actionToHref(
  action: NodeAction | null | undefined,
  pageIndex?: PageIndex | null,
  routerPath?: string
): string | null {
  if (!action) return null;

  switch (action.type) {
    case "link": {
      const h = action.href;
      if (!h) return null;
      // ref:<pageId>[/<path>][?<query>][#<hash>] — internal page reference.
      // Path / query / hash are parsed independently so an author-written
      // `ref:<pageId>/#anchor` (a bare slash before the hash) collapses to
      // `<base>#anchor` instead of `<base>/#anchor` — same-page hash links
      // must keep the URL identical so the browser scrolls instead of
      // reloading.
      if (h.startsWith("ref:")) {
        const m = h.match(/^ref:([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
        if (!m) return null;
        const [, pageId, rawPath, queryPart, hashPart] = m;
        const base = resolvePageRef(`ref:${pageId}`, pageIndex, routerPath);
        // Drop a bare "/" path — it carries no information and would force
        // `<base>/#hash` (different URL → page reload).
        const pathPart = rawPath && rawPath !== "/" ? rawPath : "";
        let out = base;
        if (pathPart) out = base === "/" ? pathPart : `${base}${pathPart}`;
        if (queryPart) out += queryPart;
        if (hashPart) out += hashPart;
        return out;
      }
      // mailto:, tel:, #anchor, https://, /relative — all use as-is
      return h;
    }

    case "open-modal":
    case "show-hide":
    case "toggle-theme":
    case "add-to-cart":
    case "toggle-cart":
    case "cart-checkout":
    case "manage-subscription":
    case "agent-send":
    case "set-local-storage":
    case "remove-local-storage":
    case "set-state":
    case "toggle-state":
    case "clear-state":
    case "increment-state":
    case "decrement-state":
    case "copy-to-clipboard":
    case "download-file":
      return null; // Handled by JS
  }
}

/**
 * Get the link target for actions that support it.
 */
export function actionTarget(action: NodeAction | null | undefined): LinkTarget | undefined {
  if (!action) return undefined;
  if (action.type === "link") return action.target;
  return undefined;
}

// ─── Action reading ────────────────────────────────────────────────────

/** Pass-through validator. Returns the action unchanged, or null if not an object. */
function normalizeAction(raw: any): NodeAction | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as NodeAction;
}

/**
 * Single read entry for any component that consumes click actions. Always
 * returns an array (length 0+), normalized so each entry is a current
 * `NodeAction` shape.
 *
 * Resolution order:
 *   1. `props.action` is a string → return `[]`. Form components reuse
 *      `props.action` for the form submission URL; that path stays string,
 *      this helper opts out so the form keeps working.
 *   2. `props.action` is an array → normalize each entry.
 *   3. `props.action` is a single object → wrap to one-element array.
 *   4. Else `[]`.
 */
export function migrateActions(props: any): NodeAction[] {
  if (!props) return [];

  // (1) Form's `props.action` is a submission URL string — opt out.
  if (typeof props.action === "string") return [];

  // (2) `props.action` is an array
  if (Array.isArray(props.action)) {
    return props.action
      .map(normalizeAction)
      .filter((a: NodeAction | null): a is NodeAction => a !== null);
  }

  // (3) `props.action` is a single object
  if (props.action && typeof props.action === "object") {
    const norm = normalizeAction(props.action);
    return norm ? [norm] : [];
  }

  return [];
}

/** Find the first link-ish action in an array (for `<a href>` rendering). */
export function findLinkAction(actions: NodeAction[]): LinkAction | undefined {
  return actions.find(isLinkAction);
}

// ─── Action type labels for UI ─────────────────────────────────────────

export const ACTION_TYPE_OPTIONS: { value: ActionType; label: string; group?: string }[] = [
  { value: "link", label: "Link" },
  { value: "open-modal", label: "Open Modal", group: "Open" },
  { value: "show-hide", label: "Show / Hide", group: "Open" },
  { value: "add-to-cart", label: "Add to Cart", group: "Commerce" },
  { value: "toggle-cart", label: "Toggle Cart", group: "Commerce" },
  { value: "cart-checkout", label: "Checkout Cart", group: "Commerce" },
  { value: "manage-subscription", label: "Manage Subscription", group: "Commerce" },
  { value: "toggle-theme", label: "Toggle light / dark", group: "System" },
  { value: "copy-to-clipboard", label: "Copy to Clipboard", group: "System" },
  { value: "download-file", label: "Download File", group: "System" },
  { value: "agent-send", label: "Send Agent Message", group: "System" },
  { value: "set-local-storage", label: "Set Local Storage", group: "Storage" },
  { value: "remove-local-storage", label: "Remove Local Storage", group: "Storage" },
  { value: "set-state", label: "Set State", group: "State" },
  { value: "toggle-state", label: "Toggle State", group: "State" },
  { value: "clear-state", label: "Clear State", group: "State" },
  { value: "increment-state", label: "Increment State", group: "State" },
  { value: "decrement-state", label: "Decrement State", group: "State" },
];
