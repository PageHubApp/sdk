import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";

interface SubgroupPopoutProps {
  isVisible: boolean;
  anchorElement: HTMLElement | null;
  subgroupName: string;
  options: string[];
  showHints: boolean;
  hintType: "pixel" | "percentage" | "ms" | "custom";
  onSelect: (option: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  propTag?: string;
}

// Popout component that renders outside the dropdown
export function SubgroupPopout({
  isVisible,
  anchorElement,
  subgroupName,
  options,
  showHints,
  hintType,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  propTag,
}: SubgroupPopoutProps) {
  if (!isVisible || !anchorElement) return null;

  // Helper to get display label (humanize token)
  const getDisplayLabel = (option: string) => {
    return formatTailwindDisplayLabel(option, propTag);
  };

  const rect = anchorElement.getBoundingClientRect();
  // Sit outside the anchor’s right edge (was rect.right - 8, which drew the flyout on top of the parent column).
  const gapPx = 4;
  const left = rect.right + gapPx;

  const style = {
    position: "fixed" as const,
    left,
    top: rect.top,
    zIndex: 99999,
  };

  // Hover bridge from anchor right edge to the popout so the cursor path doesn’t drop hover.
  const bridgeStyle = {
    position: "fixed" as const,
    left: rect.right,
    top: rect.top,
    width: gapPx,
    height: rect.height,
    zIndex: 99998,
    backgroundColor: "transparent",
    pointerEvents: "auto" as const,
  };

  return ReactDOM.createPortal(
    <>
      {/* Invisible hover bridge */}
      <div
        role="presentation"
        aria-hidden="true"
        style={bridgeStyle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      {/* Main popout */}
      <div
        role="presentation"
        style={style}
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
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
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

// Subgroup item component with hover state management
export function SubgroupItem({
  subgroupName,
  options,
  showHints,
  hintType,
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
    // Add a small delay before hiding to allow moving to popout
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
        subgroupName={subgroupName}
        options={options}
        showHints={showHints}
        hintType={hintType}
        onSelect={onSelect}
        onMouseEnter={handlePopoutMouseEnter}
        onMouseLeave={handlePopoutMouseLeave}
        propTag={propTag}
      />
    </div>
  );
}
