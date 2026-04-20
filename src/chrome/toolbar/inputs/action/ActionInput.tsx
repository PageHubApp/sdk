/**
 * Unified action picker — replaces ClickItem + LinkSettingsInput.
 * Single dropdown to pick action type, then contextual sub-forms.
 * Supports chained actions via `actions: NodeAction[]` prop.
 */
import { useNode } from "@craftjs/core";
import { TbPointer, TbX } from "react-icons/tb";
import { PageSelector } from "../../../viewport/PageSelector";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { ToolbarSection } from "../../ToolbarSection";
import {
  ACTION_TYPE_OPTIONS,
  type ActionType,
  type NodeAction,
  type LinkTarget,
  type ToggleThemeAction,
  migrateAction,
} from "@/utils/action";
import HandlersInput from "./HandlersInput";
import { useElementPicker, type PickerFilter } from "./useElementPicker";

const ACTION_DEFAULTS: Record<ActionType, NodeAction> = {
  "link-url": { type: "link-url", url: "" },
  "link-page": { type: "link-page", pageId: "" },
  "scroll-to": { type: "scroll-to", anchor: "" },
  "open-modal": { type: "open-modal", anchor: "" },
  email: { type: "email", email: "" },
  phone: { type: "phone", phone: "" },
  "show-hide": { type: "show-hide", target: "", direction: "toggle", trigger: "click" },
  "copy-to-clipboard": { type: "copy-to-clipboard", text: "" },
  "download-file": { type: "download-file", url: "" },
  "toggle-theme": { type: "toggle-theme" },
  "add-to-cart": { type: "add-to-cart" },
  "toggle-cart": { type: "toggle-cart" },
  "cart-checkout": { type: "cart-checkout" },
  "manage-subscription": { type: "manage-subscription" },
};

export default function ActionInput() {
  const {
    actions: { setProp },
    actionList,
  } = useNode(node => {
    const props = node.data.props;
    // Support both legacy single `action` and new `actions` array
    if (props.actions?.length) return { actionList: props.actions as NodeAction[] };
    const single = (props.action as NodeAction | undefined) ?? migrateAction(props);
    return { actionList: single ? [single] : [] };
  });

  const syncActions = (list: NodeAction[]) => {
    setProp((props: any) => {
      props.actions = list;
      // Keep single `action` in sync for backwards compat
      props.action = list[0] || null;
      // Clean up legacy props
      delete props.click;
      delete props.url;
      delete props.urlTarget;
      delete props.clickMode;
    });
  };

  const updateAction = (index: number, next: NodeAction) => {
    const list = [...actionList];
    list[index] = next;
    syncActions(list);
  };

  const patchAction =
    (index: number) =>
    <T extends NodeAction>(patch: Partial<T>) => {
      const list = [...actionList];
      list[index] = { ...list[index], ...patch } as NodeAction;
      syncActions(list);
    };

  const removeAction = (index: number) => {
    syncActions(actionList.filter((_, i) => i !== index));
  };

  const addAction = () => {
    syncActions([
      ...actionList,
      { type: "show-hide", target: "", direction: "toggle", trigger: "click" },
    ]);
  };

  const handleTypeChange = (index: number, val: string) => {
    if (!val) {
      removeAction(index);
      return;
    }
    updateAction(index, ACTION_DEFAULTS[val as ActionType]);
  };

  return (
    <>
      {actionList.map((action, i) => (
        <div
          key={i}
          className={`flex flex-col gap-2 ${
            actionList.length > 1 ? "border-base-300 mb-2 rounded-md border p-2" : ""
          }`}
        >
          {actionList.length > 1 && (
            <div className="mb-1 flex items-center justify-between">
              <span className="text-neutral-content text-[10px] font-medium">Action {i + 1}</span>
              <button
                type="button"
                onClick={() => removeAction(i)}
                className="text-neutral-content hover:bg-error hover:text-error-content rounded p-0.5"
              >
                <TbX size={12} />
              </button>
            </div>
          )}

          <ToolbarDropdown
            value={action.type ?? ""}
            onChange={(val: string) => handleTypeChange(i, val)}
            propKey={`actionType-${i}`}
            placeholder="None"
            append={
              actionList.length === 1 ? (
                <button
                  type="button"
                  onClick={() => syncActions([])}
                  className="text-neutral-content hover:bg-error hover:text-error-content flex shrink-0 items-center justify-center rounded p-1 text-xs transition-colors"
                  aria-label="Clear action"
                >
                  <TbX />
                </button>
              ) : null
            }
          >
            <option value="">None</option>
            {ACTION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </ToolbarDropdown>

          <ActionSubForm action={action} patch={patchAction(i)} />
        </div>
      ))}

      {/* Add action button */}
      <ToolbarDashedButton
        onClick={
          actionList.length === 0 ? () => syncActions([ACTION_DEFAULTS["link-url"]]) : addAction
        }
      >
        {actionList.length === 0 ? "Add Action" : "Chain Another Action"}
      </ToolbarDashedButton>

      <HandlersInput />
    </>
  );
}

function ActionSubForm({ action, patch }: { action: NodeAction; patch: (p: any) => void }) {
  switch (action.type) {
    case "link-url":
      return <LinkUrlForm action={action} patch={patch} />;
    case "link-page":
      return <LinkPageForm action={action} patch={patch} />;
    case "scroll-to":
      return (
        <ElementPickerForm
          value={(action as any).anchor}
          filter="section"
          label="Section"
          onChange={anchor => patch({ anchor })}
        />
      );
    case "open-modal":
      return (
        <ElementPickerForm
          value={(action as any).anchor}
          filter="modal"
          label="Modal"
          onChange={anchor => patch({ anchor })}
        />
      );
    case "email":
      return <EmailForm action={action} patch={patch} />;
    case "phone":
      return <PhoneForm action={action} patch={patch} />;
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
      <ElementPickerForm
        value={action.dismissTarget || ""}
        filter="all"
        label="Hide panel after toggle (optional id)"
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
      <div className="input-wrapper">
        <label className="input-label">Quantity</label>
        <input
          type="number"
          min={1}
          max={99}
          value={action.quantity || 1}
          onChange={e => patch({ quantity: parseInt(e.target.value) || 1 })}
          className="input-plain w-full text-xs"
        />
      </div>
    </>
  );
}

// ─── Sub-forms ─────────────────────────────────────────────────────────

function LinkUrlForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <div className="input-wrapper">
        <input
          type="url"
          defaultValue={action.url || ""}
          onChange={e => patch({ url: e.target.value })}
          placeholder="https://..."
          className="input-plain w-full"
          aria-label="URL"
        />
      </div>
      <TargetSelect value={action.target} onChange={target => patch({ target })} />
    </>
  );
}

function LinkPageForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <div className="input-wrapper flex w-full items-center gap-1">
        <PageSelector
          pickerMode
          onPagePick={page => patch({ pageId: page.id })}
          selectedPageId={action.pageId || ""}
          className="flex-1"
          buttonClassName="input-plain w-full flex items-center justify-between"
          showHashIcon={false}
        />
        {action.pageId && (
          <button
            type="button"
            onClick={() => patch({ pageId: "" })}
            className="text-neutral-content hover:bg-error hover:text-error-content flex shrink-0 items-center justify-center rounded p-1 text-xs transition-colors"
            aria-label="Clear page"
          >
            <TbX />
          </button>
        )}
      </div>
      <TargetSelect value={action.target} onChange={target => patch({ target })} />
    </>
  );
}

function EmailForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <div className="input-wrapper">
        <input
          type="email"
          defaultValue={action.email || ""}
          onChange={e => patch({ email: e.target.value })}
          placeholder="hello@example.com"
          className="input-plain w-full"
          aria-label="Email address"
        />
      </div>
      <div className="input-wrapper">
        <input
          type="text"
          defaultValue={action.subject || ""}
          onChange={e => patch({ subject: e.target.value })}
          placeholder="Subject (optional)"
          className="input-plain w-full"
          aria-label="Email subject"
        />
      </div>
      <div className="input-wrapper">
        <input
          type="text"
          defaultValue={action.body || ""}
          onChange={e => patch({ body: e.target.value })}
          placeholder="Body (optional)"
          className="input-plain w-full"
          aria-label="Email body"
        />
      </div>
    </>
  );
}

function PhoneForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <div className="input-wrapper">
      <input
        type="tel"
        defaultValue={action.phone || ""}
        onChange={e => patch({ phone: e.target.value })}
        placeholder="+1 (555) 123-4567"
        className="input-plain w-full"
        aria-label="Phone number"
      />
    </div>
  );
}

function ShowHideForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <ElementPickerForm
        value={action.target}
        filter="all"
        label="Target"
        onChange={target => patch({ target })}
      />
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

function TargetSelect({
  value,
  onChange,
}: {
  value?: LinkTarget;
  onChange: (v: LinkTarget) => void;
}) {
  return (
    <ToolbarDropdown
      value={value || "_self"}
      onChange={(val: string) => onChange(val as LinkTarget)}
      propKey="actionTarget"
    >
      <option value="_self">Same tab</option>
      <option value="_blank">New tab</option>
      <option value="_parent">Parent window</option>
      <option value="_top">New window</option>
    </ToolbarDropdown>
  );
}

function CopyToClipboardForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <div className="input-wrapper">
      <input
        type="text"
        defaultValue={action.text || ""}
        onChange={e => patch({ text: e.target.value })}
        placeholder="Text to copy..."
        className="input-plain w-full"
        aria-label="Text to copy"
      />
    </div>
  );
}

function DownloadFileForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <div className="input-wrapper">
        <input
          type="url"
          defaultValue={action.url || ""}
          onChange={e => patch({ url: e.target.value })}
          placeholder="https://example.com/file.pdf"
          className="input-plain w-full"
          aria-label="File URL"
        />
      </div>
      <div className="input-wrapper">
        <input
          type="text"
          defaultValue={action.filename || ""}
          onChange={e => patch({ filename: e.target.value })}
          placeholder="Filename (optional)"
          className="input-plain w-full"
          aria-label="Download filename"
        />
      </div>
    </>
  );
}

function ElementPickerForm({
  value,
  filter,
  label,
  onChange,
}: {
  value: string;
  filter: PickerFilter;
  label: string;
  onChange: (anchor: string) => void;
}) {
  const options = useElementPicker(filter);

  if (!options.length) {
    return (
      <div className="bg-neutral/50 flex items-center gap-2 rounded-md px-3 py-2">
        <span className="text-neutral-content text-xs">No {label.toLowerCase()}s found</span>
      </div>
    );
  }

  return (
    <ToolbarDropdown
      value={value || ""}
      onChange={onChange}
      propKey={`action${label}`}
      placeholder={`Select ${label.toLowerCase()}...`}
    >
      <option value="">Select {label.toLowerCase()}...</option>
      {options.map(opt => (
        <option key={opt.nodeId} value={opt.anchor}>
          {opt.label}
          {opt.componentType !== label ? ` (${opt.componentType})` : ""}
        </option>
      ))}
    </ToolbarDropdown>
  );
}
