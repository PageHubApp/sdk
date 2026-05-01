/**
 * ActionChipRow — single editable chip for one NodeAction in the chain.
 *
 * Renders a `Chip` with the action-type icon + a one-line summary
 * (e.g. "Link → /shop", "Show / Hide → mobile-nav"). Click → lazy-loads
 * `ActionEditorPanel` and floats it next to the chip. Clear → calls
 * `onRemove` to drop the action from the parent list.
 *
 * Shape mirrors `ConditionChipRow.tsx`. Auto-open on first render is driven
 * by the `autoOpen` prop fed by `ActionsInput`'s pendingOpenIdx state — see
 * docs/sdk/editor-popover-pattern.md §8.
 */
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  TbLink,
  TbWindowMaximize,
  TbEye,
  TbCopy,
  TbDownload,
  TbContrast,
  TbShoppingCart,
  TbCreditCard,
  TbReceipt,
  TbSend,
  TbPointer,
  TbDatabase,
  TbDatabaseOff,
  TbBolt,
  TbBoltOff,
  TbToggleLeft,
} from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";
import { ACTION_TYPE_OPTIONS, type ActionType, type NodeAction } from "../../../../utils/action";
import { PeekTargetButton } from "./PeekTargetButton";

const ActionEditorPanel = lazy(() => import("./ActionEditorPanel"));

// Hint width for chip-anchored initial position only — the panel is auto-sized
// inside `ActionEditorPanel` (see editor-popover-pattern.md "FloatingPanel sizing").
const PANEL_WIDTH = 340;

const TYPE_ICON: Partial<Record<ActionType, React.ComponentType<{ className?: string }>>> = {
  link: TbLink,
  "open-modal": TbWindowMaximize,
  "show-hide": TbEye,
  "copy-to-clipboard": TbCopy,
  "download-file": TbDownload,
  "toggle-theme": TbContrast,
  "add-to-cart": TbShoppingCart,
  "toggle-cart": TbShoppingCart,
  "cart-checkout": TbCreditCard,
  "manage-subscription": TbReceipt,
  "agent-send": TbSend,
  "set-local-storage": TbDatabase,
  "remove-local-storage": TbDatabaseOff,
  "set-state": TbBolt,
  "toggle-state": TbToggleLeft,
  "clear-state": TbBoltOff,
};

const ACTION_LABEL = new Map(ACTION_TYPE_OPTIONS.map(o => [o.value, o.label]));

function actionTypeLabel(a: NodeAction): string {
  return ACTION_LABEL.get(a.type) ?? a.type;
}

/** Value-only summary for the chip body. The type label lives OUTSIDE the
 *  chip (row-label pattern, mirrors `EffectRowInputPopover`), so DON'T
 *  prefix the type here — that would render twice.
 *
 *  `pageNames` resolves `ref:<pageId>` link hrefs to friendly page names so
 *  the chip matches the LinkInput popover's display. */
function describeAction(a: NodeAction, pageNames?: Map<string, string>): string {
  if (a.type === "link") {
    const h = a.href || "";
    if (h.startsWith("ref:") && pageNames) {
      const m = h.match(/^ref:([^/?#]+)(.*)$/);
      const pageId = m ? m[1] : h.slice(4);
      const suffix = m ? m[2] : "";
      const name = pageNames.get(pageId);
      if (name) return suffix ? `${name}${suffix}` : name;
    }
    if (h.startsWith("mailto:")) return h.slice(7).split("?")[0] || h;
    if (h.startsWith("tel:")) return h.slice(4) || h;
    return h;
  }
  if (a.type === "open-modal") return (a as any).anchor || "";
  if (a.type === "show-hide") {
    const target = (a as any).target || "";
    const trig = (a as any).trigger;
    const gated =
      Array.isArray((a as any).conditions) && (a as any).conditions.length > 0
        ? " · conditional"
        : "";
    const prefix =
      trig === "load" ? `${target} · on load` : trig === "hover" ? `${target} · hover` : target;
    return `${prefix}${gated}`;
  }
  if (a.type === "copy-to-clipboard") {
    const t = (a as any).text as string | undefined;
    if (!t) return "";
    return t.length > 24 ? t.slice(0, 24) + "…" : t;
  }
  if (a.type === "download-file") return (a as any).url || "";
  if (a.type === "add-to-cart" && (a as any).quantity) return `×${(a as any).quantity}`;
  if (a.type === "agent-send") return (a as any).field || "";
  if (a.type === "set-local-storage") {
    const k = (a as any).key as string | undefined;
    const v = (a as any).value as string | undefined;
    if (k && v) return `${k} = ${v}`;
    return k || "";
  }
  if (a.type === "remove-local-storage") return (a as any).key || "";
  if (a.type === "set-state") {
    const k = (a as any).key as string | undefined;
    const v = (a as any).value as string | undefined;
    if (k && v) return `${k} = ${v}`;
    return k || "";
  }
  if (a.type === "toggle-state") return (a as any).key || "";
  if (a.type === "clear-state") return (a as any).key || "";
  return "";
}

interface Props {
  action: NodeAction;
  onChange: (next: NodeAction) => void;
  onRemove: () => void;
  /** When true on first render, auto-open the editor (used by the header `+`
   *  picker so the just-added chip surfaces its form immediately). */
  autoOpen?: boolean;
  /** Notify parent so it can clear its pending-open state. */
  onAutoOpenConsumed?: () => void;
  /** Anchor id of the node owning this action — forwarded to the editor panel
   *  so state-key pickers can surface a "self" entry. */
  selfId?: string;
  /** Returns a stable self id for the owning node, stamping `attrs.id` when
   *  none exists yet. Forwarded to state forms so the "self" affordance works
   *  even on un-id'd nodes. */
  ensureSelfId?: () => string;
}

export function ActionChipRow({
  action,
  onChange,
  onRemove,
  autoOpen,
  onAutoOpenConsumed,
  selfId,
  ensureSelfId,
}: Props) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  // Resolve `ref:<pageId>` hrefs to page displayNames (chip mirrors LinkInput).
  // Skip the editor read entirely for non-link actions so we don't subscribe.
  const isLink = action.type === "link";
  const { pageNames } = useEditor(state => {
    if (!isLink) return { pageNames: undefined };
    const map = new Map<string, string>();
    const root = state.nodes[ROOT_NODE];
    if (root?.data?.nodes) {
      for (const childId of root.data.nodes) {
        const n = state.nodes[childId];
        if (n?.data?.props?.type === "page") {
          map.set(childId, (n.data.custom?.displayName as string) || "Untitled Page");
        }
      }
    }
    return { pageNames: map };
  });

  const Icon = TYPE_ICON[action.type as ActionType] || TbPointer;
  const typeLabel = actionTypeLabel(action);
  const summary = useMemo(() => describeAction(action, pageNames) || "Add…", [action, pageNames]);

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

  const handleClear = () => {
    if (open) setOpen(false);
    onRemove();
  };

  const showHideTarget =
    action.type === "show-hide" ? ((action as any).target as string | undefined) : undefined;

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label={typeLabel}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={handleClear}
        triggerAriaLabel="Edit action"
        clearAriaLabel="Remove action"
        leading={<Icon className="size-3.5" aria-hidden />}
        summary={summary}
        trailingExtras={
          action.type === "show-hide" ? (
            <PeekTargetButton target={showHideTarget} size="sm" />
          ) : null
        }
      />
      {open && (
        <Suspense fallback={null}>
          <ActionEditorPanel
            action={action}
            onChange={onChange}
            onRemove={onRemove}
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
            selfId={selfId}
            ensureSelfId={ensureSelfId}
          />
        </Suspense>
      )}
    </>
  );
}
