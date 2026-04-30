/**
 * PatternInputPopover — thin trigger chip that opens a draggable FloatingPanel
 * containing the full pattern editing surface. Chip mirrors GradientInputPopover:
 * "preview" variant showing the pattern thumbnail when set, "Add..." when empty.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { TbTexture } from "react-icons/tb";
import { generatePattern } from "../../../../utils/background";
import { SideBarAtom } from "../../../../utils/lib";
import { Chip } from "../../../primitives/Chip";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
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
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

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

  // Auto-open when this property was just session-added.
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

  // Open whenever a popover-open-request is dispatched for this property.
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
      <Chip mode="popover"
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
              style={
                previewDataUrl ? { backgroundImage: `url(${previewDataUrl})` } : undefined
              }
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
