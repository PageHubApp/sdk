/**
 * usePopoverPosition — trigger-anchored position math for FloatingPanel triggers.
 *
 * Replaces ~17 copies of:
 *   const triggerRef = useRef(...);
 *   const sidebarLeft = useAtomValue(SideBarAtom);
 *   const [initialPos, setInitialPos] = useState(...);
 *   const computePosition = () => { ...rect math... };
 *
 * Honors sidebar side (left → flip panel to the right of trigger, else left).
 * Floor-clamped at 8px from the viewport edge.
 */
import { useAtomValue } from "@zedux/react";
import { useCallback, useRef, useState } from "react";
import { SideBarAtom } from "../../../../utils/lib";

export interface PopoverPosition {
  x: number;
  y: number;
}

export function usePopoverPosition<T extends HTMLElement = HTMLButtonElement>(panelWidth: number) {
  const triggerRef = useRef<T>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const [initialPos, setInitialPos] = useState<PopoverPosition | undefined>();

  const computePosition = useCallback((): PopoverPosition | undefined => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - panelWidth - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  }, [sidebarLeft, panelWidth]);

  return { triggerRef, initialPos, setInitialPos, computePosition, sidebarLeft };
}
