import { Tooltip } from "components/layout/Tooltip";
import type { ReactNode } from "react";
import type { PlacesType } from "react-tooltip";

export const AnimatedButton = ({ children, className = "", ariaLabel = "", ...props }) => (
  <div className="h-8">
    <button
      type="button"
      onClick={props.onClick}
      className={`${className} origin-top cursor-pointer active:scale-90 transition-transform`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  </div>
);

export const AnimatedTooltipButton = ({
  content,
  placement = "bottom" as PlacesType,
  children,
  className = "flex h-8 w-8 flex-row items-center justify-center gap-3 rounded-full border border-base-300 bg-primary text-base text-primary-content shadow-inner transition-colors hover:bg-primary",
  ...props
}: {
  content: string;
  placement?: PlacesType;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <Tooltip content={content} placement={placement}>
    <AnimatedButton {...props} className={className} ariaLabel={content}>
      {children}
    </AnimatedButton>
  </Tooltip>
);

