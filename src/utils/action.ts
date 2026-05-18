/**
 * Unified action system — replaces legacy click/url/urlTarget/clickMode props
 * with a single `action: NodeAction` prop on interactive components.
 */

import { resolvePageRef, type PageIndex } from "./page/pageManagement";
import type { ConditionGroup } from "./conditions/types";

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
  | "agent-send"
  | "set-local-storage"
  | "remove-local-storage"
  | "set-state"
  | "toggle-state"
  | "clear-state"
  | "increment-state"
  | "decrement-state";

interface ActionBase {
  type: ActionType;
  /**
   * Optional gate — action only fires when conditions evaluate truthy. Same
   * shape as node-level visibility / page-access conditions
   * (`packages/sdk/src/utils/conditions/types.ts`). Multiple groups are OR'd
   * (Elementor-style); within a group, `logic: "all" | "any"` chooses AND/OR.
   *
   * Currently only `fireLoadAction` reads this field — load-trigger banners
   * use it for first-visit gating (replaces the old `gateLocalStorageKey`).
   * Click/hover gating in `addActionHandlers` is a follow-up.
   */
  conditions?: ConditionGroup[];
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
  /**
   * @deprecated Migrated to `conditions` by `normalizeAction` —
   * `{ type: "localStorage", key, operator: "not-exists" }`. Kept in the
   * union only so old in-flight data passes type checks until rewritten.
   */
  gateLocalStorageKey?: string;
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
   * products). Replaces the legacy `data-variant-form` DOM scrape.
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
 * Write a key/value pair to `window.localStorage`. Pairs naturally with
 * a load-trigger `show-hide` action whose `gateLocalStorageKey` matches —
 * once the key is set, the banner / popup is gated out on subsequent visits.
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
export function isLinkAction(
  action: NodeAction | null | undefined
): action is
  | LinkAction
  | LinkUrlAction
  | LinkPageAction
  | EmailAction
  | PhoneAction
  | ScrollToAction {
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

    case "link-url":
      return action.url || null;

    case "link-page": {
      if (!action.pageId) return null;
      const base = resolvePageRef(`ref:${action.pageId}`, pageIndex, routerPath);
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
      return {
        type: "link",
        href: action.url ?? "",
        ...(action.target ? { target: action.target } : {}),
      };
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

/** Normalize a single raw action: pass through if already valid, or migrate legacy link-ish to `link`. */
function normalizeAction(raw: any): NodeAction | null {
  if (!raw || typeof raw !== "object") return null;
  const link = legacyActionToLink(raw);
  if (link) return link;

  // Legacy `gateLocalStorageKey` on load-trigger show-hide → fold into the
  // generic `conditions` array so action gating uses one mechanism. Only
  // fires when the action doesn't already carry conditions (idempotent —
  // re-running the migration on already-normalized data is a no-op).
  if (
    raw.type === "show-hide" &&
    raw.trigger === "load" &&
    typeof raw.gateLocalStorageKey === "string" &&
    raw.gateLocalStorageKey
  ) {
    const hasConditions = Array.isArray(raw.conditions) && raw.conditions.length > 0;
    if (!hasConditions) {
      const { gateLocalStorageKey, ...rest } = raw;
      return {
        ...rest,
        conditions: [
          {
            logic: "all",
            conditions: [
              {
                type: "localStorage",
                key: gateLocalStorageKey,
                operator: "not-exists",
                value: "",
              },
            ],
          },
        ],
      } as NodeAction;
    }
    // Already has conditions — strip the dead field, trust conditions.
    const { gateLocalStorageKey, ...rest } = raw;
    return rest as NodeAction;
  }

  return raw as NodeAction;
}

/**
 * Single read entry for any component that consumes click actions. Always
 * returns an array (length 0+), normalized so each entry is a current
 * `NodeAction` shape.
 *
 * Resolution order — handles every saved data shape:
 *   1. `props.action` is a string → return `[]`. Form components reuse
 *      `props.action` for the form submission URL; that path stays string,
 *      this helper opts out so the form keeps working.
 *   2. `props.action` is an array → normalize each entry.
 *   3. `props.action` is a single object → wrap to one-element array.
 *   4. `props.actions` is a non-empty array → normalize each entry.
 *      (Legacy plural-prop window; reading kept for back-compat.)
 *   5. Legacy `props.url` / `props.urlTarget` → wrap as one `link` action.
 *   6. Legacy `props.click` (show-hide pre-unification) → wrap as one show-hide action.
 *   7. Else `[]`.
 */
export function migrateActions(props: any): NodeAction[] {
  if (!props) return [];

  // (1) Form's `props.action` is a submission URL string — opt out.
  if (typeof props.action === "string") return [];

  // (2) / (3) `props.action`
  if (Array.isArray(props.action)) {
    return props.action
      .map(normalizeAction)
      .filter((a: NodeAction | null): a is NodeAction => a !== null);
  }
  if (props.action && typeof props.action === "object") {
    const norm = normalizeAction(props.action);
    return norm ? [norm] : [];
  }

  // (4) Legacy plural-prop window
  if (Array.isArray(props.actions) && props.actions.length > 0) {
    return props.actions
      .map(normalizeAction)
      .filter((a: NodeAction | null): a is NodeAction => a !== null);
  }

  // (5) Old link mode (props.url / props.urlTarget) — emit unified `link` directly
  if (props.url && typeof props.url === "string") {
    return [
      {
        type: "link",
        href: props.url,
        ...(props.urlTarget ? { target: props.urlTarget } : {}),
      },
    ];
  }

  // (6) Old action mode (props.click)
  const click = props.click;
  if (click?.type && click?.value) {
    return [
      {
        type: "show-hide",
        target: click.value,
        direction: click.direction || "toggle",
        method: click.method,
        group: click.group,
        trigger: click.type,
      },
    ];
  }

  return [];
}

/**
 * @deprecated Use `migrateActions` and pick the first entry. Kept as a
 * one-line shim because `utils/index.ts` re-exports it for external SDK
 * consumers.
 */
export function migrateAction(props: any): NodeAction | null {
  return migrateActions(props)[0] ?? null;
}

/** Find the first link-ish action in an array (for `<a href>` rendering). */
export function findLinkAction(
  actions: NodeAction[]
):
  | LinkAction
  | LinkUrlAction
  | LinkPageAction
  | EmailAction
  | PhoneAction
  | ScrollToAction
  | undefined {
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
