/**
 * Action sub-forms shared by `ActionEditorPanel` (chip-list flow) and the
 * Action type defaults shared by `ActionsAddPicker`.
 *
 * The legacy default-export (single-action UI + inline `HandlersInput`) was
 * removed when the chip-list flow took over every callsite — see
 * `ActionsInput.tsx` and docs/sdk/editor-popover-pattern.md §8 "Mixed-source
 * body". This file exists to host `ACTION_DEFAULTS` and `ActionSubForm` plus
 * the per-type sub-forms (`ShowHideForm`, `ToggleThemeForm`, etc.) that
 * `ActionSubForm` switches between.
 */
import { TbChevronDown } from "react-icons/tb";
import { PeekTargetButton } from "./PeekTargetButton";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
} from "@/chrome/primitives/SearchableMenuPopover";
import { ToolbarRowFrame } from "@/chrome/primitives/ToolbarRowFrame";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import {
  type ActionType,
  type NodeAction,
  type LinkAction,
  type ToggleThemeAction,
} from "@/utils/action";
import { LinkInput } from "./LinkInput";
import { useElementPicker, type PickerFilter } from "./useElementPicker";

export const ACTION_DEFAULTS: Record<ActionType, NodeAction> = {
  link: { type: "link", href: "" },
  // Legacy types kept in the union for in-flight data — not surfaced in the dropdown.
  "link-url": { type: "link-url", url: "" },
  "link-page": { type: "link-page", pageId: "" },
  "scroll-to": { type: "scroll-to", anchor: "" },
  email: { type: "email", email: "" },
  phone: { type: "phone", phone: "" },
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
};

export function ActionSubForm({
  action,
  patch,
  replace,
}: {
  action: NodeAction;
  patch: (p: any) => void;
  replace: (next: NodeAction) => void;
}) {
  switch (action.type) {
    case "link":
      return <LinkInput action={action as LinkAction} onChange={replace} />;
    // Legacy types — render the unified LinkInput so old data is editable
    // before migration runs. The shim normalizes on next save.
    case "link-url":
    case "link-page":
    case "scroll-to":
    case "email":
    case "phone":
      return (
        <LinkInput
          action={{
            type: "link",
            href:
              action.type === "link-url"
                ? action.url
                : action.type === "link-page"
                  ? action.pageId
                    ? `ref:${action.pageId}${action.path ?? ""}`
                    : ""
                  : action.type === "scroll-to"
                    ? action.anchor
                      ? `#${action.anchor}`
                      : ""
                    : action.type === "email"
                      ? action.email
                        ? `mailto:${action.email}${
                            action.subject || action.body
                              ? `?${new URLSearchParams({
                                  ...(action.subject ? { subject: action.subject } : {}),
                                  ...(action.body ? { body: action.body } : {}),
                                }).toString()}`
                              : ""
                          }`
                        : ""
                      : action.phone
                        ? `tel:${action.phone}`
                        : "",
            ...((action.type === "link-url" || action.type === "link-page") && action.target
              ? { target: action.target }
              : {}),
          }}
          onChange={replace}
        />
      );
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
      return <ShowHideForm action={action} patch={patch} />;
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
    default:
      return null;
  }
}

function ToggleThemeForm({
  action,
  patch,
}: {
  action: ToggleThemeAction;
  patch: (p: any) => void;
}) {
  return (
    <>
      <p className="text-neutral-content text-[10px] leading-snug">
        Toggles the site light/dark preference (stored in{" "}
        <code className="text-[9px]">ph-theme</code>, same as the editor chrome).
      </p>
      <TargetPickerInput
        value={action.dismissTarget || ""}
        filter="all"
        label="Dismiss target (optional)"
        onChange={(dismissTarget: string) => patch({ dismissTarget: dismissTarget || undefined })}
      />
      {action.dismissTarget ? (
        <ToolbarDropdown
          value={action.dismissMethod || "style"}
          onChange={(val: string) => patch({ dismissMethod: val as "class" | "style" })}
          propKey="toggleThemeDismissMethod"
        >
          <option value="style">Hide: style (display:none)</option>
          <option value="class">Hide: .hidden class</option>
        </ToolbarDropdown>
      ) : null}
    </>
  );
}

function AddToCartForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <p className="text-neutral-content text-[10px] leading-snug">
        Adds the current product to the shopping cart. Must be inside a data-bound Container.
      </p>
      <ToolbarRowFrame>
        <label className="text-neutral-content shrink-0 px-1 text-xs">Quantity</label>
        <input
          type="number"
          min={1}
          max={99}
          value={action.quantity || 1}
          onChange={e => patch({ quantity: parseInt(e.target.value) || 1 })}
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
        />
      </ToolbarRowFrame>
    </>
  );
}

// ─── Sub-forms ─────────────────────────────────────────────────────────

function ShowHideForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <div className="flex items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <TargetPickerInput
            value={action.target}
            filter="all"
            label="Target"
            onChange={target => patch({ target })}
          />
        </div>
        <PeekTargetButton target={action.target} />
      </div>
      <div className="flex gap-2">
        <ToolbarDropdown
          value={action.direction || "toggle"}
          onChange={(val: string) => patch({ direction: val })}
          propKey="actionDirection"
        >
          <option value="toggle">Toggle</option>
          <option value="show">Show</option>
          <option value="hide">Hide</option>
          <option value="tab">Tab</option>
        </ToolbarDropdown>
        <ToolbarDropdown
          value={action.trigger || "click"}
          onChange={(val: string) => patch({ trigger: val })}
          propKey="actionTrigger"
        >
          <option value="click">On Click</option>
          <option value="hover">On Hover</option>
        </ToolbarDropdown>
      </div>
    </>
  );
}

// ─── Shared pieces ─────────────────────────────────────────────────────

function CopyToClipboardForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <ToolbarRowFrame>
      <input
        type="text"
        defaultValue={action.text || ""}
        onChange={e => patch({ text: e.target.value })}
        placeholder="Text to copy..."
        className="h-full w-full bg-transparent px-1 text-xs outline-none"
        aria-label="Text to copy"
      />
    </ToolbarRowFrame>
  );
}

function DownloadFileForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <ToolbarRowFrame>
        <input
          type="url"
          defaultValue={action.url || ""}
          onChange={e => patch({ url: e.target.value })}
          placeholder="https://example.com/file.pdf"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
          aria-label="File URL"
        />
      </ToolbarRowFrame>
      <ToolbarRowFrame>
        <input
          type="text"
          defaultValue={action.filename || ""}
          onChange={e => patch({ filename: e.target.value })}
          placeholder="Filename (optional)"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
          aria-label="Download filename"
        />
      </ToolbarRowFrame>
    </>
  );
}

/**
 * Show-hide / open-modal target picker.
 *
 * Free-text input is the source of truth — users can always type / paste a
 * target id, even when the page hasn't loaded the candidate list yet, when
 * the target lives on another page, or when no canvas node is enumerable.
 * The trailing chevron opens a `SearchableMenuPopover` of discovered targets
 * (any node with `attrs.id`, `props.id`, or — for overlay components — a
 * `props.anchor`). Selecting an item writes its id into the input.
 */
function TargetPickerInput({
  value,
  filter,
  label,
  onChange,
}: {
  value: string;
  filter: PickerFilter;
  label: string;
  onChange: (next: string) => void;
}) {
  const options = useElementPicker(filter);
  const items: SearchableMenuItem<string>[] = options.map(opt => ({
    id: opt.anchor,
    label: opt.label,
    hint: opt.anchor,
    keywords: [opt.anchor, opt.componentType],
    data: opt.anchor,
  }));
  const lower = label.toLowerCase();
  return (
    <ToolbarRowFrame
      trailing={
        <SearchableMenuPopover<string>
          items={items}
          onSelect={item => onChange(item.data ?? item.id)}
          trigger={<TbChevronDown className="size-3.5" aria-hidden />}
          triggerAriaLabel={`Pick ${lower} from page`}
          triggerClassName="text-neutral-content hover:text-base-content hover:bg-base-200 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors"
          searchPlaceholder={`Search ${lower}…`}
          emptyMessage={`No ${lower}s on this page yet`}
          anchor="bottom end"
        />
      }
    >
      <input
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={`${label} id…`}
        className="h-full w-full bg-transparent px-1 text-xs outline-none"
        aria-label={label}
      />
    </ToolbarRowFrame>
  );
}
