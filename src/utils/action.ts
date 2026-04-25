/**
 * Unified action system — replaces legacy click/url/urlTarget/clickMode props
 * with a single `action: NodeAction` prop on interactive components.
 */

import { resolvePageRef } from "./pageManagement";

// ─── Types ─────────────────────────────────────────────────────────────

export type ActionType =
  | "link"
  /** @deprecated migrated to "link" via `legacyActionToLink` — kept in union for in-flight data */
  | "link-url"
  /** @deprecated migrated to "link" via `legacyActionToLink` — kept in union for in-flight data */
  | "link-page"
  /** @deprecated migrated to "link" via `legacyActionToLink` — kept in union for in-flight data */
  | "scroll-to"
  /** @deprecated migrated to "link" via `legacyActionToLink` — kept in union for in-flight data */
  | "email"
  /** @deprecated migrated to "link" via `legacyActionToLink` — kept in union for in-flight data */
  | "phone"
  | "open-modal"
  | "show-hide"
  | "copy-to-clipboard"
  | "download-file"
  | "toggle-theme"
  | "add-to-cart"
  | "toggle-cart"
  | "cart-checkout"
  | "manage-subscription"
  | "agent-send";

interface ActionBase {
  type: ActionType;
}

/**
 * Unified link action — replaces the 5 legacy link-ish types
 * (`link-url`, `link-page`, `scroll-to`, `email`, `phone`).
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

/** @deprecated use `LinkAction` */
export interface LinkUrlAction extends ActionBase {
  type: "link-url";
  url: string;
  target?: LinkTarget;
}

/** @deprecated use `LinkAction` with `href: "ref:<pageId>[/path]"` */
export interface LinkPageAction extends ActionBase {
  type: "link-page";
  pageId: string; // CraftJS node ID
  /**
   * Optional path segments to append after the resolved page URL (e.g. "/{{item.slug}}"
   * for a PDP in a storefront). Interpolated against the current item context downstream.
   */
  path?: string;
  target?: LinkTarget;
}

/** @deprecated use `LinkAction` with `href: "#<anchor>"` */
export interface ScrollToAction extends ActionBase {
  type: "scroll-to";
  anchor: string;
}

export interface OpenModalAction extends ActionBase {
  type: "open-modal";
  anchor: string;
}

/** @deprecated use `LinkAction` with `href: "mailto:<email>?subject=…&body=…"` */
export interface EmailAction extends ActionBase {
  type: "email";
  email: string;
  subject?: string;
  body?: string;
}

/** @deprecated use `LinkAction` with `href: "tel:<phone>"` */
export interface PhoneAction extends ActionBase {
  type: "phone";
  phone: string;
}

export interface ShowHideAction extends ActionBase {
  type: "show-hide";
  target: string;
  direction: "show" | "hide" | "toggle" | "tab";
  method?: "class" | "style";
  group?: string;
  trigger?: "click" | "hover";
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
 * ancestor, dispatches `pagehub:agent-send` on that ancestor with `{ value }`,
 * then clears the field. The `AgentChat` app component listens and calls its
 * `send()` runtime.
 */
export interface AgentSendAction extends ActionBase {
  type: "agent-send";
  /** Name of the form field holding the composed message (default: "agentMessage"). */
  field?: string;
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
  | LinkUrlAction
  | LinkPageAction
  | ScrollToAction
  | OpenModalAction
  | EmailAction
  | PhoneAction
  | ShowHideAction
  | CopyToClipboardAction
  | DownloadFileAction
  | ToggleThemeAction
  | AddToCartAction
  | ToggleCartAction
  | CartCheckoutAction
  | ManageSubscriptionAction
  | AgentSendAction;

export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";

// ─── Helpers ───────────────────────────────────────────────────────────

/** Actions that resolve to an href (render as <a>) */
export function isLinkAction(
  action: NodeAction | null | undefined
): action is LinkAction | LinkUrlAction | LinkPageAction | EmailAction | PhoneAction | ScrollToAction {
  if (!action) return false;
  return (
    action.type === "link" ||
    action.type === "link-url" ||
    action.type === "link-page" ||
    action.type === "email" ||
    action.type === "phone" ||
    action.type === "scroll-to"
  );
}

/**
 * Anchor-style links — renderer attaches preventDefault + smooth-scroll behavior.
 * Covers legacy `scroll-to` and the new unified `link` with `href` starting `#`.
 */
export function isAnchorAction(action: NodeAction | null | undefined): boolean {
  if (!action) return false;
  if (action.type === "scroll-to") return true;
  if (action.type === "link" && typeof action.href === "string" && action.href.startsWith("#"))
    return true;
  return false;
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
  | AgentSendAction {
  if (!action) return false;
  return (
    action.type === "open-modal" ||
    action.type === "show-hide" ||
    action.type === "toggle-theme" ||
    action.type === "add-to-cart" ||
    action.type === "toggle-cart" ||
    action.type === "cart-checkout" ||
    action.type === "manage-subscription" ||
    action.type === "agent-send"
  );
}

/**
 * Resolve any action to an href string for <a> tags and static HTML.
 * Returns null for actions that only work via JS handlers (open-modal, show-hide, toggle-theme).
 */
export function actionToHref(
  action: NodeAction | null | undefined,
  query?: any,
  routerPath?: string
): string | null {
  if (!action) return null;

  switch (action.type) {
    case "link": {
      const h = action.href;
      if (!h) return null;
      // ref:<pageId>[/<path>|?<query>|#<hash>] — internal page reference
      if (h.startsWith("ref:")) {
        const m = h.match(/^ref:([^/?#]+)(.*)$/);
        if (!m) return null;
        const [, pageId, suffix] = m;
        const base = resolvePageRef(`ref:${pageId}`, query, routerPath);
        if (!suffix) return base;
        const isQueryOrHash = suffix.startsWith("?") || suffix.startsWith("#");
        if (isQueryOrHash) return `${base}${suffix}`;
        const slash = suffix.startsWith("/") ? suffix : `/${suffix}`;
        return base === "/" ? slash : `${base}${slash}`;
      }
      // mailto:, tel:, #anchor, https://, /relative — all use as-is
      return h;
    }

    case "link-url":
      return action.url || null;

    case "link-page": {
      if (!action.pageId) return null;
      const base = resolvePageRef(`ref:${action.pageId}`, query, routerPath);
      if (!action.path) return base;
      const p = action.path;
      const isQueryOrHash = p.startsWith("?") || p.startsWith("#");
      const suffix = p.startsWith("/") || isQueryOrHash ? p : `/${p}`;
      if (isQueryOrHash) return `${base}${suffix}`;
      return base === "/" ? suffix : `${base}${suffix}`;
    }

    case "scroll-to":
      return action.anchor ? `#${action.anchor}` : null;

    case "email": {
      if (!action.email) return null;
      const params = new URLSearchParams();
      if (action.subject) params.set("subject", action.subject);
      if (action.body) params.set("body", action.body);
      const qs = params.toString();
      return `mailto:${action.email}${qs ? `?${qs}` : ""}`;
    }

    case "phone":
      return action.phone ? `tel:${action.phone}` : null;

    case "open-modal":
    case "show-hide":
    case "toggle-theme":
    case "add-to-cart":
    case "toggle-cart":
    case "cart-checkout":
    case "manage-subscription":
    case "agent-send":
      return null; // Handled by JS
  }
}

/**
 * Get the link target for actions that support it.
 */
export function actionTarget(action: NodeAction | null | undefined): LinkTarget | undefined {
  if (!action) return undefined;
  if (action.type === "link") return action.target;
  if (action.type === "link-url" || action.type === "link-page") return action.target;
  return undefined;
}

// ─── Migration ─────────────────────────────────────────────────────────

/** Build a `mailto:` URL with optional `?subject=…&body=…` querystring. */
function encodeMailto(a: { email?: string; subject?: string; body?: string }): string {
  if (!a.email) return "";
  const params = new URLSearchParams();
  if (a.subject) params.set("subject", a.subject);
  if (a.body) params.set("body", a.body);
  const qs = params.toString();
  return `mailto:${a.email}${qs ? `?${qs}` : ""}`;
}

/**
 * Pure mapping from any of the 5 legacy link-ish action types to the unified `LinkAction`.
 * Idempotent — passing an already-`link` action returns it as-is.
 *
 * Used by:
 *   - `migrateAction()` (render-time runtime shim)
 *   - `scripts/migrate-actions-to-link.mjs` (file walker for blocks/templates)
 *   - `scripts/migrate-mongo-actions-to-link.mjs` (Mongo cursor for user sites)
 *
 * Returns `null` for non-link-ish actions (caller passes them through unchanged).
 */
export function legacyActionToLink(action: any): LinkAction | null {
  if (!action || typeof action !== "object") return null;
  switch (action.type) {
    case "link":
      return action as LinkAction;
    case "link-url":
      return { type: "link", href: action.url ?? "", ...(action.target ? { target: action.target } : {}) };
    case "link-page":
      return {
        type: "link",
        href: action.pageId ? `ref:${action.pageId}${action.path ?? ""}` : "",
        ...(action.target ? { target: action.target } : {}),
      };
    case "scroll-to":
      return { type: "link", href: action.anchor ? `#${action.anchor}` : "" };
    case "email":
      return { type: "link", href: encodeMailto(action) };
    case "phone":
      return { type: "link", href: action.phone ? `tel:${action.phone}` : "" };
    default:
      return null;
  }
}

/**
 * Convert legacy click/url/urlTarget props to NodeAction.
 * Called at render time in components to handle old saved data.
 */
export function migrateAction(props: any): NodeAction | null {
  // Already migrated — pass through, but normalize 5 legacy link-ish types to unified `link`
  if (props.action) {
    const link = legacyActionToLink(props.action);
    if (link) return link; // Either already `link` (idempotent) or one of the 5 legacy types
    return props.action; // Non-link action (modal, cart, etc.) — pass through unchanged
  }

  // Old link mode (props.url / props.urlTarget) — emit unified `link` directly
  if (props.url && typeof props.url === "string") {
    if (props.url.startsWith("ref:")) {
      return {
        type: "link",
        href: props.url, // already in `ref:<pageId>` form
        ...(props.urlTarget ? { target: props.urlTarget } : {}),
      };
    }
    return {
      type: "link",
      href: props.url,
      ...(props.urlTarget ? { target: props.urlTarget } : {}),
    };
  }

  // Old action mode (props.click)
  const click = props.click;
  if (click?.type && click?.value) {
    return {
      type: "show-hide",
      target: click.value,
      direction: click.direction || "toggle",
      method: click.method,
      group: click.group,
      trigger: click.type, // "click" | "hover"
    };
  }

  return null;
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
];
