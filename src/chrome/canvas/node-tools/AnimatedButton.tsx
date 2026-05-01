import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import type { ReactNode } from "react";

type PlacesType =
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end";

export const AnimatedButton = ({ children, className = "", ariaLabel = "", ...props }) => (
  <div className="h-8">
    <button
      type="button"
      {...props}
      className={`${className} origin-top cursor-pointer transition-transform active:scale-90`}
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
  <AnimatedButton
    {...props}
    className={className}
    ariaLabel={content}
    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
    data-tooltip-content={content}
    data-tooltip-place={placement}
    data-tooltip-offset={10}
  >
    {children}
  </AnimatedButton>
);
