/**
 * ContainerOverflowSectionPopover — popover-mode trigger for the Container
 * overflow editor. When sitting inside a multi-property section (Layout) it
 * renders a small `+` icon that opens a draggable FloatingPanel hosting the
 * existing ContainerOverflowSection body unchanged.
 */
import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { usePopoverAutoOpen } from "../../unified-settings/hooks/usePopoverAutoOpen";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const ContainerOverflowSectionPanel = lazy(() => import("./ContainerOverflowSectionPanel"));

// Hint width for chip-anchored initial position only — panel is auto-sized.
const PANEL_WIDTH = 360;

export default function ContainerOverflowSectionPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const { id } = useNode(node => ({ id: node.id }));

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  usePopoverAutoOpen({ nodeId: id, defId: def?.id, onOpen: openPanel });

  return (
    <>
      {/* Popover-only section: title click opens via the open-request atom.
          Invisible 0-size anchor preserves panel position at section's right edge. */}
      <span ref={triggerRef as any} aria-hidden className="block size-0" />
      {open && (
        <Suspense fallback={null}>
          <ContainerOverflowSectionPanel
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
