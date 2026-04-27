import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";
import { useAnchoredPopover } from "../../../overlays/useAnchoredPopover";
import { OVERLAY_Z_UNIFIED_DROPDOWN } from "../../../overlays/overlayZIndex";

interface SubgroupPopoutProps {
  isVisible: boolean;
  anchorElement: HTMLElement | null;
  options: string[];
  onSelect: (option: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  propTag?: string;
}

const SUBGROUP_POPOUT_OFFSET = 4;

export function SubgroupPopout({
  isVisible,
  anchorElement,
  options,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  propTag,
}: SubgroupPopoutProps) {
  const getDisplayLabel = (option: string) => formatTailwindDisplayLabel(option, propTag);

  const floating = useAnchoredPopover({
    open: isVisible,
    placement: "right-start",
    mainAxisOffset: SUBGROUP_POPOUT_OFFSET,
    shiftPadding: 8,
    boundary: [],
    rootBoundary: "viewport",
  });

  useLayoutEffect(() => {
    floating.refs.setReference(anchorElement);
    if (isVisible) void floating.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync reference to anchor
  }, [anchorElement, isVisible]);

  if (!isVisible || !anchorElement) return null;

  const popoutStyle: React.CSSProperties = {
    ...floating.floatingStyles,
    zIndex: OVERLAY_Z_UNIFIED_DROPDOWN + 1,
  };

  return ReactDOM.createPortal(
    <div
      ref={floating.refs.setFloating}
      role="presentation"
      style={popoutStyle}
      className="border-base-300 bg-base-200 max-w-[350px] min-w-[200px] rounded-md border p-0.5 shadow-xl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="scrollbar grid max-h-40 grid-cols-6 flex-row gap-1 overflow-y-auto">
        {options.map(option => (
          <button
            key={option}
            className="border-base-300/50 hover:border-accent hover:bg-accent hover:text-accent-content rounded border px-2 py-1.5 text-left text-xs transition-colors"
            onClick={() => onSelect(option)}
          >
            <span className="text-xs">{getDisplayLabel(option)}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

interface SubgroupItemProps {
  subgroupName: string;
  options: string[];
  showHints: boolean;
  hintType: "pixel" | "percentage" | "ms" | "custom";
  onSelect: (option: string) => void;
  propTag?: string;
}

export function SubgroupItem({
  subgroupName,
  options,
  onSelect,
  propTag,
}: SubgroupItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const handlePopoutMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handlePopoutMouseLeave = () => {
    setIsHovered(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleRowClick = () => {
    if (options.length > 0) {
      onSelect(options[0]);
    }
  };

  return (
    <div className="relative">
      <div
        ref={setAnchorElement}
        role="button"
        tabIndex={0}
        className="text-neutral-content hover:bg-neutral w-full cursor-pointer rounded px-2 py-1 text-left text-xs font-medium transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleRowClick}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
      >
        {subgroupName}
      </div>
      <SubgroupPopout
        isVisible={isHovered}
        anchorElement={anchorElement}
        options={options}
        onSelect={onSelect}
        onMouseEnter={handlePopoutMouseEnter}
        onMouseLeave={handlePopoutMouseLeave}
        propTag={propTag}
      />
    </div>
  );
}
