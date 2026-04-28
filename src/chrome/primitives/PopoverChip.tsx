/**
 * PopoverChip — shared shell for every popover-mode trigger in the editor.
 *
 * Action / Animations / Conditions / Data Attributes / Bundle / Gradient all
 * used to hand-roll the same `input-wrapper h-8 ... + X` chip JSX. This
 * primitive owns the canonical layout so the popover triggers only have to
 * plug in their leading slot (icon or swatch), summary text, and click
 * handlers. Empty states stay per-trigger (some prefer a small `+` icon, some
 * the BundleRow-style "Add..." chip).
 *
 * Variants:
 * - default — leading icon + summary text inline (Action / Animations /
 *   Conditions / Data Attributes / Bundle).
 * - preview — `leading` takes the full chip body (Gradient swatch). Summary
 *   is rendered as an optional pill overlay via `previewOverlay`.
 */
import { useAtomState } from "@zedux/react";
import { forwardRef, useCallback } from "react";
import {
  SessionAddedAtom,
  sessionKey,
} from "../toolbar/unified-settings/sessionAddedAtom";
import { useProperty } from "../toolbar/unified-settings/propertyContext";
import { InlineClearButton } from "./InlineClearButton";
import { ToolbarRowFrame } from "./ToolbarRowFrame";

interface PopoverChipProps {
  /** When true, chip border highlights to signal the popover is open. */
  open?: boolean;
  /** Click anywhere on the chip body — toggles/opens the popover. */
  onTriggerClick: () => void;
  /** Click on the trailing X — clears the underlying value. */
  onClear: () => void;
  triggerAriaLabel: string;
  clearAriaLabel: string;
  /** Leading icon, swatch, color preview, etc. */
  leading?: React.ReactNode;
  /** Summary text or node — the readable label inside the chip. */
  summary?: React.ReactNode;
  variant?: "default" | "preview";
  /** Optional pill overlay rendered on top of `leading` in preview mode. */
  previewOverlay?: React.ReactNode;
  /** Optional extra trailing affordances rendered INSIDE the chip frame,
   *  before the X. Keep them small (`size-5` icon-button shape) — the frame
   *  reserves a single trailing column. Used by show-hide action chips for
   *  the eye-toggle peek button. */
  trailingExtras?: React.ReactNode;
}

export const PopoverChip = forwardRef<HTMLButtonElement, PopoverChipProps>(function PopoverChip(
  {
    open = false,
    onTriggerClick,
    onClear,
    triggerAriaLabel,
    clearAriaLabel,
    leading,
    summary,
    variant = "default",
    previewOverlay,
    trailingExtras,
  },
  ref
) {
  const property = useProperty();
  const [, setSessionAdded] = useAtomState(SessionAddedAtom);
  const handleClear = useCallback(() => {
    onClear();
    if (property) {
      setSessionAdded(prev => {
        const next = new Set(prev);
        next.add(sessionKey(property.nodeId, property.propId));
        return next;
      });
    }
  }, [onClear, property, setSessionAdded]);
  return (
    <ToolbarRowFrame
      open={open}
      trailing={
        <>
          {trailingExtras}
          <InlineClearButton onClick={handleClear} tooltip={clearAriaLabel} />
        </>
      }
    >
      {variant === "preview" ? (
        <button
          ref={ref}
          type="button"
          onClick={onTriggerClick}
          aria-expanded={open}
          aria-label={triggerAriaLabel}
          className="border-base-300 relative flex h-6 min-w-0 flex-1 items-center justify-center overflow-hidden rounded border"
        >
          {leading}
          {previewOverlay}
        </button>
      ) : (
        <button
          ref={ref}
          type="button"
          onClick={onTriggerClick}
          aria-expanded={open}
          aria-label={triggerAriaLabel}
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-1 text-left"
        >
          {leading ? (
            <span className="text-neutral-content shrink-0" aria-hidden>
              {leading}
            </span>
          ) : null}
          <span className="text-base-content min-w-0 flex-1 truncate">{summary}</span>
        </button>
      )}
    </ToolbarRowFrame>
  );
});
