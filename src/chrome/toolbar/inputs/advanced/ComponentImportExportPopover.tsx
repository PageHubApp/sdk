/**
 * ComponentImportExportPopover — popover-mode trigger for the Import / Export
 * section. Sits in the section header (single-property popover-only section
 * per `popoverModeRegistry`) so a click on the header title opens the panel.
 *
 * No node value to read (import/export is always-actionable), so the trigger
 * always renders a small "JSON" chip — no Chip + clear UI.
 */
import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { usePopoverAutoOpen } from "../../inspector/hooks/usePopoverAutoOpen";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";
import type { PropertyInputProps } from "../../inspector/registry/propertyDefs";

const ComponentImportExportPanel = lazy(() => import("./ComponentImportExportPanel"));

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 460;

export default function ComponentImportExportPopover({ def }: PropertyInputProps) {
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
          <ComponentImportExportPanel
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
            defaultWidth={PANEL_WIDTH}
            defaultHeight={PANEL_HEIGHT}
          />
        </Suspense>
      )}
    </>
  );
}
