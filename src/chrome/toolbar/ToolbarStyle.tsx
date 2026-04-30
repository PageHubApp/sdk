import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import type { MouseEvent } from "react";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";

export { BreakpointBadge } from "./BreakpointBadge";

/** @deprecated Global tooltip handles truncated labels — kept for import compat, renders nothing. */
export const TruncatedLabelTooltip = () => null;

export const Card = ({
  value,
  displayValue,
  onClick,
  bgColor = "bg-primary text-primary-content",
  onDragStart,
  onDragEnd,
  draggable = true,
  tooltipValue,
}: {
  value: string;
  displayValue?: string;
  onClick: (e: MouseEvent, options?: { deleteLinked?: boolean }) => void;
  bgColor?: string;
  onDragStart: (e: any, data: any) => void;
  onDragEnd: (e?: any) => void;
  draggable?: boolean;
  tooltipValue?: string;
}) => {
  if (!value) {
    return null;
  }

  const resolvedDisplayValue = displayValue || formatTailwindDisplayLabel(value);
  const resolvedTooltipValue = tooltipValue || value;

  // Split the value to make the CSS variable part bold
  const renderDisplayValue = () => {
    const parts = resolvedDisplayValue.split("--");
    if (parts.length > 1) {
      return (
        <>
          {parts[0]}
          <span className="font-bold">--{parts[1]}</span>
        </>
      );
    }
    return resolvedDisplayValue;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.shiftKey) {
      // Shift+click: trigger copy action (handled by parent)
      if (onDragStart) {
        onDragStart(e, { value, type: "copy" });
      }
    } else {
      // Regular click: copy to clipboard
      navigator.clipboard
        .writeText(value)
        .then(() => {})
        .catch(err => {
          console.error("Failed to copy:", err);
        });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey) {
      // Ctrl + right-click: delete class and its linked classes
      if (onClick) {
        onClick(e, { deleteLinked: true });
      }
    } else {
      // Regular right-click: delete only this class
      if (onClick) {
        onClick(e, { deleteLinked: false });
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, { value, type: "move" });
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", value);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  return (
    <button
      draggable={draggable}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${bgColor} inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap hover:brightness-110 ${draggable ? "cursor-grab transition-transform hover:scale-105 active:cursor-grabbing" : "cursor-pointer"}`}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={resolvedTooltipValue}
      data-tooltip-place="top"
      data-tooltip-offset={10}
    >
      {renderDisplayValue()}
    </button>
  );
};

export const CardLight = ({ value, onClick, className = "" }) => {
  if (!value) {
    return null;
  }

  const displayValue = formatTailwindDisplayLabel(value);

  // Split the value to make the CSS variable part bold
  const renderDisplayValue = () => {
    const parts = displayValue.split("--");
    if (parts.length > 1) {
      return (
        <>
          {parts[0]}
          <span className="font-bold">--{parts[1]}</span>
        </>
      );
    }
    return displayValue;
  };

  return (
    <button
      onClick={onClick}
      className={`bg-base-200 text-base-content inline-flex cursor-pointer rounded-md px-1 py-0.5 text-xs font-medium ${className}`}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={`Add ${value}`}
      data-tooltip-place="top"
      data-tooltip-offset={10}
    >
      {renderDisplayValue()}
    </button>
  );
};

export const Accord = ({
  prop,
  accordion,
  setAccordion,
  title,
  children,
  className = "",
  buttons = [],
}) => {
  const active = accordion === prop;

  return (
    <div className={className}>
      <div className="text-sidebar-foreground flex gap-2 px-3 py-1.5">
        <button
          className="w-full cursor-pointer truncate pr-3 text-sm font-semibold whitespace-nowrap"
          onClick={() => setAccordion(active ? "" : prop)}
        >
          {title}
        </button>
        {buttons.map((_, k) => (
          <span key={k}>{_}</span>
        ))}
      </div>
      {active && children}
    </div>
  );
};

export type ToolbarItemProps = {
  label?: string;
  labelPrefix?: string;
  labelSuffix?: string;
  labelHide?: boolean;
  full?: boolean;
  propKey?: string;
  index?: number;
  children?: React.ReactNode;
  type: string;
  valueLabels?: any;
  max?: number;
  min?: number;
  step?: number;
  onChange?: (value: any) => any;
  class?: string;
  on?: any;
  option?: string;
  rows?: number;
  placeholder?: string;
  options?: any;
};
