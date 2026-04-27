/**
 * ActionInputPopover — thin trigger chip that opens a draggable FloatingPanel
 * containing the full ActionInput body. Same pattern as IconPickerPopover and
 * BundleRow: trigger stays cheap, heavy panel is lazy-loaded on first open.
 *
 * Used by the unified-settings registry (interactions.ts → "ActionInput").
 * Direct importers (NavMainTab, ButtonListMainTab) keep using the flat
 * ActionInput component since they're already inside their own dialogs.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TbPlus, TbPointer } from "react-icons/tb";
import { ACTION_TYPE_OPTIONS, migrateAction, type NodeAction } from "../../../../utils/action";
import { PopoverChip } from "../../../primitives/PopoverChip";
import { SideBarAtom } from "../../../../utils/lib";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const ActionPanel = lazy(() => import("./ActionPanel"));

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 460;

const ACTION_LABEL = new Map(ACTION_TYPE_OPTIONS.map(o => [o.value, o.label]));

function describeAction(a: NodeAction): string {
  const label = ACTION_LABEL.get(a.type) ?? a.type;
  if (a.type === "link" && (a as any).href) return `${label} → ${(a as any).href}`;
  if (a.type === "open-modal" && (a as any).target) return `${label} → ${(a as any).target}`;
  if (a.type === "show-hide" && (a as any).target) return `${label} → ${(a as any).target}`;
  return label;
}

export default function ActionInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

  const {
    actions: { setProp },
    id,
    actionList,
  } = useNode(node => {
    const props = node.data.props;
    const list: NodeAction[] = props.actions?.length
      ? (props.actions as NodeAction[])
      : (() => {
          const single = (props.action as NodeAction | undefined) ?? migrateAction(props);
          return single ? [single] : [];
        })();
    return { id: node.id, actionList: list };
  });

  const summary =
    actionList.length === 0
      ? "Add Action…"
      : actionList.length === 1
        ? describeAction(actionList[0])
        : `${actionList.length} actions`;

  const isEmpty = actionList.length === 0;

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

  // Auto-open on first mount if just added via +Add picker (legacy path).
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

  // Open whenever a popover-open-request is dispatched for this row. Per-key
  // counter — each dispatch bumps the version so we re-open on every click.
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

  const clearActions = () => {
    setProp((p: any) => {
      p.actions = [];
      p.action = null;
      delete p.click;
      delete p.url;
      delete p.urlTarget;
      delete p.clickMode;
    });
  };

  return (
    <>
      {/*
        Empty state — small `+` icon that opens the panel. Has-value state —
        chip with summary on the left, clear-X on the right. Both live in the
        accordion header (rendered from AccordionAddMenu for popover-only
        sections), so the trigger is always reachable.
      */}
      {isEmpty ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-expanded={open}
          aria-label="Add action"
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
            clearActions();
          }}
          triggerAriaLabel="Edit action"
          clearAriaLabel="Clear action"
          leading={<TbPointer className="size-3.5" aria-hidden />}
          summary={summary}
        />
      )}
      {open && (
        <Suspense fallback={null}>
          <ActionPanel
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
