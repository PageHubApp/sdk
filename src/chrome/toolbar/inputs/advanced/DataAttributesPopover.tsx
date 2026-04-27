/**
 * DataAttributesPopover — chip + lazy FloatingPanel for `data-*` attributes.
 *
 * Nested inside PropertiesInput (not registered as a custom input itself), so
 * no `def` / SessionAddedAtom auto-open plumbing — just a click trigger.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useRef, useState } from "react";
import { TbCode } from "react-icons/tb";
import { PopoverChip } from "../../../primitives/PopoverChip";
import { SideBarAtom } from "../../../../utils/lib";

const DataAttributesPanel = lazy(() => import("./DataAttributesPanel"));

// Hint width for chip-anchored initial position only — the panel is auto-sized.
const PANEL_WIDTH = 360;

export function DataAttributesPopover() {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

  const {
    actions: { setProp },
    count,
  } = useNode(node => ({
    count: ((node.data?.props?.dataAttributes || []) as unknown[]).length,
  }));

  const isEmpty = count === 0;
  const summary = `${count} attribute${count === 1 ? "" : "s"}`;

  const clearAttributes = () => {
    setProp((p: any) => {
      p.dataAttributes = [];
    });
  };

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
      {/*
        Empty state shows a small "Add" trigger (since this popover isn't
        wired to AccordionAddMenu, it needs its own way to open). With data,
        the chip shows the count + clear-X.
      */}
      {isEmpty ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-expanded={open}
          aria-label="Add data attribute"
          className="text-neutral-content hover:text-base-content hover:bg-base-200 inline-flex h-7 items-center gap-1.5 self-start rounded-md px-2 text-xs transition-colors"
        >
          <TbCode className="size-3.5 shrink-0" aria-hidden />
          <span>Add data-…</span>
        </button>
      ) : (
        <PopoverChip
          ref={triggerRef}
          open={open}
          onTriggerClick={() => (open ? setOpen(false) : openPanel())}
          onClear={() => {
            if (open) setOpen(false);
            clearAttributes();
          }}
          triggerAriaLabel="Edit data attributes"
          clearAriaLabel="Clear data attributes"
          leading={<TbCode className="size-3.5" aria-hidden />}
          summary={summary}
        />
      )}
      {open && (
        <Suspense fallback={null}>
          <DataAttributesPanel
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
