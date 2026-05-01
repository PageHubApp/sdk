import { useCallback, useState } from "react";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbCheck, TbChevronRight, TbCopy, TbLayersSubtract, TbTrash } from "react-icons/tb";
import { ToolbarDashedButton } from "../../primitives/ToolbarDashedButton";
import { BreakpointBadge, Card } from "../../ToolbarStyle";
import {
  BP_SCOPE_ROW_IDLE,
  BP_SCOPE_ROW_SELECTED,
  CARD_BG_BY_BUCKET,
  CLASS_BREAKPOINT_BUCKETS,
} from "./classItemUtils";

// ─── Types ───

interface BreakpointBucketsProps {
  bucketLists: Record<string, string[]>;
  otherClasses: string[];
  rawTokenDisplay?: boolean;
  selectedViews: Record<string, boolean>;
  toggleView: (view: string) => void;
  dragOverCategory: string | null;
  onDragOver: (e: React.DragEvent, category: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, category: string) => void;
  onDragStart: (e: React.DragEvent, data: any) => void;
  onDragEnd: () => void;
  onDelete: (cls: string, view: string, deleteLinked?: boolean) => void;
  onClearBucket: (classes: string[]) => void;
  onClearAll: () => void;
  draggedItem: any;
  /** When false, parent renders Clear All (e.g. after Inline Style). Default true. */
  showClearAllButton?: boolean;
}

// ─── Shared sub-components ───

function ActionButton({
  icon,
  tooltip,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded p-1 transition-all hover:scale-110 ${className}`}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={tooltip}
      data-tooltip-place="top"
      data-tooltip-offset={10}
    >
      {icon}
    </button>
  );
}

function DropZone({
  id,
  classes,
  rawTokenDisplay = false,
  dragOverCategory,
  isDragging,
  borderIdle,
  dropValid,
  dropInvalid,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onDelete,
}: {
  id: string;
  classes: string[];
  rawTokenDisplay?: boolean;
  dragOverCategory: string | null;
  isDragging: boolean;
  borderIdle: string;
  dropValid: string;
  dropInvalid: string;
  onDragOver: (e: React.DragEvent, category: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, category: string) => void;
  onDragStart: (e: React.DragEvent, data: any) => void;
  onDragEnd: () => void;
  onDelete: (cls: string, view: string, deleteLinked?: boolean) => void;
}) {
  const isHovered = dragOverCategory === id;
  const isInvalid = dragOverCategory === `invalid-${id}`;
  const dropzoneClass = isHovered
    ? `${dropValid} ring-1 ring-base-content/25 scale-[1.01]`
    : isInvalid
      ? dropInvalid
      : isDragging
        ? "ring-1 ring-base-content/20"
        : "";

  return (
    <div
      role="presentation"
      className={`flex flex-wrap gap-1.5 rounded-lg border border-dashed p-2 transition-all ${borderIdle} ${dropzoneClass}`}
      onDragOver={e => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, id)}
    >
      {classes.map((cls, key) => (
        <Card
          key={`${id}-${cls}-${key}`}
          value={cls}
          displayValue={rawTokenDisplay ? cls : undefined}
          onClick={(e: any, options: any) => onDelete(cls, id, options?.deleteLinked)}
          bgColor={CARD_BG_BY_BUCKET[id] || "bg-neutral text-base-content"}
          onDragStart={(e: any, data: any) => onDragStart(e, { ...data, sourceCategory: id })}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

// ─── Clear all (shared with ClassItem when button is placed after Inline Style) ───

export function ClearAllStylesButton({ onClick }: { onClick: () => void }) {
  return (
    <ToolbarDashedButton onClick={onClick} icon={<TbTrash size={12} aria-hidden />}>
      Clear All Styles
    </ToolbarDashedButton>
  );
}

// ─── Main ───

export function BreakpointBuckets({
  bucketLists,
  otherClasses,
  rawTokenDisplay = false,
  selectedViews,
  toggleView,
  dragOverCategory,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onDelete,
  onClearBucket,
  onClearAll,
  draggedItem,
  showClearAllButton = true,
}: BreakpointBucketsProps) {
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);
  /** Base (mobile) defaults expanded so it matches breakpoint rows; user can collapse like other buckets. */
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({ mobile: true });

  const allClasses = [...Object.values(bucketLists).flat(), ...otherClasses];

  const copyClasses = useCallback((classArray: string[], category: string) => {
    if (classArray.length === 0) return;
    navigator.clipboard.writeText(classArray.join(" "));
    setCopiedCategory(category);
    setTimeout(() => setCopiedCategory(null), 2000);
  }, []);

  const toggleManual = useCallback((id: string) => {
    setManualOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isBucketOpen = (id: string, list: string[]) =>
    list.length > 0 ||
    manualOpen[id] ||
    dragOverCategory === id ||
    dragOverCategory === `invalid-${id}`;

  const isDragging = !!draggedItem;

  return (
    <>
      {CLASS_BREAKPOINT_BUCKETS.map(row => {
        const list = bucketLists[row.id] || [];
        const isOn = selectedViews[row.id];
        const open = isBucketOpen(row.id, list) || isDragging;

        return (
          <div key={row.id} className="w-full space-y-2">
            {/* Full-width row: chevron | scope toggle (flex-1) | actions */}
            <div className="flex w-full min-w-0 items-stretch gap-1">
              <div className="flex w-7 shrink-0 items-start justify-center pt-2">
                <button
                  type="button"
                  onClick={() => toggleManual(row.id)}
                  className="text-neutral-content hover:text-base-content rounded p-0.5 transition-colors"
                  aria-label={open ? "Collapse bucket" : "Expand bucket"}
                  aria-expanded={open}
                >
                  <TbChevronRight
                    className={`size-3 transition-transform ${open ? "rotate-90" : ""}`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => toggleView(row.id)}
                className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  isOn ? BP_SCOPE_ROW_SELECTED : BP_SCOPE_ROW_IDLE
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{row.label}</span>
                  {!open && list.length > 0 && <BreakpointBadge>{list.length}</BreakpointBadge>}
                </span>
                <span className="shrink-0 text-end text-[10px] font-normal tabular-nums opacity-70">
                  {row.hint}
                </span>
              </button>

              {list.length > 0 && (
                <div className="flex shrink-0 items-center self-center">
                  <ActionButton
                    icon={<TbTrash className="size-3.5" />}
                    tooltip="Clear"
                    onClick={() => onClearBucket(list)}
                    className="text-neutral-content hover:bg-error/10 hover:text-error"
                  />
                  <ActionButton
                    icon={
                      copiedCategory === row.id ? (
                        <TbCheck className="size-3.5" />
                      ) : (
                        <TbCopy className="size-3.5" />
                      )
                    }
                    tooltip={copiedCategory === row.id ? "Copied!" : `Copy ${row.id} classes`}
                    onClick={() => copyClasses(list, row.id)}
                    className="text-neutral-content hover:bg-accent/10 hover:text-base-content"
                  />
                </div>
              )}
            </div>

            {/* Drop zone — only when open */}
            {open && (
              <DropZone
                id={row.id}
                classes={list}
                rawTokenDisplay={rawTokenDisplay}
                dragOverCategory={dragOverCategory}
                isDragging={isDragging}
                borderIdle={row.borderIdle}
                dropValid={row.dropValid}
                dropInvalid={row.dropInvalid}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}

      {/* Other variants — only if populated */}
      {otherClasses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-neutral-content flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium">
              <TbLayersSubtract className="size-3.5 shrink-0 opacity-80" />
              <span className="flex flex-col items-start leading-tight">
                <span>Other variants</span>
                <span className="text-[10px] font-normal opacity-80">hover, max-, etc.</span>
              </span>
            </div>
            <div className="ml-auto flex items-center">
              <ActionButton
                icon={<TbTrash className="size-3.5" />}
                tooltip="Clear"
                onClick={() => onClearBucket(otherClasses)}
                className="text-neutral-content hover:bg-error/10 hover:text-error"
              />
              <ActionButton
                icon={
                  copiedCategory === "other" ? (
                    <TbCheck className="size-3.5" />
                  ) : (
                    <TbCopy className="size-3.5" />
                  )
                }
                tooltip={copiedCategory === "other" ? "Copied!" : "Copy other classes"}
                onClick={() => copyClasses(otherClasses, "other")}
                className="text-neutral-content hover:bg-accent/10 hover:text-base-content"
              />
            </div>
          </div>
          <div
            role="presentation"
            className={`border-base-300 flex flex-wrap gap-1.5 rounded-lg border border-dashed p-2 transition-colors ${
              dragOverCategory === "invalid-other"
                ? "border-error bg-error/10 border-2 border-dashed"
                : ""
            }`}
            onDragOver={e => {
              e.preventDefault();
              if (draggedItem) onDragOver(e, "other");
            }}
            onDragLeave={onDragLeave}
          >
            {otherClasses.map((cls, key) => (
              <Card
                key={`other-${cls}-${key}`}
                value={cls}
                displayValue={rawTokenDisplay ? cls : undefined}
                onClick={(e: any, options: any) => onDelete(cls, "other", options?.deleteLinked)}
                bgColor="bg-neutral text-base-content"
                onDragStart={(e: any, data: any) =>
                  onDragStart(e, { ...data, sourceCategory: "other" })
                }
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clear all — optional slot when parent renders after other sections (e.g. Inline Style) */}
      {showClearAllButton && allClasses.length > 0 && <ClearAllStylesButton onClick={onClearAll} />}
    </>
  );
}
