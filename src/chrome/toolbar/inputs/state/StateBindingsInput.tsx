/**
 * StateBindingsInput — chip-row body for `props.stateModifiers`.
 *
 * Each binding pairs a ConditionGroup[] with a list of modifier names. At
 * render the runtime evaluates conditions live and appends matching modifier
 * classes to the node's className. See packages/sdk/src/utils/conditions/
 * stateModifiers.ts. Mirrors ConditionsInput's chip + lazy panel pattern.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TbBolt, TbStack2 } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { SideBarAtom } from "../../../../utils/lib";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { ConditionGroup } from "../../../../utils/conditions/types";

const StateBindingEditorPanel = lazy(() => import("./StateBindingEditorPanel"));

const PANEL_WIDTH = 380;

export interface StateBinding {
  conditions: ConditionGroup[];
  modifiers: string[];
}

const STATE_BINDINGS_BODY_DEF_ID = "stateBindings";

function summarize(b: StateBinding): { left: string; right: string } {
  const cond = b.conditions?.[0]?.conditions?.[0];
  const left = cond
    ? cond.operator && cond.operator.startsWith("not")
      ? `${cond.key || "?"} ≠ ${cond.value || "?"}`
      : cond.operator === "exists"
        ? `${cond.key || "?"} exists`
        : cond.operator === "not-exists"
          ? `${cond.key || "?"} missing`
          : `${cond.key || "?"} = ${cond.value || "?"}`
    : "(no condition)";
  const mods = Array.isArray(b.modifiers) ? b.modifiers : [];
  const right = mods.length === 0 ? "(no modifiers)" : mods.slice(0, 3).join(", ") + (mods.length > 3 ? "…" : "");
  return { left, right };
}

interface ChipProps {
  binding: StateBinding;
  onChange: (next: StateBinding) => void;
  onRemove: () => void;
  autoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
}

function StateBindingChipRow({
  binding,
  onChange,
  onRemove,
  autoOpen,
  onAutoOpenConsumed,
}: ChipProps) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

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

  const { left, right } = summarize(binding);

  const handleClear = () => {
    if (open) setOpen(false);
    onRemove();
  };

  return (
    <>
      <Chip mode="popover"
        ref={triggerRef}
        label="When"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={handleClear}
        triggerAriaLabel="Edit state binding"
        clearAriaLabel="Remove state binding"
        leading={<TbBolt className="size-3.5" aria-hidden />}
        summary={`${left}  →  ${right}`}
      />
      {open && (
        <Suspense fallback={null}>
          <StateBindingEditorPanel
            binding={binding}
            onChange={onChange}
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}

export const StateBindingsInput = () => {
  const {
    id,
    actions: { setProp },
    list,
  } = useNode(node => ({
    id: node.id,
    list: (node.data?.props?.stateModifiers || []) as StateBinding[],
  }));
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const requestVersion =
    popoverRequests.get(popoverRequestKey(id, STATE_BINDINGS_BODY_DEF_ID)) || 0;

  const writeList = (next: StateBinding[]) => {
    setProp((p: any) => {
      p.stateModifiers = next;
    });
  };

  const updateAt = (idx: number, next: StateBinding) => {
    writeList(list.map((b, i) => (i === idx ? next : b)));
  };
  const removeAt = (idx: number) => {
    writeList(list.filter((_, i) => i !== idx));
  };

  const prevLengthRef = useRef(list.length);
  const [pendingOpenIdx, setPendingOpenIdx] = useState<number | null>(null);
  useEffect(() => {
    if (list.length > prevLengthRef.current) {
      setPendingOpenIdx(list.length - 1);
    }
    prevLengthRef.current = list.length;
  }, [list.length]);

  const lastRequestVersionRef = useRef(0);
  useEffect(() => {
    if (requestVersion === 0 || requestVersion === lastRequestVersionRef.current) return;
    lastRequestVersionRef.current = requestVersion;
    if (list.length > 0) setPendingOpenIdx(list.length - 1);
  }, [requestVersion, list.length]);
  const consumeAutoOpen = () => setPendingOpenIdx(null);

  if (list.length === 0) {
    return (
      <div className="text-neutral-content flex items-center gap-2 px-1 py-1 text-[10px]">
        <TbStack2 className="size-3.5" aria-hidden />
        Bind modifiers to state — click + above to add a rule.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {list.map((b, i) => (
        <StateBindingChipRow
          key={i}
          binding={b}
          autoOpen={i === pendingOpenIdx}
          onAutoOpenConsumed={consumeAutoOpen}
          onChange={next => updateAt(i, next)}
          onRemove={() => removeAt(i)}
        />
      ))}
    </div>
  );
};
