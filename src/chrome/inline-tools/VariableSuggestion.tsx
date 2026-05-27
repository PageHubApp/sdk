import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { TbBuilding, TbCalendar, TbChevronRight, TbShoppingCart, TbVariable } from "react-icons/tb";
import type { SuggestionProps } from "@/core/tiptapExtensions/VariableNode";
import { useAnchoredPopover } from "@/chrome/popovers/useAnchoredPopover";
import { OVERLAY_Z_INLINE_TOOLS } from "@/chrome/popovers/overlayZIndex";
import { useOverlay } from "@/registry/hooks/useOverlay";

// ── Shared styles (same as ToolboxContextual) ───────────────────────────────

const CTX_HOVER =
  "outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content";
const CTX_ITEM = `flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${CTX_HOVER}`;
const CTX_SUBMENU_TRIGGER = `flex w-full cursor-default select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${CTX_HOVER}`;

const SUBMENU_FLIP = {
  crossAxis: true,
  fallbackPlacements: ["left-start", "right-end", "left-end"] as any[],
};

// ── Icons ───────────────────────────────────────────────────────────────────

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Company: TbBuilding,
  System: TbCalendar,
  Custom: TbVariable,
};

function getGroupIcon(group: string | undefined): React.ComponentType<{ className?: string }> {
  if (!group) return TbVariable;
  return GROUP_ICONS[group] || TbShoppingCart;
}

// ── Group items ─────────────────────────────────────────────────────────────

type VarItem = { id: string; label: string; group?: string };

function groupItems(items: VarItem[]) {
  const map = new Map<string, VarItem[]>();
  for (const item of items) {
    const g = item.group || "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(item);
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
  onSelect: (item: VarItem) => void;
  referenceRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const floating = useAnchoredPopover({
    open,
    placement: "right-start",
    strategy: "fixed",
    mainAxisOffset: -4,
    crossAxisOffset: 0,
    flipOptions: SUBMENU_FLIP,
    shiftPadding: 8,
  });

  // Sync the reference element
  useEffect(() => {
    if (referenceRef.current) {
      floating.refs.setReference(referenceRef.current);
    }
  }, [referenceRef.current, floating.refs.setReference]);

  if (!open) return null;

  const GroupIcon = getGroupIcon(group);

  return ReactDOM.createPortal(
    <div
      ref={floating.refs.setFloating}
      style={{ ...floating.floatingStyles, zIndex: OVERLAY_Z_INLINE_TOOLS }}
      className="border-base-300/50 bg-base-100 text-base-content max-w-[20rem] min-w-[13rem] overflow-y-auto rounded-xl border py-1 shadow-xl select-none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={CTX_ITEM}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(item);
          }}
        >
          <GroupIcon className="size-4 shrink-0 opacity-70" aria-hidden />
          <span className="flex-1 truncate">{item.label}</span>
          <span className="text-neutral-content/50 max-w-[7rem] truncate font-mono text-[10px]">
            {item.id}
          </span>
        </button>
      ))}
    </div>,
    document.body
  );
}

// ── Main popup ──────────────────────────────────────────────────────────────

export function VariableSuggestionPopup({ suggestion }: { suggestion: SuggestionProps | null }) {
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

  // Reset when suggestion changes
  useEffect(() => {
    setOpenGroup(null);
    groupRefs.current.clear();
  }, [suggestion?.query]);

  // Escape closes the open group via the registry overlay stack. Only
  // registers while a sub-group is open — Escape with no group open lets
  // the parent (suggestion list) dismissal handle itself.
  useOverlay({
    id: "variable-suggestion-group",
    isOpen: suggestion != null && openGroup != null,
    onDismiss: () => setOpenGroup(null),
  });

  if (!suggestion || !suggestion.items.length) return null;

  const rect = suggestion.clientRect?.();
  if (!rect) return null;

  const grouped = groupItems(suggestion.items);

  // If only one group, skip the submenu and show items directly
  if (grouped.length === 1) {
    const [group, items] = grouped[0];
    const GroupIcon = getGroupIcon(group);
    return ReactDOM.createPortal(
      <div
        className="pagehub-sdk-root"
        style={{
          position: "fixed",
          top: rect.bottom + 6,
          left: rect.left,
          zIndex: OVERLAY_Z_INLINE_TOOLS,
        }}
      >
        <div className="border-base-300/50 bg-base-100 text-base-content max-w-[20rem] min-w-[14rem] overflow-hidden rounded-xl border py-1 shadow-xl">
          <div className="bg-base-200/80 text-neutral-content px-3 py-1 text-[10px] font-semibold tracking-wide uppercase">
            {group}
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                className={CTX_ITEM}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  suggestion.command(item);
                }}
              >
                <GroupIcon className="size-4 shrink-0 opacity-70" aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="text-neutral-content/50 max-w-[7rem] truncate font-mono text-[10px]">
                  {item.id}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Multiple groups: show group triggers with flyout submenus
  const getRef = (group: string) => {
    if (!groupRefs.current.has(group)) {
      groupRefs.current.set(group, React.createRef());
    }
    return groupRefs.current.get(group)!;
  };

  return ReactDOM.createPortal(
    <div
      className="pagehub-sdk-root"
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: OVERLAY_Z_INLINE_TOOLS,
      }}
    >
      <div className="border-base-300/50 bg-base-100 text-base-content min-w-[12rem] overflow-visible rounded-xl border py-1 shadow-xl select-none">
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
                onSelect={item => suggestion.command(item)}
                referenceRef={ref}
                onMouseEnter={cancelLeave}
                onMouseLeave={scheduleClose}
              />
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
