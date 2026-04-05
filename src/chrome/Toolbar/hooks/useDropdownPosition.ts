// @ts-nocheck
import { RefObject, useEffect, useState } from "react";

/**
 * Smart Dropdown Positioning Hook
 *
 * A reusable hook for intelligent dropdown/dialog positioning across the entire app.
 *
 * Features:
 * - Follows anchor element position (updates on scroll/resize)
 * - Smart directional opening (opens upward if no space below)
 * - Dynamic max-height calculation based on available space
 * - Fixed positioning (portaled to body)
 *
 * Usage Example:
 * ```tsx
 * const MyDropdown = ({ anchorRef, isOpen }) => {
 *   const position = useDropdownPosition({
 *     isOpen,
 *     anchorRef,
 *     offset: 4,
 *     maxHeight: 400,
 *     minSpaceRequired: 200,
 *   });
 *
 *   if (!position) return null;
 *
 *   return ReactDOM.createPortal(
 *     <div style={dropdownPositionToStyle(position)}>
 *       Content here
 *     </div>,
 *     document.body
 *   );
 * };
 * ```
 */

export interface DropdownPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width: number;
  maxHeight: number;
  openUpward: boolean;
}

interface UseDropdownPositionOptions {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement>;
  offset?: number;
  maxHeight?: number;
  minSpaceRequired?: number;
  align?: "left" | "right";
}

/**
 * Reusable hook for smart dropdown positioning
 * - Follows the anchor element
 * - Opens upward if no space below
 * - Handles scroll and resize events
 */
export function useDropdownPosition({
  isOpen,
  anchorRef,
  offset = 4,
  maxHeight = 400,
  minSpaceRequired = 200,
  align = "left",
}: UseDropdownPositionOptions): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) {
      setPosition(null);
      return;
    }

    const calculatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate available space
      const spaceBelow = viewportHeight - rect.bottom - offset;
      const spaceAbove = rect.top - offset;

      // Determine if we should open upward
      const shouldOpenUpward = spaceBelow < minSpaceRequired && spaceAbove > spaceBelow;

      // Calculate max height based on available space
      const availableSpace = shouldOpenUpward ? spaceAbove : spaceBelow;
      const calculatedMaxHeight = Math.min(maxHeight, availableSpace - 20); // 20px padding

      // Calculate position based on alignment
      const newPosition: DropdownPosition = {
        width: rect.width,
        maxHeight: Math.max(150, calculatedMaxHeight),
        openUpward: shouldOpenUpward,
      };

      if (align === "right") {
        newPosition.right = viewportWidth - rect.right;
      } else {
        newPosition.left = Math.max(0, Math.min(rect.left, viewportWidth - rect.width));
      }

      if (shouldOpenUpward) {
        newPosition.bottom = viewportHeight - rect.top + offset;
      } else {
        newPosition.top = rect.bottom + offset;
      }

      setPosition(newPosition);
    };

    // Initial calculation
    calculatePosition();

    // Recalculate on scroll and resize
    const handleUpdate = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen, anchorRef, offset, maxHeight, minSpaceRequired, align]);

  return position;
}

/**
 * Convert DropdownPosition to CSS style object
 */
export function dropdownPositionToStyle(position: DropdownPosition | null): React.CSSProperties {
  if (!position) return {};

  return {
    position: "fixed" as const,
    top: position.top,
    bottom: position.bottom,
    left: position.left,
    right: position.right,
    width: position.width,
    maxHeight: position.maxHeight,
    zIndex: 9999,
  };
}
