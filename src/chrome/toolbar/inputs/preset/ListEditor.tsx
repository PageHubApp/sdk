import React, { useCallback, useEffect, useRef, useState } from "react";
import { TbChevronRight, TbGripVertical, TbTrash } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";
import { ToolbarDashedButton } from "../../primitives/ToolbarDashedButton";

/**
 * ListEditor — Compact row + inline detail panel for list editors.
 *
 * Each item renders as a slim row (~32px). The whole row is the activate
 * target — clicking anywhere except the explicit action buttons (drag handle,
 * extras, delete) toggles the inline detail panel directly below the list.
 *
 * Drag-to-reorder is opt-in via `onReorder`. The grip handle on each row is
 * the gesture surface; movement is tracked via window listeners (per
 * `.claude/rules/drag-listeners.md`) so the gesture survives re-renders /
 * pointer-leave / overlay traversal.
 */

// ── Single row ──────────────────────────────────────────────────────────────

interface ListItemRowProps {
  index: number;
  label: React.ReactNode;
  isActive: boolean;
  isDragSource: boolean;
  /** When non-null, render a 2px primary drop indicator at the row's top or bottom edge. */
  dropEdge: "top" | "bottom" | null;
  onActivate: () => void;
  onDelete?: () => void;
  extraButtons?: React.ReactNode[];
  onGripPointerDown?: (e: React.PointerEvent<HTMLSpanElement>) => void;
}

const ListItemRow = ({
  index,
  label,
  isActive,
  isDragSource,
  dropEdge,
  onActivate,
  onDelete,
  extraButtons = [],
  onGripPointerDown,
}: ListItemRowProps) => {
  const baseTone = isActive
    ? "bg-base-200 text-base-content"
    : "text-sidebar-foreground hover:bg-base-200/60";
  const dragTone = isDragSource ? "opacity-40" : "";
  return (
    <div
      data-list-row={index}
      className={`group border-base-300 relative flex h-8 items-center gap-1 border-b px-1.5 text-sm transition-colors last:border-b-0 ${baseTone} ${dragTone}`}
    >
      {dropEdge && (
        <span
          aria-hidden
          className={`bg-primary pointer-events-none absolute inset-x-0 z-10 h-0.5 ${
            dropEdge === "top" ? "-top-px" : "-bottom-px"
          }`}
        />
      )}
      {/* [drag] — gesture only, never toggles. */}
      <span
        className={`text-neutral-content flex shrink-0 items-center transition-opacity ${
          onGripPointerDown
            ? "cursor-grab opacity-0 group-hover:opacity-100 active:cursor-grabbing"
            : "cursor-default opacity-30"
        }`}
        onPointerDown={onGripPointerDown}
        data-tooltip-id={onGripPointerDown ? PAGEHUB_RTT_GLOBAL_ID : undefined}
        data-tooltip-content={onGripPointerDown ? "Drag to reorder" : undefined}
        aria-label={onGripPointerDown ? "Drag to reorder" : undefined}
      >
        <TbGripVertical className="h-3.5 w-3.5" />
      </span>

      {/* [label] — click to toggle. */}
      <button
        type="button"
        onClick={onActivate}
        className="flex min-w-0 flex-1 cursor-pointer items-center truncate text-left text-xs"
      >
        <span className="truncate">{label}</span>
      </button>

      {/* [actions] — own click handlers, do not toggle. */}
      {extraButtons.map((btn, k) => (
        <span key={k} className="shrink-0 opacity-0 group-hover:opacity-100">
          {btn}
        </span>
      ))}
      {onDelete && (
        <button
          type="button"
          className="text-neutral-content hover:text-error flex shrink-0 items-center opacity-0 transition-colors group-hover:opacity-100"
          onClick={onDelete}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Delete"
          aria-label="Delete"
        >
          <TbTrash className="h-3.5 w-3.5" />
        </button>
      )}

      {/* [arrow] — click to toggle. */}
      <button
        type="button"
        onClick={onActivate}
        aria-label={isActive ? "Collapse" : "Expand"}
        className="text-neutral-content hover:text-base-content flex shrink-0 cursor-pointer items-center"
      >
        <TbChevronRight
          aria-hidden
          className={`h-3.5 w-3.5 transition-transform ${isActive ? "rotate-90" : ""}`}
        />
      </button>
    </div>
  );
};

// ── Inline detail panel ─────────────────────────────────────────────────────

const DetailPanel = ({ children }: { children: React.ReactNode }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  return (
    <div
      ref={panelRef}
      className="border-base-300 flex flex-col gap-3 border-b px-3 py-3 last:border-b-0"
    >
      {children}
    </div>
  );
};

// ── Drag-to-reorder hook ────────────────────────────────────────────────────

/**
 * Window-listener-based drag for list reorder. Returns:
 *   - `dragSource` / `dragOver` for visual feedback
 *   - `startDrag(index)` to wire as `onPointerDown` on the grip handle
 *
 * Listeners attach on pointerdown, detach on pointerup / pointercancel /
 * window blur / `e.buttons === 0` mid-move, and on component unmount.
 */
function useReorderDrag(
  listRef: React.RefObject<HTMLDivElement | null>,
  onReorder?: (fromIndex: number, toIndex: number) => void
) {
  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragStateRef = useRef<{ from: number; over: number | null } | null>(null);
  const listenersRef = useRef<{ detach: () => void } | null>(null);

  const detach = useCallback(() => {
    listenersRef.current?.detach();
    listenersRef.current = null;
  }, []);

  // Tear down any in-flight gesture on unmount.
  useEffect(() => detach, [detach]);

  const finish = useCallback(
    (commit: boolean) => {
      const state = dragStateRef.current;
      detach();
      dragStateRef.current = null;
      setDragSource(null);
      setDragOver(null);
      if (commit && state && state.over !== null && state.over !== state.from && onReorder) {
        onReorder(state.from, state.over);
      }
    },
    [detach, onReorder]
  );

  const startDrag = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!onReorder) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      dragStateRef.current = { from: index, over: index };
      setDragSource(index);
      setDragOver(index);

      const onMove = (ev: PointerEvent) => {
        // Lost the button mid-drag (pointerup missed) — implicit end.
        if (ev.buttons === 0) {
          finish(true);
          return;
        }
        const root = listRef.current;
        if (!root) return;
        const rows = root.querySelectorAll<HTMLElement>("[data-list-row]");
        let over: number | null = null;
        for (const row of Array.from(rows)) {
          const r = row.getBoundingClientRect();
          if (ev.clientY >= r.top && ev.clientY <= r.bottom) {
            over = parseInt(row.dataset.listRow || "0", 10);
            break;
          }
        }
        if (over === null && rows.length) {
          // Above first row → 0; below last row → last index.
          const first = rows[0].getBoundingClientRect();
          const last = rows[rows.length - 1].getBoundingClientRect();
          if (ev.clientY < first.top) over = 0;
          else if (ev.clientY > last.bottom) over = rows.length - 1;
        }
        const state = dragStateRef.current;
        if (state && over !== null && over !== state.over) {
          state.over = over;
          setDragOver(over);
        }
      };
      const onEnd = () => finish(true);
      const onCancel = () => finish(false);

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("blur", onCancel);

      listenersRef.current = {
        detach: () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onEnd);
          window.removeEventListener("pointercancel", onCancel);
          window.removeEventListener("blur", onCancel);
        },
      };
    },
    [finish, listRef, onReorder]
  );

  return { dragSource, dragOver, startDrag };
}

// ── Composed list container ─────────────────────────────────────────────────

export const ListEditor = ({
  items,
  activeIndex,
  setActiveIndex,
  renderLabel,
  renderPopover,
  onDelete,
  onAdd,
  onReorder,
  addLabel = "Add Item",
  extraButtons,
}: {
  items: any[];
  /** Zedux `useAtomState` tuples are typed loosely in strict TS — keep permissive here. */
  activeIndex: any;
  setActiveIndex: (...args: any[]) => void;
  renderLabel: (item: any, index: number) => React.ReactNode;
  renderPopover: (item: any, index: number) => React.ReactNode;
  onDelete?: (item: any, index: number) => void;
  onAdd?: () => void;
  /** When supplied, the grip handle becomes a drag surface that calls this on drop. */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  addLabel?: string;
  extraButtons?: (item: any, index: number) => React.ReactNode[];
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const { dragSource, dragOver, startDrag } = useReorderDrag(listRef, onReorder);

  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <div ref={listRef} className="border-base-300 overflow-hidden rounded-lg border">
          {items.map((item, index) => (
            <React.Fragment key={item.id ?? index}>
              <ListItemRow
                index={index}
                label={renderLabel(item, index)}
                isActive={activeIndex === index}
                isDragSource={dragSource === index}
                dropEdge={
                  dragSource === null || dragOver !== index || dragSource === index
                    ? null
                    : dragSource > index
                      ? "top"
                      : "bottom"
                }
                onActivate={() => setActiveIndex(activeIndex === index ? null : index)}
                onDelete={onDelete ? () => onDelete(item, index) : undefined}
                extraButtons={extraButtons ? extraButtons(item, index) : []}
                onGripPointerDown={onReorder ? startDrag(index) : undefined}
              />
              {activeIndex === index && <DetailPanel>{renderPopover(item, index)}</DetailPanel>}
            </React.Fragment>
          ))}
        </div>
      )}

      {onAdd && <ToolbarDashedButton onClick={onAdd}>{addLabel}</ToolbarDashedButton>}
    </div>
  );
};

// Backwards-compatible re-export for any direct importers (none today, but
// keeps the name reachable if a host needed it).
export { ListItemRow };
