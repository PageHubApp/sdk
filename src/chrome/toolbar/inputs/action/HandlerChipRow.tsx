/**
 * HandlerChipRow — single editable chip for one entry in `props.handlers`.
 *
 * Renders a `Chip` with the event icon + a one-line code summary
 * (e.g. "event.stopPropagation()", or "Add JS…" when blank). Click →
 * lazy-loads `HandlerEditorPanel` and floats it next to the chip. Clear →
 * calls `onRemove` to drop the handler from the parent map.
 *
 * Shape mirrors `ActionChipRow.tsx`. Auto-open on first render is driven by
 * the `autoOpen` prop fed by `ActionsInput`'s pendingHandlerOpen state — see
 * docs/sdk/editor-popover-pattern.md §8.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Chip } from "../../../primitives/Chip";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";
import { HANDLER_EVENT_LABEL, getHandlerIcon } from "./handlerEvents";

const HandlerEditorPanel = lazy(() => import("./HandlerEditorPanel"));

// Hint width for chip-anchored initial position only — the panel itself is
// auto-sized inside `HandlerEditorPanel`.
const PANEL_WIDTH = 360;

/** First non-empty line of the JS, truncated. Empty → `Add JS…`. */
function describeHandler(code: string): string {
  const firstLine = (code || "")
    .split("\n")
    .map(l => l.trim())
    .find(l => l.length > 0);
  if (!firstLine) return "Add JS…";
  return firstLine.length > 32 ? firstLine.slice(0, 32) + "…" : firstLine;
}

interface Props {
  event: string;
  code: string;
  /** All currently-taken event names on this node (passed through to the
   *  editor panel so the event dropdown can filter duplicates). */
  takenEvents: string[];
  onChange: (next: { event: string; code: string }) => void;
  onRemove: () => void;
  /** When true on first render, auto-open the editor (used by the header `+`
   *  picker so the just-added chip surfaces its form immediately). */
  autoOpen?: boolean;
  /** Notify parent so it can clear its pending-open state. */
  onAutoOpenConsumed?: () => void;
}

export function HandlerChipRow({
  event,
  code,
  takenEvents,
  onChange,
  onRemove,
  autoOpen,
  onAutoOpenConsumed,
}: Props) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const Icon = getHandlerIcon(event);
  const typeLabel = HANDLER_EVENT_LABEL[event] ?? event;
  const summary = describeHandler(code);

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  const autoOpenFiredRef = useRef(false);
  useEffect(() => {
    if (!autoOpen || autoOpenFiredRef.current) return;
    autoOpenFiredRef.current = true;
    requestAnimationFrame(() => {
      setInitialPos(computePosition());
      setOpen(true);
      onAutoOpenConsumed?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const handleClear = () => {
    if (open) setOpen(false);
    onRemove();
  };

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label={typeLabel}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={handleClear}
        triggerAriaLabel="Edit handler"
        clearAriaLabel="Remove handler"
        leading={<Icon className="size-3.5" aria-hidden />}
        summary={summary}
      />
      {open && (
        <Suspense fallback={null}>
          <HandlerEditorPanel
            event={event}
            code={code}
            takenEvents={takenEvents}
            onChange={onChange}
            onRemove={onRemove}
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
