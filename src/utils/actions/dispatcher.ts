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
import { fireConversion } from "./conversion";
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
import { chain, type ActionContext } from "./internal";

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
  // Link family handles its own anchor-vs-URL branching AND owns conversion
  // firing (it needs the navigation-aware event_callback path), so we return
  // early without the conversion post-pass below when it claims the action.
  if (attachLink(prop, action, enabled, context)) return;

  switch (action.type) {
    case "open-modal":
      attachModal(prop, action, enabled);
      break;
    case "toggle-theme":
      attachTheme(prop, action, enabled);
      break;
    case "add-to-cart":
      attachAddToCart(prop, action, enabled, context);
      break;
    case "toggle-cart":
      attachToggleCart(prop, action, enabled);
      break;
    case "cart-checkout":
      attachCartCheckout(prop, action, enabled);
      break;
    case "agent-send":
      attachAgentSend(prop, action, enabled, context);
      break;
    case "set-local-storage":
      attachSetLocalStorage(prop, action, enabled);
      break;
    case "remove-local-storage":
      attachRemoveLocalStorage(prop, action, enabled);
      break;
    case "manage-subscription":
      attachManageSubscription(prop, action, enabled);
      break;
    case "set-state":
      attachSetState(prop, action, enabled, context);
      break;
    case "toggle-state":
      attachToggleState(prop, action, enabled, context);
      break;
    case "clear-state":
      attachClearState(prop, action, enabled, context);
      break;
    case "increment-state":
    case "decrement-state":
      attachStateStep(prop, action, enabled, context);
      break;
    case "show-hide":
      attachShowHide(prop, action, enabled);
      break;
    case "copy-to-clipboard":
      attachCopyToClipboard(prop, action, enabled, context);
      break;
    case "download-file":
      attachDownloadFile(prop, action, enabled, context);
      break;
    default:
      return;
  }

  // Post-pass: fire conversion after the action's onClick has run. Skipped
  // for link/scroll actions (link.ts fires its own — see attachLink).
  if (action.conversion && !enabled) {
    chain(prop, "onClick", (e, run) => {
      run(e);
      fireConversion(action.conversion);
    });
  }
}
