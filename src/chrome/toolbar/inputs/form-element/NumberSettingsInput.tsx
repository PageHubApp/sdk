import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { TbMathFunction } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";

const NumberSettingsPanel = lazy(() => import("./NumberSettingsPanel"));

const PANEL_WIDTH = 260;
const PROPERTY_KEYS = ["min", "max", "step"] as const;

function describe(min: string, max: string, step: string): string {
  const parts: string[] = [];
  if (min) parts.push(`min ${min}`);
  if (max) parts.push(`max ${max}`);
  if (step) parts.push(`step ${step}`);
  return parts.length === 0 ? "No bounds" : parts.join(" · ");
}

export function NumberSettingsInput() {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const {
    actions: { setProp },
    min,
    max,
    step,
  } = useNode(node => ({
    min: (node.data?.props?.min as string) || "",
    max: (node.data?.props?.max as string) || "",
    step: (node.data?.props?.step as string) || "",
  }));

  const summary = describe(min, max, step);

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
        label="Bounds"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          clearAll();
        }}
        triggerAriaLabel="Edit numeric bounds"
        clearAriaLabel="Clear numeric bounds"
        leading={<TbMathFunction className="size-3.5" aria-hidden />}
        summary={summary}
      />
      {open && (
        <Suspense fallback={null}>
          <NumberSettingsPanel initialPosition={initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
