/**
 * Unified action system — replaces legacy click/url/urlTarget/clickMode props
 * with a single `action: NodeAction` prop on interactive components.
 */

import { resolvePageRef } from "./pageManagement";

// ─── Types ─────────────────────────────────────────────────────────────

export type ActionType =
  | "link-url"
  | "link-page"
  | "scroll-to"
  | "open-modal"
  | "email"
  | "phone"
  | "show-hide"
  | "copy-to-clipboard"
  | "download-file"
  | "toggle-theme"
  | "add-to-cart"
  | "toggle-cart"
  | "cart-checkout";

interface ActionBase {
  type: ActionType;
}

export interface LinkUrlAction extends ActionBase {
  type: "link-url";
  url: string;
  target?: LinkTarget;
}

export interface LinkPageAction extends ActionBase {
  type: "link-page";
  pageId: string; // CraftJS node ID
  target?: LinkTarget;
}

export interface ScrollToAction extends ActionBase {
  type: "scroll-to";
  anchor: string;
}

export interface OpenModalAction extends ActionBase {
  type: "open-modal";
  anchor: string;
}

export interface EmailAction extends ActionBase {
  type: "email";
  email: string;
  subject?: string;
  body?: string;
}

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
  /** Quantity to add (default 1) */
  quantity?: number;
}

/** Toggle the shopping cart drawer open/closed. */
export interface ToggleCartAction extends ActionBase {
  type: "toggle-cart";
}

/** Trigger Stripe checkout with current cart contents. */
export interface CartCheckoutAction extends ActionBase {
  type: "cart-checkout";
}

/** Toggle `html.dark` and persist `ph-theme` (same contract as editor chrome + _document bootstrap). */
export interface ToggleThemeAction extends ActionBase {
  type: "toggle-theme";
  /** Optional element id to hide after toggling (e.g. mobile drawer `woh-mobile-nav`). */
  dismissTarget?: string;
  dismissMethod?: "class" | "style";
}

export type NodeAction =
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
  | CartCheckoutAction;

export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";

// ─── Helpers ───────────────────────────────────────────────────────────

/** Actions that resolve to an href (render as <a>) */
export function isLinkAction(
  action: NodeAction | null | undefined
): action is LinkUrlAction | LinkPageAction | EmailAction | PhoneAction | ScrollToAction {
  if (!action) return false;
  return (
    action.type === "link-url" ||
    action.type === "link-page" ||
    action.type === "email" ||
    action.type === "phone" ||
    action.type === "scroll-to"
  );
}

/** Actions that need JS event handlers at runtime */
export function isHandlerAction(
  action: NodeAction | null | undefined
): action is OpenModalAction | ShowHideAction | ToggleThemeAction | AddToCartAction | ToggleCartAction | CartCheckoutAction {
  if (!action) return false;
  return action.type === "open-modal" || action.type === "show-hide" || action.type === "toggle-theme" || action.type === "add-to-cart" || action.type === "toggle-cart" || action.type === "cart-checkout";
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
    case "link-url":
      return action.url || null;

    case "link-page":
      if (!action.pageId) return null;
      return resolvePageRef(`ref:${action.pageId}`, query, routerPath);

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
      return null; // Handled by JS
  }
}

/**
 * Get the link target for actions that support it.
 */
export function actionTarget(action: NodeAction | null | undefined): LinkTarget | undefined {
  if (!action) return undefined;
  if (action.type === "link-url" || action.type === "link-page") return action.target;
  if (action.type === "scroll-to" || action.type === "email" || action.type === "phone")
    return undefined;
  return undefined;
}

// ─── Migration ─────────────────────────────────────────────────────────

/**
 * Convert legacy click/url/urlTarget props to NodeAction.
 * Called at render time in components to handle old saved data.
 */
export function migrateAction(props: any): NodeAction | null {
  // Already migrated
  if (props.action) return props.action;

  // Old link mode
  if (props.url && typeof props.url === "string") {
    if (props.url.startsWith("ref:")) {
      return {
        type: "link-page",
        pageId: props.url.replace("ref:", ""),
        target: props.urlTarget,
      };
    }
    return { type: "link-url", url: props.url, target: props.urlTarget };
  }

  // Old action mode
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

export const ACTION_TYPE_OPTIONS: { value: ActionType; label: string }[] = [
  { value: "link-url", label: "Link to URL" },
  { value: "link-page", label: "Link to Page" },
  { value: "scroll-to", label: "Scroll to Section" },
  { value: "open-modal", label: "Open Modal" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "show-hide", label: "Show / Hide" },
  { value: "copy-to-clipboard", label: "Copy to Clipboard" },
  { value: "download-file", label: "Download File" },
  { value: "toggle-theme", label: "Toggle light / dark" },
  { value: "add-to-cart", label: "Add to Cart" },
  { value: "toggle-cart", label: "Toggle Cart" },
  { value: "cart-checkout", label: "Checkout Cart" },
];
