import React, { useEffect, useRef } from "react";
import { TbChevronRight, TbGripVertical, TbTrash } from "react-icons/tb";

/**
 * ListItemPopover — Compact row + inline detail panel for list editors.
 *
 * Each item renders as a slim row (~32px). Clicking opens an inline detail
 * panel directly below the list, containing the item's editable fields.
 * Only one panel is open at a time (controlled by parent via activeIndex/setActiveIndex).
 */

// ── Single row ──────────────────────────────────────────────────────────────

export const ListItemRow = ({
  index,
  label,
  isActive,
  onActivate,
  onDelete,
  extraButtons = [],
  dragHandleProps = {},
}: {
  index: number;
  label: React.ReactNode;
  isActive: boolean;
  onActivate: () => void;
  onDelete?: () => void;
  extraButtons?: React.ReactNode[];
  dragHandleProps?: Record<string, any>;
}) => {
  return (
    <div
      data-list-row={index}
      className={`group flex h-8 items-center gap-1 border-b border-base-300 px-1.5 text-sm transition-colors last:border-b-0 ${
        isActive
          ? "bg-accent text-accent-content"
          : "bg-sidebar text-sidebar-foreground hover:bg-accent/50"
      }`}
    >
      {/* Drag handle */}
      <span
        className="flex shrink-0 cursor-grab items-center text-neutral-content opacity-0 group-hover:opacity-100"
        {...dragHandleProps}
      >
        <TbGripVertical className="h-3.5 w-3.5" />
      </span>

      {/* Label — fills available space */}
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-center truncate text-left text-xs"
        onClick={onActivate}
      >
        <span className="truncate">{label}</span>
      </button>

      {/* Extra action buttons (e.g. "select node") */}
      {extraButtons.map((btn, k) => (
        <span key={k} className="shrink-0 opacity-0 group-hover:opacity-100">
          {btn}
        </span>
      ))}

      {/* Delete */}
      {onDelete && (
        <button
          className="flex shrink-0 items-center text-neutral-content opacity-0 transition-colors hover:text-error group-hover:opacity-100"
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <TbTrash className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Chevron indicator */}
      <TbChevronRight
        className={`h-3.5 w-3.5 shrink-0 text-neutral-content transition-transform ${
          isActive ? "rotate-90" : ""
        }`}
      />
    </div>
  );
};

// ── Inline detail panel ─────────────────────────────────────────────────────

const DetailPanel = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll into view when opened
  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <div
      ref={panelRef}
      className="border-t border-base-300 bg-base-200 p-3"
    >
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
};

// ── Composed list container ─────────────────────────────────────────────────

export const ListEditor = ({
  items,
  activeIndex,
  setActiveIndex,
  renderLabel,
  renderPopover,
  onDelete,
  onAdd,
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
  addLabel?: string;
  extraButtons?: (item: any, index: number) => React.ReactNode[];
}) => {
  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-base-300">
          {items.map((item, index) => (
            <React.Fragment key={item.id ?? index}>
              <ListItemRow
                index={index}
                label={renderLabel(item, index)}
                isActive={activeIndex === index}
                onActivate={() =>
                  setActiveIndex(activeIndex === index ? null : index)
                }
                onDelete={onDelete ? () => onDelete(item, index) : undefined}
                extraButtons={extraButtons ? extraButtons(item, index) : []}
              />
              {activeIndex === index && (
                <DetailPanel>
                  {renderPopover(item, index)}
                </DetailPanel>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {onAdd && (
        <button className="btn-primary w-full p-2.5" onClick={onAdd}>
          <span className="mr-1.5 inline-flex text-base">+</span> {addLabel}
        </button>
      )}
    </div>
  );
};
