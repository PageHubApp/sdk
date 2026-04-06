import { useState } from "react";
import { Tooltip } from "components/layout/Tooltip";
import { TbCheck, TbCopy, TbDeviceDesktop, TbDeviceMobile, TbLayersSubtract } from "react-icons/tb";
import { Card } from "../../ToolbarStyle";
import { CLASS_BREAKPOINT_BUCKETS, CARD_BG_BY_BUCKET } from "./classItemUtils";

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
  draggedItem: any;
}

function BreakpointBucketIcon({ icon, label }: { icon: string; label: string }) {
  if (icon === "mobile") return <TbDeviceMobile className="size-3.5" />;
  if (icon === "desktop") return <TbDeviceDesktop className="size-3.5" />;
  return <span className="min-w-[1.25rem] text-center font-mono text-[10px] font-bold tracking-tight">{label}</span>;
}

function CopyButton({ classes, category, copiedCategory, onCopy }: {
  classes: string[]; category: string; copiedCategory: string | null; onCopy: (classes: string[], category: string) => void;
}) {
  if (!classes || classes.length === 0) return null;
  return (
    <Tooltip content={copiedCategory === category ? "Copied!" : `Copy ${category} classes`} placement="top">
      <button onClick={() => onCopy(classes, category)} className="ml-auto rounded p-1 text-muted-foreground transition-all hover:scale-110 hover:bg-accent/10 hover:text-foreground">
        {copiedCategory === category ? <TbCheck className="size-3.5" /> : <TbCopy className="size-3.5" />}
      </button>
    </Tooltip>
  );
}

export function BreakpointBuckets({
  bucketLists, otherClasses, selectedViews, toggleView,
  dragOverCategory, onDragOver, onDragLeave, onDrop,
  onDragStart, onDragEnd, onDelete, draggedItem,
}: BreakpointBucketsProps) {
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);

  const copyClasses = (classArray: string[], category: string) => {
    if (classArray.length === 0) return;
    navigator.clipboard.writeText(classArray.join(" "));
    setCopiedCategory(category);
    setTimeout(() => setCopiedCategory(null), 2000);
  };

  return (
    <>
      {CLASS_BREAKPOINT_BUCKETS.map(row => {
        const list = bucketLists[row.id] || [];
        const isOn = selectedViews[row.id];

        return (
          <div key={row.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleView(row.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${isOn ? row.selectedBg : row.mutedHover}`}
              >
                <BreakpointBucketIcon icon={row.icon} label={row.label} />
                <span className="flex flex-col items-start leading-tight">
                  <span>{row.label}</span>
                  <span className="text-[10px] font-normal opacity-80">{row.hint}</span>
                </span>
              </button>
              <CopyButton classes={list} category={row.id} copiedCategory={copiedCategory} onCopy={copyClasses} />
            </div>
            <div
              role="presentation"
              className={`flex flex-wrap gap-1.5 rounded-lg border border-dashed p-2 transition-colors ${row.borderIdle} ${
                dragOverCategory === row.id ? row.dropValid : dragOverCategory === `invalid-${row.id}` ? row.dropInvalid : ""
              }`}
              onDragOver={e => onDragOver(e, row.id)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, row.id)}
            >
              {list.map((cls, key) => (
                <Card
                  key={`${row.id}-${cls}-${key}`}
                  value={cls}
                  onClick={(e: any, options: any) => onDelete(cls, row.id, options?.deleteLinked)}
                  bgColor={CARD_BG_BY_BUCKET[row.id]}
                  onDragStart={(e: any, data: any) => onDragStart(e, { ...data, sourceCategory: row.id })}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          </div>
        );
      })}

      {otherClasses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground">
              <TbLayersSubtract className="size-3.5 shrink-0 opacity-80" />
              <span className="flex flex-col items-start leading-tight">
                <span>Other variants</span>
                <span className="text-[10px] font-normal opacity-80">hover, max-, etc.</span>
              </span>
            </div>
            <CopyButton classes={otherClasses} category="other" copiedCategory={copiedCategory} onCopy={copyClasses} />
          </div>
          <div
            role="presentation"
            className={`flex flex-wrap gap-1.5 rounded-lg border border-dashed border-border p-2 transition-colors ${
              dragOverCategory === "invalid-other" ? "border-2 border-dashed border-destructive bg-destructive/10" : ""
            }`}
            onDragOver={e => { e.preventDefault(); if (draggedItem) onDragOver(e, "other"); }}
            onDragLeave={onDragLeave}
          >
            {otherClasses.map((cls, key) => (
              <Card
                key={`other-${cls}-${key}`}
                value={cls}
                onClick={(e: any, options: any) => onDelete(cls, "other", options?.deleteLinked)}
                bgColor="bg-muted text-foreground"
                onDragStart={(e: any, data: any) => onDragStart(e, { ...data, sourceCategory: "other" })}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

