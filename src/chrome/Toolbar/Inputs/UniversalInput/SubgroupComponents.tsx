// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface SubgroupPopoutProps {
  isVisible: boolean;
  anchorElement: HTMLElement | null;
  subgroupName: string;
  options: string[];
  showHints: boolean;
  hintType: "pixel" | "percentage" | "custom";
  onSelect: (option: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  propTag?: string;
}

// Popout component that renders outside the dropdown
export const SubgroupPopout: React.FC<SubgroupPopoutProps> = ({
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
}) => {
  if (!isVisible || !anchorElement) return null;

  // Helper to get display label (strip prefix)
  const getDisplayLabel = (option: string) => {
    if (!propTag) return option;
    const prefix = `${propTag}-`;
    return option.startsWith(prefix) ? option.replace(prefix, "") : option;
  };

  const rect = anchorElement.getBoundingClientRect();
  const style = {
    position: "fixed" as const,
    left: rect.right - 8,
    top: rect.top,
    zIndex: 99999,
  };

  // Create a hover bridge - invisible element that connects the trigger to the popout
  const bridgeStyle = {
    position: "fixed" as const,
    left: rect.right,
    top: rect.top,
    width: 2, // Gap between trigger and popout
    height: rect.height,
    zIndex: 99998,
    backgroundColor: "transparent",
    pointerEvents: "auto" as const,
  };

  return ReactDOM.createPortal(
    <>
      {/* Invisible hover bridge */}
      <div style={bridgeStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      {/* Main popout */}
      <div
        style={style}
        className="min-w-[200px] max-w-[350px] rounded-md border border-border bg-popover p-0.5 shadow-xl"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="scrollbar grid max-h-40 grid-cols-6 flex-row gap-1 overflow-y-auto">
          {options.map(option => (
            <button
              key={option}
              className="rounded border border-border/50 px-2 py-1.5 text-left text-xs transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
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
};

interface SubgroupItemProps {
  subgroupName: string;
  options: string[];
  showHints: boolean;
  hintType: "pixel" | "percentage" | "custom";
  onSelect: (option: string) => void;
  propTag?: string;
}

// Subgroup item component with hover state management
export const SubgroupItem: React.FC<SubgroupItemProps> = ({
  subgroupName,
  options,
  showHints,
  hintType,
  onSelect,
  propTag,
}) => {
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

  return (
    <div className="relative">
      <div
        ref={setAnchorElement}
        className="w-full cursor-pointer rounded px-2 py-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
};
