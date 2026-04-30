import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { TbAdjustments } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";

const PropertiesPanel = lazy(() => import("./PropertiesPanel"));

const PANEL_WIDTH = 280;

const PROPERTY_KEYS = ["required", "disabled", "readOnly", "autoComplete", "defaultValue"] as const;

function describe(props: {
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  defaultValue?: string;
}): string {
  const flags: string[] = [];
  if (props.required) flags.push("Required");
  if (props.disabled) flags.push("Disabled");
  if (props.readOnly) flags.push("Read-only");
  if (props.autoComplete) flags.push(`autoComplete: ${props.autoComplete}`);
  if (props.defaultValue) flags.push(`default: ${props.defaultValue}`);
  return flags.length === 0 ? "None" : flags.join(", ");
}

export function PropertiesInput() {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const {
    actions: { setProp },
    required,
    disabled,
    readOnly,
    autoComplete,
    defaultValue,
  } = useNode(node => ({
    required: !!node.data?.props?.required,
    disabled: !!node.data?.props?.disabled,
    readOnly: !!node.data?.props?.readOnly,
    autoComplete: (node.data?.props?.autoComplete as string) || "",
    defaultValue: (node.data?.props?.defaultValue as string) || "",
  }));

  const summary = describe({ required, disabled, readOnly, autoComplete, defaultValue });

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
        label="Properties"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          clearAll();
        }}
        triggerAriaLabel="Edit input properties"
        clearAriaLabel="Clear input properties"
        leading={<TbAdjustments className="size-3.5" aria-hidden />}
        summary={summary}
      />
      {open && (
        <Suspense fallback={null}>
          <PropertiesPanel initialPosition={initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
