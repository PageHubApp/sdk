/**
 * Unified action picker — replaces ClickItem + LinkSettingsInput.
 * Single dropdown to pick action type, then contextual sub-forms.
 */
import { useNode } from "@craftjs/core";
import { TbPointer, TbX } from "react-icons/tb";
import { PageSelector } from "../../../Viewport/PageSelector";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { ToolbarSection } from "../../ToolbarSection";
import {
  ACTION_TYPE_OPTIONS,
  type ActionType,
  type NodeAction,
  type LinkTarget,
  migrateAction,
} from "../../../../utils/action";
import { useElementPicker, type PickerFilter } from "./useElementPicker";

export default function ActionInput() {
  const {
    actions: { setProp },
    action,
  } = useNode((node) => ({
    action: (node.data.props.action as NodeAction | undefined) ?? migrateAction(node.data.props),
  }));

  const setAction = (next: NodeAction | null) => {
    setProp((props: any) => {
      props.action = next;
      // Clean up legacy props when setting new action
      delete props.click;
      delete props.url;
      delete props.urlTarget;
      delete props.clickMode;
    });
  };

  const patchAction = <T extends NodeAction>(patch: Partial<T>) => {
    setProp((props: any) => {
      props.action = { ...props.action, ...patch };
    });
  };

  const handleTypeChange = (val: string) => {
    if (!val) {
      setAction(null);
      return;
    }
    const newType = val as ActionType;
    const defaults: Record<ActionType, NodeAction> = {
      "link-url": { type: "link-url", url: "" },
      "link-page": { type: "link-page", pageId: "" },
      "scroll-to": { type: "scroll-to", anchor: "" },
      "open-modal": { type: "open-modal", anchor: "" },
      email: { type: "email", email: "" },
      phone: { type: "phone", phone: "" },
      "show-hide": { type: "show-hide", target: "", direction: "toggle", trigger: "click" },
    };
    setAction(defaults[newType]);
  };

  const clearButton = action ? (
    <button
      type="button"
      onClick={() => setAction(null)}
      className="flex shrink-0 items-center justify-center rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
      aria-label="Clear action"
    >
      <TbX />
    </button>
  ) : null;

  return (
    <ToolbarSection
      title="Action"
      icon={<TbPointer />}
      help="What happens when someone clicks this element."
    >
      {/* Action type selector */}
      <ToolbarDropdown
        value={action?.type ?? ""}
        onChange={handleTypeChange}
        propKey="actionType"
        placeholder="None"
        append={clearButton}
      >
        <option value="">None</option>
        {ACTION_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </ToolbarDropdown>

      {/* Sub-forms per action type */}
      {action?.type === "link-url" && (
        <LinkUrlForm action={action} patch={patchAction} />
      )}
      {action?.type === "link-page" && (
        <LinkPageForm action={action} patch={patchAction} />
      )}
      {action?.type === "scroll-to" && (
        <ElementPickerForm
          value={action.anchor}
          filter="section"
          label="Section"
          onChange={(anchor) => patchAction({ anchor })}
        />
      )}
      {action?.type === "open-modal" && (
        <ElementPickerForm
          value={action.anchor}
          filter="modal"
          label="Modal"
          onChange={(anchor) => patchAction({ anchor })}
        />
      )}
      {action?.type === "email" && (
        <EmailForm action={action} patch={patchAction} />
      )}
      {action?.type === "phone" && (
        <PhoneForm action={action} patch={patchAction} />
      )}
      {action?.type === "show-hide" && (
        <ShowHideForm action={action} patch={patchAction} />
      )}
    </ToolbarSection>
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
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://..."
          className="input-plain w-full"
          aria-label="URL"
        />
      </div>
      <TargetSelect value={action.target} onChange={(target) => patch({ target })} />
    </>
  );
}

function LinkPageForm({
  action,
  patch,
}: {
  action: any;
  patch: (p: any) => void;
}) {
  return (
    <>
      <div className="input-wrapper flex w-full items-center gap-1">
        <PageSelector
          pickerMode
          onPagePick={(page) => patch({ pageId: page.id })}
          selectedPageId={action.pageId || ""}
          className="flex-1"
          buttonClassName="input-plain w-full flex items-center justify-between"
          showHashIcon={false}
        />
        {action.pageId && (
          <button
            type="button"
            onClick={() => patch({ pageId: "" })}
            className="flex shrink-0 items-center justify-center rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Clear page"
          >
            <TbX />
          </button>
        )}
      </div>
      <TargetSelect value={action.target} onChange={(target) => patch({ target })} />
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
          onChange={(e) => patch({ email: e.target.value })}
          placeholder="hello@example.com"
          className="input-plain w-full"
          aria-label="Email address"
        />
      </div>
      <div className="input-wrapper">
        <input
          type="text"
          defaultValue={action.subject || ""}
          onChange={(e) => patch({ subject: e.target.value })}
          placeholder="Subject (optional)"
          className="input-plain w-full"
          aria-label="Email subject"
        />
      </div>
      <div className="input-wrapper">
        <input
          type="text"
          defaultValue={action.body || ""}
          onChange={(e) => patch({ body: e.target.value })}
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
        onChange={(e) => patch({ phone: e.target.value })}
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
        onChange={(target) => patch({ target })}
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
      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          No {label.toLowerCase()}s found
        </span>
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
      {options.map((opt) => (
        <option key={opt.nodeId} value={opt.anchor}>
          {opt.label}{opt.componentType !== label ? ` (${opt.componentType})` : ""}
        </option>
      ))}
    </ToolbarDropdown>
  );
}
