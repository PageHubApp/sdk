/**
 * GradientInputPopover — thin trigger chip that opens a draggable FloatingPanel
 * containing the full GradientInput body. Chip mirrors `BundleRow`'s shell
 * exactly: row label + `input-wrapper h-8` chip with leading icon/swatch +
 * "Add..." (or direction arrow) + X. Empty/has-value states share the chip
 * frame so spacing stays consistent with every other popover/bundle row.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { TbGradienter } from "react-icons/tb";
import { SideBarAtom } from "../../../../utils/lib";
import { splitClassVariants } from "../../../../utils/tailwind/className";
import { PopoverChip } from "../../../primitives/PopoverChip";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const GradientPanel = lazy(() => import("./GradientPanel"));

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 460;

const DIR_TO_CSS: Record<string, string> = {
  "bg-linear-to-t": "to top",
  "bg-linear-to-tr": "to top right",
  "bg-linear-to-r": "to right",
  "bg-linear-to-br": "to bottom right",
  "bg-linear-to-b": "to bottom",
  "bg-linear-to-bl": "to bottom left",
  "bg-linear-to-l": "to left",
  "bg-linear-to-tl": "to top left",
};

const DIR_ARROW: Record<string, string> = {
  "bg-linear-to-tl": "↖",
  "bg-linear-to-t": "↑",
  "bg-linear-to-tr": "↗",
  "bg-linear-to-r": "→",
  "bg-linear-to-br": "↘",
  "bg-linear-to-b": "↓",
  "bg-linear-to-bl": "↙",
  "bg-linear-to-l": "←",
};

const parseDirection = (cn: string) =>
  cn.match(/\bbg-linear-to-(?:t|tr|r|br|b|bl|l|tl)\b/)?.[0] || "";

const parseStop = (cn: string, prefix: string) =>
  cn.match(new RegExp(`\\b${prefix}-\\[([^\\]]+)\\]`))?.[1] || "";

const parsePosition = (cn: string, prefix: string): number | null => {
  const match = cn.match(new RegExp(`\\b${prefix}-(\\d+)%`));
  return match ? parseInt(match[1]) : null;
};

export default function GradientInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

  const {
    actions: { setProp },
    id,
    className,
  } = useNode(node => ({
    id: node.id,
    className: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
  }));

  const direction = useMemo(() => parseDirection(className), [className]);
  const hasGradient = !!direction;
  const fromColor = useMemo(() => parseStop(className, "from"), [className]);
  const viaColor = useMemo(() => parseStop(className, "via"), [className]);
  const toColor = useMemo(() => parseStop(className, "to"), [className]);
  const fromPos = useMemo(() => parsePosition(className, "from"), [className]);
  const viaPos = useMemo(() => parsePosition(className, "via"), [className]);
  const toPos = useMemo(() => parsePosition(className, "to"), [className]);

  const previewBg = useMemo(() => {
    if (!hasGradient) return null;
    const dir = DIR_TO_CSS[direction] || "to bottom";
    const from = fromColor || "transparent";
    const to = toColor || "transparent";
    const via = viaColor;
    const fromStop = `${from}${fromPos != null ? ` ${fromPos}%` : ""}`;
    const toStop = `${to}${toPos != null ? ` ${toPos}%` : ""}`;
    const viaStop = via ? `${via}${viaPos != null ? ` ${viaPos}%` : ""}` : null;
    const stops = viaStop ? `${fromStop}, ${viaStop}, ${toStop}` : `${fromStop}, ${toStop}`;
    return `linear-gradient(${dir}, ${stops})`;
  }, [hasGradient, direction, fromColor, viaColor, toColor, fromPos, viaPos, toPos]);

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

  const clearGradient = () => {
    setProp((p: any) => {
      const cn = typeof p.className === "string" ? p.className : "";
      p.className = cn
        .trim()
        .split(/\s+/)
        .filter(cls => {
          if (!cls) return false;
          const { base } = splitClassVariants(cls);
          if (/^bg-linear-to-(?:t|tr|r|br|b|bl|l|tl)$/.test(base)) return false;
          if (/^(?:from|via|to)-\[[^\]]+\]$/.test(base)) return false;
          if (/^(?:from|via|to)-\d+%$/.test(base)) return false;
          return true;
        })
        .join(" ");
    });
  };

  const label = def?.label ?? "Gradient";

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-base-content w-20 shrink-0 truncate text-xs">{label}</span>
      <PopoverChip
        ref={triggerRef}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          clearGradient();
        }}
        triggerAriaLabel={hasGradient ? "Edit gradient" : "Add gradient"}
        clearAriaLabel="Clear gradient"
        variant={hasGradient ? "preview" : "default"}
        leading={
          hasGradient ? (
            <span
              className="absolute inset-0"
              style={{ background: previewBg || undefined }}
              aria-hidden
            />
          ) : (
            <TbGradienter className="size-3.5" aria-hidden />
          )
        }
        summary={hasGradient ? null : "Add..."}
        previewOverlay={
          hasGradient ? (
            <span
              className="bg-base-100/80 text-base-content relative rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
              aria-hidden
            >
              {DIR_ARROW[direction] || ""}
            </span>
          ) : null
        }
      />
      {open && (
        <Suspense fallback={null}>
          <GradientPanel
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
            defaultWidth={PANEL_WIDTH}
            defaultHeight={PANEL_HEIGHT}
          />
        </Suspense>
      )}
    </div>
  );
}
