/**
 * AnimationsInputPopover — thin trigger chip that opens a draggable
 * FloatingPanel containing the full AnimationsInput body. Same pattern as
 * IconPickerPopover / BundleRow.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TbBolt, TbPlus } from "react-icons/tb";
import { cssAnimationPresets } from "../../../../utils/animations";
import { ANIMATION_PARAM_KEYS } from "./AnimationsInput";
import { SideBarAtom } from "../../../../utils/lib";
import { PopoverChip } from "../../../primitives/PopoverChip";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

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
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);

  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

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

  // Legacy auto-open from sessionAdded.
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

  // Open whenever a popover-open-request is dispatched for this row.
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
        <PopoverChip
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
