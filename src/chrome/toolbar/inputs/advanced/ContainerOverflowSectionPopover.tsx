/**
 * ContainerOverflowSectionPopover — popover-mode trigger for the Container
 * overflow editor. When sitting inside a multi-property section (Layout) it
 * renders a small `+` icon that opens a draggable FloatingPanel hosting the
 * existing ContainerOverflowSection body unchanged.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { SideBarAtom } from "../../../../utils/lib";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const ContainerOverflowSectionPanel = lazy(() => import("./ContainerOverflowSectionPanel"));

// Hint width for chip-anchored initial position only — panel is auto-sized.
const PANEL_WIDTH = 360;

export default function ContainerOverflowSectionPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

  const { id } = useNode(node => ({ id: node.id }));

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

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (def && sessionAdded.has(sessionKey(id, def.id))) {
      requestAnimationFrame(() => {
        setInitialPos(computePosition());
        setOpen(true);
      });
      autoOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdded, id, def?.id]);

  const lastRequestVersion = useRef(0);
  useEffect(() => {
    if (!def) return;
    const version = popoverRequests.get(popoverRequestKey(id, def.id)) || 0;
    if (version === 0 || version === lastRequestVersion.current) return;
    lastRequestVersion.current = version;
    requestAnimationFrame(() => {
      setInitialPos(computePosition());
      setOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverRequests, id, def?.id]);

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
