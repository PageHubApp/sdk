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
import { ActionConditionsEditor } from "../conditions/ActionConditionsEditor";

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

function SetStateForm({
  action,
  patch,
  selfId,
  ensureSelfId,
}: {
  action: { key: string; kind?: string; value: string };
  patch: (p: any) => void;
  selfId?: string;
  ensureSelfId?: () => string;
}) {
  const fillFromSelf = () => {
    const id = ensureSelfId?.() ?? selfId;
    if (!id) return;
    patch({ key: id, value: id });
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Writes <code className="text-[9px]">key</code> →{" "}
        <code className="text-[9px]">value</code> to the central state
        registry. Pair with a State condition (visibility / className gating)
        elsewhere on the page to react.
      </p>
      {ensureSelfId && (
        <button
          type="button"
          onClick={fillFromSelf}
          className="text-primary hover:bg-base-200 self-start rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
        >
          Use this element for key + value
        </button>
      )}
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <StateKeyPickerInput
          value={action.key || ""}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
          onChange={key => patch({ key })}
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Kind</span>
        <ToolbarDropdown
          value={action.kind || "value"}
          onChange={(val: string) => patch({ kind: val })}
          propKey="setStateKind"
        >
          <option value="value">Value</option>
          <option value="visibility">Visibility</option>
          <option value="selection">Selection</option>
          <option value="flag">Flag</option>
        </ToolbarDropdown>
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Value</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.value || ""}
          onChange={e => patch({ value: e.target.value })}
          placeholder='"shown" / "panel-1" / "{{item.id}}"'
        />
      </label>
    </div>
  );
}

function ToggleStateForm({
  action,
  patch,
  selfId,
  ensureSelfId,
}: {
  action: { key: string; kind?: string; values?: [string, string] };
  patch: (p: any) => void;
  selfId?: string;
  ensureSelfId?: () => string;
}) {
  const pair = Array.isArray(action.values) ? action.values : ["", ""];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Flips a state between two values on click. Defaults: visibility kind
        toggles <code className="text-[9px]">shown / hidden</code>; flag kind
        toggles <code className="text-[9px]">on / off</code>. Override with
        explicit values.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <StateKeyPickerInput
          value={action.key || ""}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
          onChange={key => patch({ key })}
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Kind</span>
        <ToolbarDropdown
          value={action.kind || "flag"}
          onChange={(val: string) => patch({ kind: val })}
          propKey="toggleStateKind"
        >
          <option value="flag">Flag</option>
          <option value="visibility">Visibility</option>
          <option value="value">Value</option>
        </ToolbarDropdown>
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-[10px]">
          <span className="text-neutral-content">Value A</span>
          <input
            className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
            value={pair[0]}
            onChange={e => patch({ values: [e.target.value, pair[1]] })}
            placeholder="optional"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[10px]">
          <span className="text-neutral-content">Value B</span>
          <input
            className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
            value={pair[1]}
            onChange={e => patch({ values: [pair[0], e.target.value] })}
            placeholder="optional"
          />
        </label>
      </div>
    </div>
  );
}

function ClearStateForm({
  action,
  patch,
  selfId,
  ensureSelfId,
}: {
  action: { key: string };
  patch: (p: any) => void;
  selfId?: string;
  ensureSelfId?: () => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Removes the state entry entirely. Useful for "reset to default" buttons.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <StateKeyPickerInput
          value={action.key || ""}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
          onChange={key => patch({ key })}
        />
      </label>
    </div>
  );
}

function SetLocalStorageForm({
  action,
  patch,
}: {
  action: { key: string; value: string };
  patch: (p: any) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Writes <code className="text-[9px]">key</code> →{" "}
        <code className="text-[9px]">value</code> to{" "}
        <code className="text-[9px]">window.localStorage</code> when the
        button is clicked. Pairs with a load-trigger Show / Hide action whose
        Local Storage condition watches the same key — once the key is set,
        the target stays hidden on subsequent visits.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.key || ""}
          onChange={e => patch({ key: e.target.value })}
          placeholder="ph-cookie-consent"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Value</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.value || ""}
          onChange={e => patch({ value: e.target.value })}
          placeholder="dismissed"
        />
      </label>
    </div>
  );
}

function RemoveLocalStorageForm({
  action,
  patch,
}: {
  action: { key: string };
  patch: (p: any) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Clears the <code className="text-[9px]">key</code> from{" "}
        <code className="text-[9px]">window.localStorage</code> — useful for
        "show this banner again" links.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.key || ""}
          onChange={e => patch({ key: e.target.value })}
          placeholder="ph-cookie-consent"
        />
      </label>
    </div>
  );
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
      <ToolbarRowFrame>
        <label className="text-neutral-content shrink-0 px-1 text-xs">Qty field</label>
        <input
          type="text"
          defaultValue={action.quantityField || ""}
          onChange={e => patch({ quantityField: e.target.value || undefined })}
          placeholder="input name (overrides static)"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
        />
      </ToolbarRowFrame>
      <ToolbarRowFrame>
        <label className="text-neutral-content shrink-0 px-1 text-xs">Variant state</label>
        <input
          type="text"
          defaultValue={action.variantMatchStateKey || ""}
          onChange={e => patch({ variantMatchStateKey: e.target.value || undefined })}
          placeholder="pdp:current:matching-variant"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
        />
      </ToolbarRowFrame>
    </>
  );
}

// ─── Sub-forms ─────────────────────────────────────────────────────────

function ShowHideForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  const isLoad = action.trigger === "load";
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
          <option value="load">On Load</option>
        </ToolbarDropdown>
      </div>
      {isLoad && (
        <ActionConditionsEditor
          value={action.conditions}
          onChange={groups => patch({ conditions: groups })}
        />
      )}
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
 * State-key picker — same pattern as `TargetPickerInput` but the popover lists
 * a "self" entry (this node's anchor id) on top of every discoverable element
 * id on the page. Free-form input remains the source of truth so authors can
 * type a named state (`tabs-1`, `cart-open`) without picking from the list.
 */
function StateKeyPickerInput({
  value,
  selfId,
  ensureSelfId,
  onChange,
}: {
  value: string;
  selfId?: string;
  ensureSelfId?: () => string;
  onChange: (next: string) => void;
}) {
  const options = useElementPicker("all");
  const SELF_SENTINEL = "__ph_self__";
  const items: SearchableMenuItem<string>[] = [];
  if (ensureSelfId || selfId) {
    items.push({
      id: SELF_SENTINEL,
      label: "This element (self)",
      hint: selfId || "stamps an id when picked",
      keywords: ["self", "this", selfId || ""],
      data: SELF_SENTINEL,
    });
  }
  for (const opt of options) {
    if (selfId && opt.anchor === selfId) continue;
    items.push({
      id: opt.anchor,
      label: opt.label,
      hint: opt.anchor,
      keywords: [opt.anchor, opt.componentType],
      data: opt.anchor,
    });
  }
  return (
    <ToolbarRowFrame
      trailing={
        <SearchableMenuPopover<string>
          items={items}
          onSelect={item => {
            const data = item.data ?? item.id;
            if (data === SELF_SENTINEL) {
              const id = ensureSelfId?.() ?? selfId;
              if (id) onChange(id);
              return;
            }
            onChange(data);
          }}
          trigger={<TbChevronDown className="size-3.5" aria-hidden />}
          triggerAriaLabel="Pick state key from page"
          triggerClassName="text-neutral-content hover:text-base-content hover:bg-base-200 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors"
          searchPlaceholder="Search elements…"
          emptyMessage="No element ids on this page yet"
          anchor="bottom end"
        />
      }
    >
      <input
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder="Element id or named state…"
        className="h-full w-full bg-transparent px-1 text-xs outline-none"
        aria-label="State key"
      />
    </ToolbarRowFrame>
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
