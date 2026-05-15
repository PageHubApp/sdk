/**
 * Public entry — `addActionHandlers` walks an action array and dispatches
 * each one to the matching per-type handler in `handlers/`. Handlers compose
 * onto existing event props (never overwrite), so multi-action chains fire
 * in array order on a single click.
 *
 * Anchor links and `link` actions are dispatched here too: anchor → smooth
 * scroll, link → `e.preventDefault()` + `window.location.assign(href)` /
 * `window.open(href, target)`. Callers that have a single non-anchor `link`
 * action should skip this function and let the `<a href>` navigate
 * natively (faster, no JS hop) — see Button.tsx for the policy.
 */
import type { NodeAction } from "../action";
import {
  attachAddToCart,
  attachCartCheckout,
  attachManageSubscription,
  attachToggleCart,
} from "./handlers/cart";
import { attachAgentSend } from "./handlers/agent";
import { attachCopyToClipboard } from "./handlers/clipboard";
import { attachDownloadFile } from "./handlers/download";
import { attachLink } from "./handlers/link";
import { attachRemoveLocalStorage, attachSetLocalStorage } from "./handlers/localStorage";
import { attachModal } from "./handlers/modal";
import { attachShowHide } from "./handlers/showHide";
import {
  attachClearState,
  attachSetState,
  attachStateStep,
  attachToggleState,
} from "./handlers/state";
import { attachTheme } from "./handlers/theme";
import type { ActionContext } from "./internal";

export type { ActionContext } from "./internal";

export function addActionHandlers(
  prop: any,
  actions: NodeAction[] | NodeAction | null | undefined,
  enabled: boolean,
  context?: ActionContext
) {
  const list: NodeAction[] = Array.isArray(actions) ? actions : actions ? [actions] : [];
  if (list.length === 0) return;

  for (const action of list) {
    attachOne(prop, action, enabled, context);
  }
}

function attachOne(prop: any, action: NodeAction, enabled: boolean, context?: ActionContext) {
  // Link family handles its own anchor-vs-URL branching and returns true
  // when it's claimed the action.
  if (attachLink(prop, action, enabled, context)) return;

  switch (action.type) {
    case "open-modal":
      attachModal(prop, action, enabled);
      return;
    case "toggle-theme":
      attachTheme(prop, action, enabled);
      return;
    case "add-to-cart":
      attachAddToCart(prop, action, enabled, context);
      return;
    case "toggle-cart":
      attachToggleCart(prop, action, enabled);
      return;
    case "cart-checkout":
      attachCartCheckout(prop, action, enabled);
      return;
    case "agent-send":
      attachAgentSend(prop, action, enabled, context);
      return;
    case "set-local-storage":
      attachSetLocalStorage(prop, action, enabled);
      return;
    case "remove-local-storage":
      attachRemoveLocalStorage(prop, action, enabled);
      return;
    case "manage-subscription":
      attachManageSubscription(prop, action, enabled);
      return;
    case "set-state":
      attachSetState(prop, action, enabled, context);
      return;
    case "toggle-state":
      attachToggleState(prop, action, enabled, context);
      return;
    case "clear-state":
      attachClearState(prop, action, enabled, context);
      return;
    case "increment-state":
    case "decrement-state":
      attachStateStep(prop, action, enabled, context);
      return;
    case "show-hide":
      attachShowHide(prop, action, enabled);
      return;
    case "copy-to-clipboard":
      attachCopyToClipboard(prop, action, enabled, context);
      return;
    case "download-file":
      attachDownloadFile(prop, action, enabled, context);
      return;
  }
}
