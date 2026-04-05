// @ts-nocheck
import { cloneElement, isValidElement, useMemo, useRef, useState } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";

export const Tooltip = ({
  children = null,
  content,
  arrow = false,
  placement = "top" as any,
  className = "",
  tooltipClassName = "",
  tipStyle = {},
  onClick = (e?: React.MouseEvent) => { },
  tooltipKey = "" as any,
}) => {
  // Generate a stable ID once using useMemo to avoid infinite loops
  const id = useMemo(() => {
    if (tooltipKey) return `tooltip-${tooltipKey}`;
    return `tooltip-${Math.random().toString(36).substring(2, 9)}`;
  }, [tooltipKey, content]);
  const [isVisible, setIsVisible] = useState(true);

  const handleClick = (e: React.MouseEvent) => {
    setIsVisible(false);
    onClick(e);

    // Reset visibility after a short delay
    setTimeout(() => {
      setIsVisible(true);
    }, 1000);
  };

  // If single React element child, inject tooltip props directly — no wrapper div
  const isSingleElement = isValidElement(children) && typeof children.type !== "string" || (isValidElement(children) && typeof children.type === "string");

  const tooltipProps = {
    "data-tooltip-id": id,
    "data-tooltip-content": content,
    "data-tooltip-place": placement,
    "data-tooltip-offset": 10,
  };

  return (
    <>
      {isSingleElement ? (
        cloneElement(children, {
          ...tooltipProps,
          onClick: (e: React.MouseEvent) => {
            // Preserve child's onClick if any
            children.props?.onClick?.(e);
            handleClick(e);
          },
          className: `${children.props?.className || ""} ${className}`.trim(),
        })
      ) : (
        <div
          className={className}
          onClick={handleClick}
          {...tooltipProps}
        >
          {children}
        </div>
      )}
      {isVisible && (
        <ReactTooltip
          id={id}
          classNameArrow="hidden"
          className={`max-w-[220px] rounded-lg! border! !border-border !bg-primary px-2! py-1! text-xs! font-normal! !text-primary-foreground shadow-lg! ${tooltipClassName}`}
        />
      )}
    </>
  );
};
