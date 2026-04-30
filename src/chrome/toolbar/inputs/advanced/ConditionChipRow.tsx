/**
 * ConditionChipRow — single editable chip for one Condition.
 *
 * Renders a `Chip` with the condition's category icon + a one-line
 * summary (e.g. "URL ?ref = signup", or just "URL Parameter" when fields
 * haven't been filled in yet). Click → lazy-loads `ConditionEditorPanel`
 * and floats it next to the chip. Clear → calls `onRemove` to drop the
 * condition from the parent list.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  TbDeviceMobile,
  TbDatabase,
  TbDeviceFloppy,
  TbForms,
  TbLink,
  TbBuilding,
  TbUser,
  TbEye,
  TbBolt,
} from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";
import {
  NO_VALUE_OPERATORS,
  type Condition,
  type ConditionType,
} from "../../../../utils/conditions/types";

const ConditionEditorPanel = lazy(() => import("./ConditionEditorPanel"));

// Hint width for chip-anchored initial position only — the panel itself is
// auto-sized inside `ConditionEditorPanel` (see editor-popover-pattern.md
// "FloatingPanel sizing" section).
const PANEL_WIDTH = 340;

const TYPE_ICON: Record<ConditionType, React.ComponentType<{ className?: string }>> = {
  "url-param": TbLink,
  "form-field": TbForms,
  connector: TbDatabase,
  company: TbBuilding,
  device: TbDeviceMobile,
  auth: TbUser,
  item: TbEye,
  localStorage: TbDeviceFloppy,
  state: TbBolt,
};

const TYPE_LABEL: Record<string, string> = {
  "url-param": "URL Parameter",
  "form-field": "Form Field",
  connector: "Connector",
  company: "Company",
  device: "Device",
  auth: "Auth",
  item: "Item",
  localStorage: "Local Storage",
  state: "State",
};

const OP_LABEL: Record<string, string> = {
  equals: "=",
  "not-equals": "≠",
  contains: "∋",
  "not-contains": "∌",
  exists: "exists",
  "not-exists": "missing",
  "greater-than": ">",
  "less-than": "<",
};

function conditionTypeLabel(c: Condition): string {
  return TYPE_LABEL[c.type] ?? c.type;
}

/** Value-only summary for the chip body. The type label lives OUTSIDE the
 *  chip (row-label pattern, mirrors `EffectRowInputPopover`), so DON'T
 *  prefix the type here. */
function describeCondition(c: Condition): string {
  // Device is implicit-equals + always has a value default — show value directly.
  if (c.type === "device") return c.value || "";
  if (!c.key) return "";
  const op = OP_LABEL[c.operator] ?? c.operator;
  const isUnary = NO_VALUE_OPERATORS.includes(c.operator);
  if (isUnary) return `${c.key} ${op}`;
  if (!c.value) return c.key;
  return `${c.key} ${op} ${c.value}`;
}

interface Props {
  cond: Condition;
  onChange: (patch: Partial<Condition>) => void;
  onRemove: () => void;
  /** When true on first render, auto-open the editor (used by the header `+`
   *  picker so the just-added chip surfaces its form immediately). */
  autoOpen?: boolean;
  /** Notify parent so it can clear its pending-open state. */
  onAutoOpenConsumed?: () => void;
}

export function ConditionChipRow({
  cond,
  onChange,
  onRemove,
  autoOpen,
  onAutoOpenConsumed,
}: Props) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const Icon = TYPE_ICON[cond.type] || TbEye;
  const typeLabel = conditionTypeLabel(cond);
  const summary = describeCondition(cond) || "Add…";

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  // Auto-open from the section-header `+` picker. Wait one frame so the chip
  // has its layout rect — `computePosition` reads `getBoundingClientRect`.
  const autoOpenFiredRef = useRef(false);
  useEffect(() => {
    if (!autoOpen || autoOpenFiredRef.current) return;
    autoOpenFiredRef.current = true;
    requestAnimationFrame(() => {
      setInitialPos(computePosition());
      setOpen(true);
      onAutoOpenConsumed?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const handleClear = () => {
    if (open) setOpen(false);
    onRemove();
  };

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label={typeLabel}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={handleClear}
        triggerAriaLabel="Edit condition"
        clearAriaLabel="Remove condition"
        leading={<Icon className="size-3.5" aria-hidden />}
        summary={summary}
      />
      {open && (
        <Suspense fallback={null}>
          <ConditionEditorPanel
            cond={cond}
            onChange={onChange}
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
