/**
 * InViewStateChip — single chip + popover for `Container.inViewState`
 * (`{ key, value }`, see docs/sdk/in-view-state.md). Same shape as
 * VisibilityKeyChip, with the two fields the prop needs.
 */
import { useState } from "react";
import { TbEye } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { Chip } from "../../../primitives/Chip";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";
import type { InViewStateConfig } from "../../../../utils/state/inViewTracker";

const PANEL_WIDTH = 380;

function InViewStatePanel({
  value,
  onChange,
  initialPosition,
  onClose,
}: {
  value: InViewStateConfig;
  onChange: (next: InViewStateConfig) => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="On screen"
      storageKey="in-view-state-editor"
      minWidth={380}
      maxWidth={520}
      minHeight={220}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-2">
        <p className="text-neutral-content text-[11px] leading-snug">
          While this section is the one most on screen, the state key holds this value. Give every
          section in the set the same key. You also get{" "}
          <code className="font-mono">key:number</code> and{" "}
          <code className="font-mono">key:count</code> for a &quot;3 / 8&quot; counter.
        </p>
        <Chip>
          <input
            type="text"
            className="input-plain w-full font-mono"
            value={value.key}
            placeholder="State key, e.g. deck:step"
            onChange={e => onChange({ ...value, key: e.target.value })}
            aria-label="State key"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </Chip>
        <Chip>
          <input
            type="text"
            className="input-plain w-full font-mono"
            value={value.value}
            placeholder="Value for this section, e.g. pricing"
            onChange={e => onChange({ ...value, value: e.target.value })}
            aria-label="Value for this section"
            autoComplete="off"
            spellCheck={false}
          />
        </Chip>
      </div>
    </FloatingPanel>
  );
}

export function InViewStateChip({
  value,
  onChange,
  onClear,
}: {
  value: InViewStateConfig;
  onChange: (next: InViewStateConfig) => void;
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
        label="On screen"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          onClear();
        }}
        triggerAriaLabel="Edit on-screen state"
        clearAriaLabel="Remove on-screen state"
        leading={<TbEye className="size-3.5" aria-hidden />}
        summary={value.key ? `${value.key} = ${value.value || "…"}` : "(set a key)"}
      />
      {open && (
        <InViewStatePanel
          value={value}
          onChange={onChange}
          initialPosition={initialPos}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
