/**
 * ConditionsInputPopover — thin trigger chip that opens a draggable
 * FloatingPanel containing the full ConditionsInput body.
 *
 * Multi-group, multi-condition data → summary collapses to:
 *   • 0 groups        → "Add Condition…"
 *   • 1 group, 1 cond → describe the single condition (e.g. "URL ?ref = signup")
 *   • 1 group, N cond → "N conditions"
 *   • M groups        → "M groups · K conditions"
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TbEye, TbPlus } from "react-icons/tb";
import { PopoverChip } from "../../../primitives/PopoverChip";
import type { Condition, ConditionGroup } from "../../../../utils/conditions/types";
import { SideBarAtom } from "../../../../utils/lib";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";
import { parseGroups } from "./ConditionsInput";

const ConditionsPanel = lazy(() => import("./ConditionsPanel"));

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 500;

const TYPE_LABEL: Record<string, string> = {
  "url-param": "URL",
  "form-field": "Form",
  connector: "Data",
  company: "Company",
  device: "Device",
  auth: "Auth",
  item: "Item",
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

function describeCondition(c: Condition): string {
  const t = TYPE_LABEL[c.type] ?? c.type;
  const op = OP_LABEL[c.operator] ?? c.operator;
  const isUnary = c.operator === "exists" || c.operator === "not-exists";
  const left = c.key ? `${t} ${c.key}` : t;
  if (isUnary) return `${left} ${op}`;
  return c.value ? `${left} ${op} ${c.value}` : `${left} ${op}`;
}

function summarize(groups: ConditionGroup[]): string {
  const totalConditions = groups.reduce((n, g) => n + g.conditions.length, 0);
  if (totalConditions === 0) return "Add Condition…";
  if (groups.length === 1) {
    const g = groups[0];
    if (g.conditions.length === 1) return describeCondition(g.conditions[0]);
    return `${g.conditions.length} conditions`;
  }
  return `${groups.length} groups · ${totalConditions} conditions`;
}

export default function ConditionsInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);

  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

  const {
    actions: { setProp },
    id,
    groups,
  } = useNode(node => {
    const conditions = (node.data?.props?.conditions || []) as Condition[];
    const conditionGroups = node.data?.props?.conditionGroups as ConditionGroup[] | undefined;
    return { id: node.id, groups: parseGroups(conditions, conditionGroups) };
  });

  const summary = summarize(groups);
  const isEmpty = groups.every(g => g.conditions.length === 0);

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PANEL_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  // Legacy auto-open from sessionAdded.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (def && sessionAdded.has(sessionKey(id, def.id))) {
      requestAnimationFrame(() => {
        setInitialPos(computePosition());
        setOpen(true);
      });
      autoOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdded, id, def?.id]);

  // Open whenever a popover-open-request is dispatched for this row.
  const lastRequestVersion = useRef(0);
  useEffect(() => {
    if (!def) return;
    const version = popoverRequests.get(popoverRequestKey(id, def.id)) || 0;
    if (version === 0 || version === lastRequestVersion.current) return;
    lastRequestVersion.current = version;
    requestAnimationFrame(() => {
      setInitialPos(computePosition());
      setOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverRequests, id, def?.id]);

  const clearConditions = () => {
    setProp((p: any) => {
      p.conditions = [];
      p.conditionLogic = "all";
      p.conditionGroups = [];
    });
  };

  return (
    <>
      {isEmpty ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-expanded={open}
          aria-label="Add condition"
          className="text-neutral-content hover:text-base-content hover:bg-base-200 flex size-4 shrink-0 items-center justify-center rounded-md opacity-70 transition-[color,background-color,opacity] hover:opacity-100"
        >
          <TbPlus className="size-3.5" aria-hidden />
        </button>
      ) : (
        <PopoverChip
          ref={triggerRef}
          open={open}
          onTriggerClick={() => (open ? setOpen(false) : openPanel())}
          onClear={() => {
            if (open) setOpen(false);
            clearConditions();
          }}
          triggerAriaLabel="Edit conditions"
          clearAriaLabel="Clear conditions"
          leading={<TbEye className="size-3.5" aria-hidden />}
          summary={summary}
        />
      )}
      {open && (
        <Suspense fallback={null}>
          <ConditionsPanel
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
            defaultWidth={PANEL_WIDTH}
            defaultHeight={PANEL_HEIGHT}
          />
        </Suspense>
      )}
    </>
  );
}
