/**
 * Action sub-forms shared by `ActionEditorPanel` (chip-list flow) and the
 * Action type defaults shared by `ActionsAddPicker`.
 *
 * The legacy default-export (single-action UI + inline `HandlersInput`) was
 * removed when the chip-list flow took over every callsite — see
 * `ActionsInput.tsx` and docs/sdk/editor-popover-pattern.md §8 "Mixed-source
 * body". This file hosts `ACTION_DEFAULTS` and the `ActionSubForm` dispatcher;
 * each per-type sub-form lives under `subforms/`.
 */
import type { ActionType, NodeAction, ToggleThemeAction } from "@/utils/action";
import { AddToCartForm } from "./subforms/CartSubForm";
import {
  CopyToClipboardForm,
  DownloadFileForm,
} from "./subforms/ClipboardSubForms";
import { LinkSubForm } from "./subforms/LinkSubForm";
import {
  RemoveLocalStorageForm,
  SetLocalStorageForm,
} from "./subforms/LocalStorageSubForms";
import { ShowHideSubForm } from "./subforms/ShowHideSubForm";
import {
  ClearStateForm,
  SetStateForm,
  ToggleStateForm,
} from "./subforms/StateSubForms";
import { ToggleThemeForm } from "./subforms/ThemeSubForm";
import { TargetPickerInput } from "./shared/TargetPickerInput";

export const ACTION_DEFAULTS: Record<ActionType, NodeAction> = {
  link: { type: "link", href: "" },
  "open-modal": { type: "open-modal", anchor: "" },
  "show-hide": { type: "show-hide", target: "", direction: "toggle", trigger: "click" },
  "copy-to-clipboard": { type: "copy-to-clipboard", text: "" },
  "download-file": { type: "download-file", url: "" },
  "toggle-theme": { type: "toggle-theme" },
  "add-to-cart": { type: "add-to-cart" },
  "toggle-cart": { type: "toggle-cart" },
  "cart-checkout": { type: "cart-checkout" },
  "manage-subscription": { type: "manage-subscription" },
  "agent-send": { type: "agent-send", field: "agentMessage" },
  "set-local-storage": { type: "set-local-storage", key: "", value: "" },
  "remove-local-storage": { type: "remove-local-storage", key: "" },
  "set-state": { type: "set-state", key: "", value: "" },
  "toggle-state": { type: "toggle-state", key: "" },
  "clear-state": { type: "clear-state", key: "" },
  "increment-state": { type: "increment-state", key: "", step: 1 },
  "decrement-state": { type: "decrement-state", key: "", step: 1 },
};

export function ActionSubForm({
  action,
  patch,
  replace,
  selfId,
  ensureSelfId,
}: {
  action: NodeAction;
  patch: (p: any) => void;
  replace: (next: NodeAction) => void;
  /** DOM-discoverable id of the node owning this action — surfaces a "self"
   *  entry in state-key pickers. Undefined when the node has no anchor set. */
  selfId?: string;
  /** Returns a stable self id, stamping `attrs.id` when none exists yet. */
  ensureSelfId?: () => string;
}) {
  switch (action.type) {
    case "link":
      return <LinkSubForm action={action} replace={replace} />;
    case "open-modal":
      return (
        <TargetPickerInput
          value={(action as any).anchor}
          filter="modal"
          label="Modal"
          onChange={anchor => patch({ anchor })}
        />
      );
    case "show-hide":
      return <ShowHideSubForm action={action} patch={patch} />;
    case "copy-to-clipboard":
      return <CopyToClipboardForm action={action} patch={patch} />;
    case "download-file":
      return <DownloadFileForm action={action} patch={patch} />;
    case "toggle-theme":
      return <ToggleThemeForm action={action as ToggleThemeAction} patch={patch} />;
    case "add-to-cart":
      return <AddToCartForm action={action} patch={patch} />;
    case "toggle-cart":
      return (
        <p className="text-neutral-content text-[10px] leading-snug">
          Opens or closes the shopping cart drawer.
        </p>
      );
    case "cart-checkout":
      return (
        <p className="text-neutral-content text-[10px] leading-snug">
          Redirects to Stripe Checkout with the current cart contents.
        </p>
      );
    case "manage-subscription":
      return (
        <p className="text-neutral-content text-[10px] leading-snug">
          Redirects logged-in customers to the Stripe customer portal to manage subscriptions.
        </p>
      );
    case "set-local-storage":
      return <SetLocalStorageForm action={action as any} patch={patch} />;
    case "remove-local-storage":
      return <RemoveLocalStorageForm action={action as any} patch={patch} />;
    case "set-state":
      return (
        <SetStateForm
          action={action as any}
          patch={patch}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
        />
      );
    case "toggle-state":
      return (
        <ToggleStateForm
          action={action as any}
          patch={patch}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
        />
      );
    case "clear-state":
      return (
        <ClearStateForm
          action={action as any}
          patch={patch}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
        />
      );
    default:
      return null;
  }
}
