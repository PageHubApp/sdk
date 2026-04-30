import type { CSSProperties, ReactNode } from "react";
import { TbHandGrab, TbHandClick, TbHandTwoFingers } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { OVERLAY_Z_TOOLTIP } from "../overlays/overlayZIndex";

const TT_STYLE: CSSProperties = {
  zIndex: OVERLAY_Z_TOOLTIP,
  maxWidth: 220,
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#fff",
  color: "#1f2937",
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.4,
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  whiteSpace: "nowrap",
  textTransform: "none",
  letterSpacing: "normal",
};

export type EditorEmptyLeafHintProps = {
  /** This node is the Craft selection (stronger chrome). */
  selected: boolean;
  icon: ReactNode;
  selectedIcon?: ReactNode;
  /** Short label (kept compact so the hint footprint stays stable). */
  idleLabel: string;
  /** Alternate compact label shown when selected. */
  selectedLabel: string;
  /** When true, selected state shows action icons instead of text. */
  showActionIcons?: boolean;
  /** Optional tiny type label rendered under action icons in selected mode (e.g. "Section", "Page Header"). */
  typeLabel?: string;
  className?: string;
  /** When provided, the hint becomes clickable and fires this callback. */
  onClick?: () => void;
};

/** Canvas empty-state for leaf components: fills available space and centers a compact label. */
export function EditorEmptyLeafHint({
  selected,
  icon,
  selectedIcon,
  idleLabel,
  selectedLabel,
  showActionIcons,
  typeLabel,
  className,
  onClick,
}: EditorEmptyLeafHintProps) {
  const activeIcon = selected && selectedIcon ? selectedIcon : icon;
  const activeLabel = selected ? selectedLabel : idleLabel;

  const colorClassName = selected
    ? "border-base-300/70 bg-base-200/45 text-neutral-content/80"
    : "border-base-300/45 bg-base-200/35 text-neutral-content/55";

  const iconOpacity = selected ? "opacity-75" : "opacity-60";

  const inner =
    selected && showActionIcons ? (
      <div className="flex flex-col items-center gap-0.5 leading-none">
        <div
          className="flex items-center gap-2"
          aria-label="Drop, double-click, or right-click to insert"
        >
          <span className="tooltip tooltip-top">
            <span className="tooltip-content" style={TT_STYLE}>
              Drag from the sidebar
            </span>
            <TbHandGrab className="size-3 opacity-70" aria-hidden />
          </span>
          <span className="text-neutral-content/30 text-[7px]">·</span>
          <span className="tooltip tooltip-top">
            <span className="tooltip-content" style={TT_STYLE}>
              Double-click to add
            </span>
            <TbHandClick className="size-3 opacity-70" aria-hidden />
          </span>
          <span className="text-neutral-content/30 text-[7px]">·</span>
          <span className="tooltip tooltip-top">
            <span className="tooltip-content" style={TT_STYLE}>
              Right-click to add
            </span>
            <TbHandTwoFingers className="size-3 opacity-70" aria-hidden />
          </span>
        </div>
        {typeLabel && (
          <span className="truncate text-[8px] tracking-wide opacity-70">{typeLabel}</span>
        )}
      </div>
    ) : (
      <>
        <span
          className={`flex size-3.5 shrink-0 items-center justify-center ${iconOpacity} [&>svg]:size-3.5`}
          aria-hidden
        >
          {activeIcon}
        </span>
        <span className="truncate whitespace-nowrap">{activeLabel}</span>
      </>
    );

  const chipClassName = `flex min-h-8 items-center justify-center gap-1.5 border border-dashed px-2 py-1 text-[10px] font-medium uppercase ${colorClassName}`;

  return (
    <div className={twMerge("flex w-full flex-1 items-center justify-center", className)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`${chipClassName} cursor-pointer transition-opacity hover:opacity-100`}
        >
          {inner}
        </button>
      ) : (
        <div className={chipClassName}>{inner}</div>
      )}
    </div>
  );
}
