import { TbX } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";
import { ToolbarIconButton } from "./ToolbarIconButton";

/**
 * Trailing `×` button that lives inside an `input-wrapper`. Matches the clear
 * button on `PopoverChip` (Action, Animations, Conditions, Bundle, Gradient).
 * Render as a sibling of the swatch / preview tile inside the same wrapper —
 * not absolute-positioned.
 *
 * The default shape composes from `ToolbarIconButton` (ghost variant). The
 * `floating` variant is a different shape (chip-style overlay over a media
 * preview tile) and stays inline rather than going through the primitive.
 */
export const InlineClearButton = ({
  onClick,
  tooltip = "Clear",
  floating = false,
  className = "",
}: {
  onClick: (e: React.MouseEvent) => void;
  tooltip?: string;
  /** When true, overlay-position the button over a preview tile (top-right corner, neutral chip). */
  floating?: boolean;
  className?: string;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
  };
  if (floating) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`bg-base-100/90 text-base-content border-base-300 hover:bg-base-100 absolute top-1 right-1 z-10 flex size-5 items-center justify-center rounded border shadow-sm ${className}`}
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content={tooltip}
        aria-label={tooltip}
      >
        <TbX className="size-3" aria-hidden />
      </button>
    );
  }
  return (
    <ToolbarIconButton
      onClick={handleClick}
      ariaLabel={tooltip}
      tooltip={tooltip}
      className={className}
    >
      <TbX className="size-3" aria-hidden />
    </ToolbarIconButton>
  );
};
