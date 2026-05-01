/**
 * AnimationsInputPopover — thin trigger chip that opens a draggable
 * FloatingPanel containing the full AnimationsInput body. Same pattern as
 * IconPickerPopover / BundleRow.
 */
import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { TbBolt, TbPlus } from "react-icons/tb";
import { cssAnimationPresets } from "../../../../utils/animations";
import { ANIMATION_PARAM_KEYS } from "./AnimationsInput";
import { Chip } from "../../../primitives/Chip";
import { usePopoverAutoOpen } from "../../inspector/hooks/usePopoverAutoOpen";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";
import type { PropertyInputProps } from "../../inspector/registry/propertyDefs";

const AnimationsPanel = lazy(() => import("./AnimationsPanel"));

// Hint width for chip-anchored initial position only — panel is auto-sized.
const PANEL_WIDTH = 360;

function describeAnimation(animation: string, engine: string): string {
  if (!animation) return "Add Animation…";
  const preset = (cssAnimationPresets as Record<string, { label?: string }>)[animation];
  if (preset?.label) return preset.label;
  return engine === "framer" ? `Framer: ${animation}` : animation;
}

export default function AnimationsInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const {
    actions: { setProp },
    id,
    animation,
    engine,
  } = useNode(node => ({
    id: node.id,
    animation: (node.data?.props?.root?.animation as string) || "",
    engine: (node.data?.props?.root?.animationEngine as string) || "css",
  }));

  const summary = describeAnimation(animation, engine);
  const isEmpty = !animation;

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  usePopoverAutoOpen({ nodeId: id, defId: def?.id, onOpen: openPanel });

  const clearAnimation = () => {
    setProp((p: any) => {
      if (!p.root) return;
      p.root.animation = "";
      ANIMATION_PARAM_KEYS.forEach(k => {
        delete p.root[k];
      });
    });
  };

  return (
    <>
      {isEmpty ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-expanded={open}
          aria-label="Add animation"
          className="text-neutral-content hover:text-base-content hover:bg-base-200 flex size-4 shrink-0 items-center justify-center rounded-md opacity-70 transition-[color,background-color,opacity] hover:opacity-100"
        >
          <TbPlus className="size-3.5" aria-hidden />
        </button>
      ) : (
        <Chip
          mode="popover"
          ref={triggerRef}
          open={open}
          onTriggerClick={() => (open ? setOpen(false) : openPanel())}
          onClear={() => {
            if (open) setOpen(false);
            clearAnimation();
          }}
          triggerAriaLabel="Edit animation"
          clearAriaLabel="Clear animation"
          leading={<TbBolt className="size-3.5" aria-hidden />}
          summary={summary}
        />
      )}
      {open && (
        <Suspense fallback={null}>
          <AnimationsPanel initialPosition={initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
