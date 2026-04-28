/**
 * ActionEditorPanel — single-action editor in a draggable FloatingPanel.
 *
 * One panel per action chip. Owns the type dropdown (lets the user change
 * the action type without removing the chip) + the per-type sub-form pulled
 * from `ActionInput.tsx`. Chaining lives at the chip-list level — the
 * header `+` adds another chip — so this panel intentionally does NOT
 * render a "Chain Another Action" button.
 */
import { TbX } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { ACTION_TYPE_OPTIONS, type NodeAction, type ActionType } from "../../../../utils/action";
import { ACTION_DEFAULTS, ActionSubForm } from "./ActionInput";

interface Props {
  action: NodeAction;
  onChange: (next: NodeAction) => void;
  onRemove: () => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  /** Anchor id of the node owning this action — surfaces a "self" entry in
   *  state-key pickers. */
  selfId?: string;
  /** Returns a stable self id, stamping `attrs.id` if none exists. */
  ensureSelfId?: () => string;
}

export default function ActionEditorPanel({
  action,
  onChange,
  onRemove,
  initialPosition,
  onClose,
  selfId,
  ensureSelfId,
}: Props) {
  const handleTypeChange = (val: string) => {
    if (!val) {
      onRemove();
      onClose();
      return;
    }
    onChange(ACTION_DEFAULTS[val as ActionType]);
  };

  const patch = (p: any) => onChange({ ...action, ...p } as NodeAction);

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Action"
      storageKey="action-input"
      minWidth={300}
      maxWidth={520}
      minHeight={240}
      initialPosition={initialPosition}
      zIndex={1100}
      scrollable
    >
      <div className="flex flex-col gap-2">
        <ToolbarDropdown
          value={action.type ?? ""}
          onChange={handleTypeChange}
          propKey="actionType"
          placeholder="None"
          append={
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="text-neutral-content hover:bg-error hover:text-error-content flex shrink-0 items-center justify-center rounded p-1 text-xs transition-colors"
              aria-label="Remove action"
            >
              <TbX />
            </button>
          }
        >
          <option value="">None</option>
          {ACTION_TYPE_OPTIONS.filter(opt => !opt.group).map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {Array.from(
            ACTION_TYPE_OPTIONS.reduce((acc, opt) => {
              if (!opt.group) return acc;
              if (!acc.has(opt.group)) acc.set(opt.group, []);
              acc.get(opt.group)!.push(opt);
              return acc;
            }, new Map<string, typeof ACTION_TYPE_OPTIONS>()).entries()
          ).map(([group, opts]) => (
            <optgroup key={group} label={group}>
              {opts.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </ToolbarDropdown>

        <ActionSubForm
          action={action}
          patch={patch}
          replace={onChange}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
        />
      </div>
    </FloatingPanel>
  );
}
