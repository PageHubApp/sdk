/**
 * VisibilityKeyChip — single chip + popover for `Container.visibilityStateKey`.
 *
 * Click chip → opens a small panel with one input (the state-registry key
 * driving this container's show/hide). Empty value means "use the element id".
 */
import { useState } from "react";
import { TbBoltFilled } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { Chip } from "../../../primitives/Chip";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";

const PANEL_WIDTH = 380;

function VisibilityKeyPanel({
  value,
  onChange,
  initialPosition,
  onClose,
}: {
  value: string;
  onChange: (next: string) => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Visibility state key"
      storageKey="visibility-state-key-editor"
      minWidth={380}
      maxWidth={520}
      minHeight={180}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-2">
        <p className="text-neutral-content text-[11px] leading-snug">
          The key in the state registry that controls this container&apos;s visibility. Defaults to
          the container&apos;s DOM id. Anchor tokens like{" "}
          <code className="font-mono">{`{{anchor.X}}`}</code> are supported.
        </p>
        <Chip>
          <input
            type="text"
            className="input-plain w-full font-mono"
            value={value}
            placeholder="e.g. cart:open"
            onChange={e => onChange(e.target.value)}
            aria-label="Visibility state key"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </Chip>
      </div>
    </FloatingPanel>
  );
}

export function VisibilityKeyChip({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label="Visibility"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          onClear();
        }}
        triggerAriaLabel="Edit visibility state key"
        clearAriaLabel="Clear visibility state key"
        leading={<TbBoltFilled className="size-3.5" aria-hidden />}
        summary={value || "(uses element id)"}
      />
      {open && (
        <VisibilityKeyPanel
          value={value}
          onChange={onChange}
          initialPosition={initialPos}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
