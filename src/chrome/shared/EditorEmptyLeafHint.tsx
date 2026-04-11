import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type EditorEmptyLeafHintProps = {
  /** This node is the Craft selection (stronger chrome). */
  selected: boolean;
  icon: ReactNode;
  /** Short label (idle row uses uppercase tracking). */
  idleLabel: string;
  /** Shown after an em dash when selected, e.g. "Click to edit". */
  selectedDetail: string;
  className?: string;
};

/** Canvas empty-state for leaf components: subtle when unselected, clearer when selected (same pattern as Text). */
export function EditorEmptyLeafHint({
  selected,
  icon,
  idleLabel,
  selectedDetail,
  className,
}: EditorEmptyLeafHintProps) {
  if (selected) {
    return (
      <div
        className={twMerge(
          "flex min-h-8 w-full items-center gap-2 rounded-md border border-dashed border-base-300/70 bg-base-200/50 px-2 py-2 text-left text-xs text-neutral-content/80",
          className,
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center opacity-70 [&>svg]:size-4" aria-hidden>
          {icon}
        </span>
        <span className="italic">
          {idleLabel} — {selectedDetail}
        </span>
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        "flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-base-300/45 bg-base-200/35 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-content/55",
        className,
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center opacity-60 [&>svg]:size-3.5" aria-hidden>
        {icon}
      </span>
      <span>{idleLabel}</span>
    </div>
  );
}
