// @ts-nocheck
import { Tooltip } from "components/layout/Tooltip";
import { TbInfoCircle, TbMoon, TbMoonOff } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { VIEW_BREAKPOINT_SCOPE_KEYS } from "../../utils/tailwind/className";
import { ToolbarLabel, ViewSelectionAtom } from "./Label";

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
  const [viewSelection, setViewSelection] = useAtomState(ViewSelectionAtom);
  const darkOn = viewSelection.dark ?? false;

  return (
    <div className="flex shrink-0 flex-nowrap items-center justify-end gap-0.5 w-full overflow-x-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
      {propType !== "root" && propType !== "component" && (
        <Tooltip content={darkOn ? "Editing dark: variants" : "Edit dark: variants"} placement="top" arrow={false}>
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setViewSelection(prev => ({ ...prev, dark: !prev.dark }));
            }}
            className={`flex shrink-0 cursor-pointer items-center justify-center rounded p-0.5 transition-colors ${
              darkOn
                ? "bg-violet-600/20 text-violet-800 ring-1 ring-violet-500/30 dark:text-violet-200"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            aria-pressed={darkOn}
            aria-label={darkOn ? "Dark variant scope on" : "Dark variant scope off"}
          >
            {darkOn ? <TbMoon className="size-3.5" /> : <TbMoonOff className="size-3.5 opacity-50" />}
          </button>
        </Tooltip>
      )}
      {VIEW_BREAKPOINT_SCOPE_KEYS.map(bp => (
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
  );
};

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
      <label htmlFor={propKey ? `input-${propKey}` : undefined} className="flex cursor-pointer items-center gap-1.5">
        {props?.label}
        <div className="hidden text-muted-foreground hover:text-foreground">
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
  if (inline) {
    // Inline mode: everything in one row
    // In inline mode, always show label if it exists (ignore labelHide for the label text)
    return (
      <>
        <div className={`flex w-full flex-col ${className}`}>
          <div className="relative flex w-full items-center gap-0.5">
            {props?.label && (
              <label htmlFor={`input-${propKey}`} className={`cursor-pointer whitespace-nowrap text-xs ${labelWidth || "w-20"} truncate`}>
                {props?.label}
              </label>
            )}
            <div className={`${inputWidth || "flex-1"}`}>{children}</div>
          </div>

          {!props?.labelHide && propType !== "root" && propType !== "component" && (
            <div className="flex w-full justify-end pr-1">
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
            </div>
          )}
        </div>

        {props.description && (
          <div className="mt-2 flex w-full items-start gap-2 rounded-lg border border-border bg-accent p-2">
            <p className="text-xxs leading-relaxed text-accent-foreground">{props.description}</p>
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

// Function to shorten verbose CSS variable classes
const shortenCSSVar = className => {
  if (typeof className !== "string") return String(className);
  return className.replace(/var\(--([^)]+)\)/g, "--$1");
};

export const Card = ({
  value,
  onClick,
  bgColor = "bg-primary text-primary-foreground",
  onDragStart,
  onDragEnd,
  draggable = true,
}) => {
  if (!value) {
    return null;
  }

  // Shorten the display value for better readability
  const displayValue = shortenCSSVar(value);

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
        .then(() => {
          console.log(`Copied to clipboard: ${value}`);
        })
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
      className={`${bgColor} inline-flex cursor-pointer whitespace-nowrap rounded-lg px-1.5 py-0.5 text-xs font-medium text-foreground hover:text-foreground hover:opacity-80 ${draggable ? "transition-transform hover:scale-105" : ""}`}
    >
      {renderDisplayValue()}
    </button>
  );
};

export const CardLight = ({ value, onClick, className = "" }) => {
  if (!value) {
    return null;
  }

  // Shorten the display value for better readability
  const displayValue = shortenCSSVar(value);

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
      className={`inline-flex cursor-pointer rounded-lg bg-background px-1 py-0.5 text-xs font-medium text-foreground ${className}`}
    >
      <Tooltip content={`Add ${value}`} placement="top" arrow={false}>
        {renderDisplayValue()}
      </Tooltip>
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
      <div className="flex gap-2 bg-sidebar px-3 py-1.5 text-sidebar-foreground">
        <button
          className="w-full cursor-pointer truncate whitespace-nowrap pr-3 text-sm font-semibold"
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
