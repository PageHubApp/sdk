import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";

export const Tooltip = ({
  children = null,
  content,
  arrow = false,
  placement = "top" as any,
  className = "",
  tooltipClassName = "",
  tipStyle = {},
  onClick = (e?: React.MouseEvent) => {},
  tooltipKey = "" as any,
  delay = 0,
  /** When true, wrapper is `flex w-full min-w-0` so block children (e.g. toolbar section titles) span full width. */
  full = false,
}: {
  children?: ReactNode;
  content: any;
  arrow?: boolean;
  placement?: any;
  className?: string;
  tooltipClassName?: string;
  tipStyle?: Record<string, unknown>;
  onClick?: (e?: React.MouseEvent) => void;
  tooltipKey?: any;
  delay?: number;
  full?: boolean;
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
  const isSingleElement =
    (isValidElement(children) && typeof children.type !== "string") ||
    (isValidElement(children) && typeof children.type === "string");

  const layout = full ? "flex w-full min-w-0" : "";
  const mergedClass = [layout, className].filter(Boolean).join(" ").trim();

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
        cloneElement(children as ReactElement<any>, {
          ...tooltipProps,
          onClick: (e: ReactMouseEvent<Element>) => {
            (children as ReactElement<any>).props?.onClick?.(e);
            handleClick(e);
          },
          className:
            `${(children as ReactElement<any>).props?.className || ""} ${mergedClass}`.trim(),
        })
      ) : (
        <div role="presentation" className={mergedClass} onClick={handleClick} {...tooltipProps}>
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
