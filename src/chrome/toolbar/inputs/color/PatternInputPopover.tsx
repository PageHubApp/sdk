/**
 * PatternInputPopover — thin trigger chip that opens a draggable FloatingPanel
 * containing the full pattern editing surface. Chip mirrors GradientInputPopover:
 * "preview" variant showing the pattern thumbnail when set, "Add..." when empty.
 */
import { useNode } from "@craftjs/core";
import { lazy, Suspense, useMemo, useState } from "react";
import { TbTexture } from "react-icons/tb";
import { generatePattern } from "../../../../utils/background";
import { Chip } from "../../../primitives/Chip";
import { usePopoverAutoOpen } from "../../unified-settings/hooks/usePopoverAutoOpen";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const PatternPanel = lazy(() => import("./PatternPanel"));

const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 460;

const DEMO_COLORS = {
  patternColor1: "rgba(59, 130, 246, 0.8)",
  patternColor2: "rgba(16, 185, 129, 0.8)",
  patternColor3: "rgba(245, 101, 101, 0.8)",
  patternColor4: "rgba(168, 85, 247, 0.8)",
};

function makePreviewDataUrl(pattern: any): string | null {
  if (!pattern) return null;
  try {
    return (
      generatePattern({
        root: {
          pattern,
          patternVerticalPosition: 0,
          patternHorizontalPosition: 0,
          patternStroke: 1,
          patternZoom: 0.4,
          patternAngle: 0,
          patternSpacingX: 0,
          patternSpacingY: 0,
          ...DEMO_COLORS,
        },
      }) || null
    );
  } catch {
    return null;
  }
}

export default function PatternInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const {
    actions: { setProp },
    id,
    pattern,
  } = useNode(node => ({
    id: node.id,
    pattern: node.data?.props?.root?.pattern || null,
  }));

  const hasPattern = !!pattern;

  const previewDataUrl = useMemo(() => makePreviewDataUrl(pattern), [pattern]);

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  usePopoverAutoOpen({ nodeId: id, defId: def?.id, onOpen: openPanel });

  const clearPattern = () => {
    setProp((p: any) => {
      if (!p.root) return;
      p.root.pattern = null;
      // Clear all pattern-specific props so they don't linger.
      delete p.root.patternColor1;
      delete p.root.patternColor2;
      delete p.root.patternColor3;
      delete p.root.patternColor4;
      delete p.root.patternStroke;
      delete p.root.patternZoom;
      delete p.root.patternAngle;
      delete p.root.patternSpacingX;
      delete p.root.patternSpacingY;
      delete p.root.patternVerticalPosition;
      delete p.root.patternHorizontalPosition;
    });
  };

  const label = def?.label ?? "Pattern";

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label={label}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          clearPattern();
        }}
        triggerAriaLabel={hasPattern ? "Edit pattern" : "Add pattern"}
        clearAriaLabel="Clear pattern"
        variant={hasPattern ? "preview" : "default"}
        leading={
          hasPattern ? (
            <span
              className="absolute inset-0 bg-cover bg-center"
              style={previewDataUrl ? { backgroundImage: `url(${previewDataUrl})` } : undefined}
              aria-hidden
            />
          ) : (
            <TbTexture className="size-3.5" aria-hidden />
          )
        }
        summary={hasPattern ? null : "Add..."}
        previewOverlay={
          hasPattern && pattern?.title ? (
            <span
              className="bg-base-100/80 text-base-content relative rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
              aria-hidden
            >
              {pattern.title}
            </span>
          ) : null
        }
      />
      {open && (
        <Suspense fallback={null}>
          <PatternPanel
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
