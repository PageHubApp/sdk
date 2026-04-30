import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { TbShieldCheck } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";

const ValidationPanel = lazy(() => import("./ValidationPanel"));

const PANEL_WIDTH = 320;
const PROPERTY_KEYS = ["pattern", "errorMessage", "label"] as const;

function describe(pattern: string, errorMessage: string, label: string): string {
  if (pattern) return `Regex: ${pattern.length > 18 ? pattern.slice(0, 18) + "…" : pattern}`;
  if (label) return label;
  if (errorMessage) return errorMessage;
  return "No validation";
}

export function ValidationInput() {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const {
    actions: { setProp },
    pattern,
    errorMessage,
    label,
  } = useNode(node => ({
    pattern: (node.data?.props?.pattern as string) || "",
    errorMessage: (node.data?.props?.errorMessage as string) || "",
    label: (node.data?.props?.label as string) || "",
  }));

  const summary = describe(pattern, errorMessage, label);

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
        label="Validation"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          clearAll();
        }}
        triggerAriaLabel="Edit validation"
        clearAriaLabel="Clear validation"
        leading={<TbShieldCheck className="size-3.5" aria-hidden />}
        summary={summary}
      />
      {open && (
        <Suspense fallback={null}>
          <ValidationPanel initialPosition={initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
