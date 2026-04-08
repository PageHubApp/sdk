import { useCallback, useState } from "react";
import { Tooltip } from "components/layout/Tooltip";
import { TbCheck, TbChevronRight, TbCopy, TbDeviceDesktop, TbDeviceMobile, TbLayersSubtract, TbTrash } from "react-icons/tb";
import { Card } from "../../ToolbarStyle";
import { CLASS_BREAKPOINT_BUCKETS, CARD_BG_BY_BUCKET } from "./classItemUtils";

// ─── Types ───

interface BreakpointBucketsProps {
  bucketLists: Record<string, string[]>;
  otherClasses: string[];
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
}

// ─── Shared sub-components ───

function BucketIcon({ icon, label }: { icon: string; label: string }) {
  if (icon === "mobile") return <TbDeviceMobile className="size-3.5" />;
  if (icon === "desktop") return <TbDeviceDesktop className="size-3.5" />;
  return <span className="min-w-[1.25rem] text-center font-mono text-[10px] font-bold tracking-tight">{label}</span>;
}

function ActionButton({ icon, tooltip, onClick, className }: {
  icon: React.ReactNode; tooltip: string; onClick: () => void; className: string;
}) {
  return (
    <Tooltip content={tooltip} placement="top">
      <button type="button" onClick={e => { e.stopPropagation(); onClick(); }} className={`rounded p-1 transition-all hover:scale-110 ${className}`}>
        {icon}
      </button>
    </Tooltip>
  );
}

function DropZone({ id, classes, dragOverCategory, borderIdle, dropValid, dropInvalid, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd, onDelete }: {
  id: string; classes: string[]; dragOverCategory: string | null;
  borderIdle: string; dropValid: string; dropInvalid: string;
  onDragOver: (e: React.DragEvent, category: string) => void;
  onDragLeave: () => void; onDrop: (e: React.DragEvent, category: string) => void;
  onDragStart: (e: React.DragEvent, data: any) => void; onDragEnd: () => void;
  onDelete: (cls: string, view: string, deleteLinked?: boolean) => void;
}) {
  return (
    <div
      role="presentation"
      className={`flex flex-wrap gap-1.5 rounded-lg border border-dashed p-2 transition-colors ${borderIdle} ${
        dragOverCategory === id ? dropValid : dragOverCategory === `invalid-${id}` ? dropInvalid : ""
      }`}
      onDragOver={e => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, id)}
    >
      {classes.map((cls, key) => (
        <Card
          key={`${id}-${cls}-${key}`}
          value={cls}
          onClick={(e: any, options: any) => onDelete(cls, id, options?.deleteLinked)}
          bgColor={CARD_BG_BY_BUCKET[id] || "bg-neutral text-base-content"}
          onDragStart={(e: any, data: any) => onDragStart(e, { ...data, sourceCategory: id })}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

// ─── Main ───

export function BreakpointBuckets({
  bucketLists, otherClasses, selectedViews, toggleView,
  dragOverCategory, onDragOver, onDragLeave, onDrop,
  onDragStart, onDragEnd, onDelete, onClearBucket, onClearAll, draggedItem,
}: BreakpointBucketsProps) {
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});

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
    id === "mobile" || list.length > 0 || manualOpen[id] || dragOverCategory === id || dragOverCategory === `invalid-${id}`;

  const isDragging = !!draggedItem;

  return (
    <>
      {CLASS_BREAKPOINT_BUCKETS.map(row => {
        const list = bucketLists[row.id] || [];
        const isOn = selectedViews[row.id];
        const open = isBucketOpen(row.id, list) || isDragging;

        return (
          <div key={row.id} className="space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-2">
              {/* Collapse chevron + breakpoint toggle */}
              {/* Chevron — toggles collapse */}
              {row.id !== "mobile" && (
                <button
                  type="button"
                  onClick={() => toggleManual(row.id)}
                  className="rounded p-0.5 text-neutral-content transition-colors hover:text-base-content"
                >
                  <TbChevronRight className={`size-3 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
              )}

              {/* Breakpoint label — toggles write scope */}
              <button
                type="button"
                onClick={() => toggleView(row.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${isOn ? row.selectedBg : row.mutedHover}`}
              >
                <BucketIcon icon={row.icon} label={row.label} />
                <span className="flex flex-col items-start leading-tight">
                  <span>{row.label}</span>
                  <span className="text-[10px] font-normal opacity-80">{row.hint}</span>
                </span>
                {!open && list.length > 0 && (
                  <span className="ml-1 rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold">{list.length}</span>
                )}
              </button>

              {/* Actions — right-aligned */}
              {list.length > 0 && (
                <div className="ml-auto flex items-center">
                  <ActionButton
                    icon={<TbTrash className="size-3.5" />}
                    tooltip="Clear"
                    onClick={() => onClearBucket(list)}
                    className="text-neutral-content hover:bg-error/10 hover:text-error"
                  />
                  <ActionButton
                    icon={copiedCategory === row.id ? <TbCheck className="size-3.5" /> : <TbCopy className="size-3.5" />}
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
                id={row.id} classes={list} dragOverCategory={dragOverCategory}
                borderIdle={row.borderIdle} dropValid={row.dropValid} dropInvalid={row.dropInvalid}
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onDragStart={onDragStart} onDragEnd={onDragEnd} onDelete={onDelete}
              />
            )}
          </div>
        );
      })}

      {/* Other variants — only if populated */}
      {otherClasses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-content">
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
                icon={copiedCategory === "other" ? <TbCheck className="size-3.5" /> : <TbCopy className="size-3.5" />}
                tooltip={copiedCategory === "other" ? "Copied!" : "Copy other classes"}
                onClick={() => copyClasses(otherClasses, "other")}
                className="text-neutral-content hover:bg-accent/10 hover:text-base-content"
              />
            </div>
          </div>
          <div
            role="presentation"
            className={`flex flex-wrap gap-1.5 rounded-lg border border-dashed border-base-300 p-2 transition-colors ${
              dragOverCategory === "invalid-other" ? "border-2 border-dashed border-error bg-error/10" : ""
            }`}
            onDragOver={e => { e.preventDefault(); if (draggedItem) onDragOver(e, "other"); }}
            onDragLeave={onDragLeave}
          >
            {otherClasses.map((cls, key) => (
              <Card
                key={`other-${cls}-${key}`}
                value={cls}
                onClick={(e: any, options: any) => onDelete(cls, "other", options?.deleteLinked)}
                bgColor="bg-neutral text-base-content"
                onDragStart={(e: any, data: any) => onDragStart(e, { ...data, sourceCategory: "other" })}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clear all */}
      {allClasses.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-base-300 px-3 py-2 text-xs font-medium text-base-content transition-colors hover:bg-neutral"
        >
          <TbTrash className="size-3.5" />
          Clear All Styles
        </button>
      )}
    </>
  );
}
