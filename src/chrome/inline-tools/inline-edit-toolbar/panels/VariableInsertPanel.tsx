import type { Editor } from "@tiptap/react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbBraces, TbBuilding, TbCalendar, TbChevronRight, TbShoppingCart, TbVariable } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { getEditorVariableOptions } from "@/utils/editorVariableOptions";
import { useAnchoredPopover } from "@/chrome/overlays/useAnchoredPopover";

// ── Shared styles ───────────────────────────────────────────────────────────

const CTX_HOVER =
  "outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content";
const CTX_ITEM = `flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-left text-sm ${CTX_HOVER}`;
const CTX_SUBMENU_TRIGGER = `flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm ${CTX_HOVER}`;

const SUBMENU_FLIP = {
  crossAxis: true,
  fallbackPlacements: ["left-start", "right-end", "left-end"] as any[],
};

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Company: TbBuilding,
  System: TbCalendar,
  Custom: TbVariable,
};

function getGroupIcon(group?: string): React.ComponentType<{ className?: string }> {
  if (!group) return TbVariable;
  return GROUP_ICONS[group] || TbShoppingCart;
}

type VarItem = { id: string; label: string; group?: string };

function groupOptions(options: VarItem[]) {
  const map = new Map<string, VarItem[]>();
  for (const o of options) {
    const g = o.group || "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(o);
  }
  return [...map.entries()];
}

// ── Submenu flyout ──────────────────────────────────────────────────────────

function GroupSubmenu({
  group,
  items,
  open,
  onSelect,
  referenceRef,
  onMouseEnter,
  onMouseLeave,
}: {
  group: string;
  items: VarItem[];
  open: boolean;
  onSelect: (item: VarItem, e?: React.MouseEvent) => void;
  referenceRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const floating = useAnchoredPopover({
    open,
    placement: "right-start",
    strategy: "fixed",
    mainAxisOffset: -4,
    flipOptions: SUBMENU_FLIP,
    shiftPadding: 8,
  });

  React.useEffect(() => {
    if (referenceRef.current) floating.refs.setReference(referenceRef.current);
  }, [referenceRef.current, floating.refs.setReference]);

  if (!open) return null;

  const GroupIcon = getGroupIcon(group);

  return createPortal(
    <div
      ref={floating.refs.setFloating}
      style={{ ...floating.floatingStyles, zIndex: 100000 }}
      className="rounded-box border-base-300/50 bg-base-100 text-base-content min-w-[13rem] max-w-[20rem] overflow-y-auto border py-1 shadow-xl select-none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={CTX_ITEM}
          onPointerDown={e => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(item);
          }}
        >
          <GroupIcon className="size-4 shrink-0 opacity-70" aria-hidden />
          <span className="flex-1 truncate">{item.label}</span>
          <span className="text-neutral-content/50 font-mono text-[10px] truncate max-w-[7rem]">
            {item.id}
          </span>
        </button>
      ))}
    </div>,
    document.body
  );
}

// ── Dropdown body (Popover panel or context menu) ──────────────────────────

export function VariableInsertDropdownBody({
  editor,
  query,
  nodeId,
  onAction,
  onInserted,
}: {
  editor: Editor;
  query: any;
  nodeId?: string;
  onAction?: (cb: () => void) => (e: React.MouseEvent) => void;
  /** Fires after a variable is inserted (e.g. close host context menu). */
  onInserted?: () => void;
}) {
  const options = useMemo(() => getEditorVariableOptions(query, nodeId), [query, nodeId]);
  const grouped = useMemo(() => groupOptions(options), [options]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const groupRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());

  const cancelLeave = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelLeave();
    leaveTimer.current = window.setTimeout(() => {
      setOpenGroup(null);
      leaveTimer.current = null;
    }, 160);
  }, [cancelLeave]);

  const getRef = (group: string) => {
    if (!groupRefs.current.has(group)) groupRefs.current.set(group, React.createRef());
    return groupRefs.current.get(group)!;
  };

  const doInsert = (item: VarItem) => {
    (editor.chain().focus() as any).insertVariable({ id: item.id }).run();
    onInserted?.();
  };

  const insertVar = (item: VarItem, e?: React.MouseEvent) => {
    if (onAction && e) {
      onAction(() => doInsert(item))(e);
    } else {
      doInsert(item);
    }
  };

  if (grouped.length <= 1) {
    const [group, items] = grouped[0] || ["Variables", options];
    const GroupIcon = getGroupIcon(group);
    return (
      <>
        <div className="bg-base-200/80 text-neutral-content px-3 py-1 text-[10px] font-semibold tracking-wide uppercase">
          {group}
        </div>
        <div className="max-h-[280px] overflow-y-auto py-1">
          {items.map(o => (
            <button key={o.id} type="button" className={CTX_ITEM} onClick={e => insertVar(o, e)}>
              <GroupIcon className="size-4 shrink-0 opacity-70" aria-hidden />
              <span className="flex-1 truncate">{o.label}</span>
              <span className="text-neutral-content/50 font-mono text-[10px] truncate max-w-[7rem]">
                {o.id}
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {grouped.map(([group, items]) => {
        const GroupIcon = getGroupIcon(group);
        const ref = getRef(group);
        return (
          <div key={group}>
            <div
              ref={ref}
              onMouseEnter={() => {
                cancelLeave();
                setOpenGroup(group);
              }}
              onMouseLeave={scheduleClose}
            >
              <div className={CTX_SUBMENU_TRIGGER}>
                <span className="flex items-center gap-2">
                  <GroupIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                  {group}
                </span>
                <TbChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
              </div>
            </div>
            <GroupSubmenu
              group={group}
              items={items}
              open={openGroup === group}
              onSelect={insertVar}
              referenceRef={ref}
              onMouseEnter={cancelLeave}
              onMouseLeave={scheduleClose}
            />
          </div>
        );
      })}
    </>
  );
}

// ── Toolbar Popover wrapper ─────────────────────────────────────────────────

interface VariableInsertPanelProps {
  editor: Editor;
  query: any;
  nodeId?: string;
  /** When provided (MorePanel context), wraps the insert in a handler that preserves editor focus/selection. */
  onAction?: (cb: () => void) => (e: React.MouseEvent) => void;
}

export function VariableInsertPanel({ editor, query, nodeId, onAction }: VariableInsertPanelProps) {
  const options = useMemo(() => getEditorVariableOptions(query, nodeId), [query, nodeId]);
  const grouped = useMemo(() => groupOptions(options), [options]);

  if (grouped.length <= 1) {
    return (
      <Popover className="relative">
        <PopoverButton
          type="button"
          aria-label="Insert variable"
          className="tool-button"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Insert variable"
          data-tooltip-place="top"
          data-tooltip-offset={10}
        >
          <TbBraces className="size-4" aria-hidden />
        </PopoverButton>
        <PopoverPanel
          anchor="bottom start"
          transition
          className="pagehub-sdk-root rounded-box border-base-300/50 bg-base-100 text-base-content z-[120] mt-1 min-w-[14rem] max-w-[20rem] overflow-hidden border shadow-xl [--anchor-gap:4px] data-closed:opacity-0"
        >
          <VariableInsertDropdownBody editor={editor} query={query} nodeId={nodeId} onAction={onAction} />
        </PopoverPanel>
      </Popover>
    );
  }

  return (
    <Popover className="relative">
      <PopoverButton
        type="button"
        aria-label="Insert variable"
        className="tool-button"
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content="Insert variable"
        data-tooltip-place="top"
        data-tooltip-offset={10}
      >
        <TbBraces className="size-4" aria-hidden />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        transition
        className="pagehub-sdk-root rounded-box border-base-300/50 bg-base-100 text-base-content z-[120] mt-1 min-w-[12rem] overflow-visible border py-1 shadow-xl [--anchor-gap:4px] data-closed:opacity-0"
      >
        <VariableInsertDropdownBody editor={editor} query={query} nodeId={nodeId} onAction={onAction} />
      </PopoverPanel>
    </Popover>
  );
}
