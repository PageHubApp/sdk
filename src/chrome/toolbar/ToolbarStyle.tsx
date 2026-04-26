import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import type { MouseEvent } from "react";
import { useCallback } from "react";
import { TbInfoCircle } from "react-icons/tb";
import { VIEW_BREAKPOINT_SCOPE_KEYS } from "../../utils/tailwind/className";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";
import { ToolbarLabel } from "./Label";

export { BreakpointBadge } from "./BreakpointBadge";

/** Ref callback — sets data-tooltip attrs when text is clipped. */
function useTruncateRef() {
  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      el.setAttribute("data-tooltip-id", PAGEHUB_RTT_GLOBAL_ID);
      el.setAttribute("data-tooltip-content", el.textContent || "");
    } else {
      el.removeAttribute("data-tooltip-id");
      el.removeAttribute("data-tooltip-content");
    }
  }, []);
}

export const MobileDesktopLabels = ({
  lab,
  prefix,
  suffix,
  propType,
  propKey,
  index,
  propItemKey,
  icon,
  showDeleteIcon,
  showVarSelector,
  varSelectorPrefix,
}) => {
  return (
    <div
      role="presentation"
      className="ml-[1.5px] hidden flex-col gap-0.5 opacity-50 transition-opacity hover:opacity-100 has-[[data-has-value]]:flex"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex gap-0.5">
        {(["mobile", "sm", "desktop", "lg", "xl", "2xl"] as const).map(bp => (
          <ToolbarLabel
            key={bp}
            lab={lab}
            prefix={prefix}
            suffix={suffix}
            viewValue={bp}
            propType={propType}
            propKey={propKey}
            index={index}
            propItemKey={propItemKey}
            icon={icon}
            showDeleteIcon={showDeleteIcon}
            showVarSelector={showVarSelector}
            varSelectorPrefix={varSelectorPrefix}
            iconOnly
          />
        ))}
      </div>
    </div>
  );
};

/** @deprecated Global tooltip handles truncated labels — kept for import compat, renders nothing. */
export const TruncatedLabelTooltip = () => null;

export const BgWrap = ({ children, className = "", wrap = null }) => {
  if (wrap) {
    return children;
  }
  return <div className={`input-wrapper ${className || "input-hover"}`}>{children}</div>;
};

const Labler = ({
  props,
  lab,
  viewValue = "mobile",
  propType = "class",
  propKey,
  index = null,
  propItemKey = null,
  wrap = null,
}) => {
  if ((!props?.label && props?.labelHide) || wrap) return null;

  return (
    <h4 className={`toolbar-label ${lab ? "my-1" : "mb-1"} flex justify-between gap-3`}>
      <label
        htmlFor={propKey ? `input-${propKey}` : undefined}
        className="flex cursor-pointer items-center gap-1.5"
      >
        {props?.label}
        <div className="text-neutral-content hover:text-base-content hidden">
          <TbInfoCircle />
        </div>
      </label>

      {!props?.labelHide && (
        <MobileDesktopLabels
          lab={lab}
          prefix={props?.labelPrefix}
          suffix={props?.labelSuffix}
          propType={propType}
          propKey={propKey}
          index={index}
          propItemKey={propItemKey}
          icon={props?.labelIcon}
          showDeleteIcon={props?.showDeleteIcon}
          showVarSelector={props?.showVarSelector}
          varSelectorPrefix={props?.varSelectorPrefix}
        />
      )}
    </h4>
  );
};

export const Wrap = ({
  children,
  props,
  lab = "",
  viewValue = "mobile",
  propType = "class",
  propKey = "",
  index = null,
  propItemKey = null,
  wrap = null,
  inline = false,
  inputWidth = "",
  labelWidth = "",
  className = "",
}) => {
  const truncateRef = useTruncateRef();

  if (inline) {
    // Inline mode: everything in one row
    // In inline mode, always show label if it exists (ignore labelHide for the label text)
    const showPills = !props?.labelHide && propType !== "root" && propType !== "component";
    return (
      <>
        <div className={`flex w-full flex-col ${className}`}>
          <div className="relative flex w-full items-center gap-0.5">
            <div className={`flex flex-col items-start gap-0.5 ${labelWidth || "w-20"}`}>
              {props?.label && (
                <label
                  ref={truncateRef}
                  htmlFor={`input-${propKey}`}
                  className="w-full cursor-pointer truncate text-xs whitespace-nowrap"
                >
                  {props?.label}
                </label>
              )}
              {showPills && (
                <MobileDesktopLabels
                  lab={lab}
                  prefix={props?.labelPrefix}
                  suffix={props?.labelSuffix}
                  propType={propType}
                  propKey={propKey}
                  index={index}
                  propItemKey={propItemKey}
                  icon={props?.labelIcon}
                  showDeleteIcon={props?.showDeleteIcon}
                  showVarSelector={props?.showVarSelector}
                  varSelectorPrefix={props?.varSelectorPrefix}
                />
              )}
            </div>
            <div className={`${inputWidth || "flex-1"}`}>{children}</div>
          </div>
        </div>

        {props.description && (
          <div className="mt-2 w-full text-center">
            <p className="text-xxs text-neutral-content leading-relaxed">{props.description}</p>
          </div>
        )}
      </>
    );
  }

  // Default mode: 2 rows
  return (
    <div className="w-full">
      <Labler
        props={props}
        lab={lab}
        viewValue={viewValue}
        propType={propType}
        propKey={propKey}
        index={index}
        propItemKey={propItemKey}
        wrap={wrap}
      />
      {children}
    </div>
  );
};

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
      <div className="bg-sidebar text-sidebar-foreground flex gap-2 px-3 py-1.5">
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
