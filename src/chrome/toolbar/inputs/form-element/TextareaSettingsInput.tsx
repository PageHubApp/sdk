import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { TbTextResize } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";

const TextareaSettingsPanel = lazy(() => import("./TextareaSettingsPanel"));

const PANEL_WIDTH = 260;
const PROPERTY_KEYS = ["rows", "cols"] as const;

function describe(rows: number | undefined, cols: number | undefined): string {
  const parts: string[] = [];
  if (rows) parts.push(`${rows} rows`);
  if (cols) parts.push(`${cols} cols`);
  return parts.length === 0 ? "Default size" : parts.join(" · ");
}

export function TextareaSettingsInput() {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const {
    actions: { setProp },
    rows,
    cols,
  } = useNode(node => ({
    rows: node.data?.props?.rows as number | undefined,
    cols: node.data?.props?.cols as number | undefined,
  }));

  const summary = describe(rows, cols);

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  const clearAll = () => {
    setProp((p: any) => {
      PROPERTY_KEYS.forEach(k => {
        delete p[k];
      });
    });
  };

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label="Textarea"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          clearAll();
        }}
        triggerAriaLabel="Edit textarea sizing"
        clearAriaLabel="Clear textarea sizing"
        leading={<TbTextResize className="size-3.5" aria-hidden />}
        summary={summary}
      />
      {open && (
        <Suspense fallback={null}>
          <TextareaSettingsPanel initialPosition={initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
