import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import { cloneElement, isValidElement, useId, useState } from "react";
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
  delay = 0,
}) => {
  const instanceId = useId().replace(/:/g, "");
  const id = tooltipKey ? `tooltip-${tooltipKey}-${instanceId}` : `tooltip-${instanceId}`;
  const [isVisible, setIsVisible] = useState(true);

  const handleClick = (e: React.MouseEvent) => {
    setIsVisible(false);
    onClick(e);

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
    ...(delay > 0 ? { "data-tooltip-delay-show": delay } : {}),
    ...(String(tooltipClassName || "").trim()
      ? { "data-tooltip-class-name": String(tooltipClassName).trim() }
      : {}),
  };

  return (
    <>
      {isSingleElement ? (
        cloneElement(children, {
          ...tooltipProps,
          onClick: (e: React.MouseEvent) => {
            children.props?.onClick?.(e);
            handleClick(e);
          },
          className: `${children.props?.className || ""} ${className}`.trim(),
        })
      ) : (
        <div
          role="presentation"
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
          variant="light"
          classNameArrow="hidden"
          delayShow={delay}
          className={`${REACT_TOOLTIP_SURFACE_CLASS} ${tooltipClassName}`}
        />
      )}
    </>
  );
};
