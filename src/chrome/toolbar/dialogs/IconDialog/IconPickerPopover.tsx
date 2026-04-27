/**
 * IconPickerPopover — thin trigger shell. Lazy-loads the heavy panel module
 * on first open so HMR edits to the panel/tabs/icon grid don't ripple through
 * the toolbar import graph and re-render everything mounted.
 */
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, type ReactNode, useRef, useState } from "react";
import { SideBarAtom } from "../../../../utils/lib";

const IconPickerPanel = lazy(() => import("./IconPickerPanel"));

const PANEL_WIDTH = 384;
const PANEL_HEIGHT = 480;

interface Props {
  value: string;
  prefix?: string;
  onChange: (value: string) => void;
  /** Trigger button content (icon preview etc). */
  triggerContent: ReactNode;
  /** Trigger button className — keeps the input chrome consistent. */
  triggerClassName?: string;
  /** aria-label for the trigger button. */
  triggerAriaLabel?: string;
}

export function IconPickerPopover({
  value,
  prefix,
  onChange,
  triggerContent,
  triggerClassName,
  triggerAriaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Sidebar docked left → panel opens on the RIGHT side of trigger; right → LEFT.
  const sidebarLeft = useAtomValue(SideBarAtom);

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PANEL_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-label={triggerAriaLabel}
        className={triggerClassName}
      >
        {triggerContent}
      </button>
      {open && (
        <Suspense fallback={null}>
          <IconPickerPanel
            value={value}
            prefix={prefix}
            onChange={onChange}
            onClose={() => setOpen(false)}
            initialPosition={initialPos}
            defaultWidth={PANEL_WIDTH}
            defaultHeight={PANEL_HEIGHT}
          />
        </Suspense>
      )}
    </>
  );
}
