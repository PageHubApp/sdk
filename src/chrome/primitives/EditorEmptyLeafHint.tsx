import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type EditorEmptyLeafHintProps = {
  /** This node is the Craft selection (stronger chrome). */
  selected: boolean;
  icon: ReactNode;
  selectedIcon?: ReactNode;
  /** Short label (kept compact so the hint footprint stays stable). */
  idleLabel: string;
  /** Alternate compact label shown when selected. */
  selectedLabel: string;
  className?: string;
};

/** Canvas empty-state for leaf components: subtle when unselected, clearer when selected (same pattern as Text). */
export function EditorEmptyLeafHint({
  selected,
  icon,
  selectedIcon,
  idleLabel,
  selectedLabel,
  className,
}: EditorEmptyLeafHintProps) {
  const activeIcon = selected && selectedIcon ? selectedIcon : icon;
  const activeLabel = selected ? selectedLabel : idleLabel;

  const baseClassName =
    "flex min-h-8 w-full items-center justify-center gap-1.5 border border-dashed px-2 py-1.5 text-[10px] font-medium uppercase";

  if (selected) {
    return (
      <div
        className={twMerge(
          `${baseClassName} border-base-300/70 bg-base-200/45 text-neutral-content/80`,
          className
        )}
      >
        <span
          className="flex size-3.5 shrink-0 items-center justify-center opacity-75 [&>svg]:size-3.5"
          aria-hidden
        >
          {activeIcon}
        </span>
        <span className="truncate whitespace-nowrap">{activeLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        `${baseClassName} border-base-300/45 bg-base-200/35 text-neutral-content/55`,
        className
      )}
    >
      <span
        className="flex size-3.5 shrink-0 items-center justify-center opacity-60 [&>svg]:size-3.5"
        aria-hidden
      >
        {activeIcon}
      </span>
      <span className="truncate whitespace-nowrap">{activeLabel}</span>
    </div>
  );
}
