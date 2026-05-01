import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import { TbChevronDown, TbDeviceDesktop, TbDeviceMobile } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import type { ViewMode as CanvasViewMode } from "../../../core/store";
import {
  getCanvasBreakpointPx,
  isEditorCanvasBreakpointView,
} from "../../../utils/tailwind/className";
import { ToolbarPortalDropdown } from "../../inline-tools/ToolbarPortalDropdown";
import { CanvasZoom } from "../CanvasZoom";
import { DEVICE_FRAME_BY_VIEW, getDeviceFrameSpec } from "../deviceFrames";
import {
  BreakpointZoomAtom,
  DeviceAtom,
  DeviceDimensionsAtom,
  DeviceZoomAtom,
  ResponsiveAtom,
  ViewAtom,
} from "../atoms";
import { SideBySideRow } from "./SideBySideRow";

const BREAKPOINT_DESCRIPTIONS: Record<string, string> = {
  mobile: "Mobile — single-column, stacked layouts. The mobile-first base.",
  sm: "Tablet portrait — 2-col grids, stacked headers, side-by-side buttons start here.",
  md: "Tablet landscape — flex-row layouts and 3-col grids kick in.",
  lg: "Desktop — 4-col grids, split heroes, asymmetric layouts. Most design density lives here.",
  xl: "Wide desktop — extra breathing room; rarely needs new layout rules.",
  "2xl": "Ultra-wide — for cinema-width monitors. Usually nothing changes past this.",
};

const DEVICE_ROWS = [
  {
    mode: "fluid" as const,
    label: "Responsive",
    sub: "Fluid canvas",
    description:
      "ON: canvas clamps to the editor area. OFF: canvas renders at the exact breakpoint width and overflows when the editor is narrower.",
  },
  {
    mode: "device" as const,
    label: "Device",
    sub: "Phone · tablet · monitor",
    description:
      "Pin to a real device frame at the selected breakpoint (phone, tablet, laptop, monitor).",
  },
];

function scrollSelectedNodeIntoView() {
  setTimeout(() => {
    const selected = document.querySelector('[data-selected="true"]');
    if (selected) selected.scrollIntoView();
  }, 200);
}

export function BreakpointSwitcher() {
  const { themeBreakpoints } = useEditor(state => {
    const root = state.nodes[ROOT_NODE];
    return {
      themeBreakpoints: root?.data?.props?.theme?.breakpoints as
        | Record<string, number>
        | undefined,
    };
  });

  const [view, setView] = useAtomState(ViewAtom);
  const [device, setDevice] = useAtomState(DeviceAtom);
  const [responsive, setResponsive] = useAtomState(ResponsiveAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);
  const breakpointZoom = useAtomValue(BreakpointZoomAtom);
  const deviceZoom = useAtomValue(DeviceZoomAtom);
  const activeZoom = device ? deviceZoom : breakpointZoom;
  const isScaled = Math.abs(activeZoom - 1) > 0.001;

  const resolvedBreakpointPx = getCanvasBreakpointPx({ breakpoints: themeBreakpoints });
  const breakpointRows = [
    {
      id: "mobile",
      label: "Mobile",
      sub: `${resolvedBreakpointPx.mobile}px`,
      description: BREAKPOINT_DESCRIPTIONS.mobile,
    },
    {
      id: "sm",
      label: "SM",
      sub: `Tablet · ${resolvedBreakpointPx.sm}px`,
      description: BREAKPOINT_DESCRIPTIONS.sm,
    },
    ...(["md", "lg", "xl", "2xl"] as const).map(bp => ({
      id: bp,
      label: bp === "2xl" ? "2XL" : bp.toUpperCase(),
      sub: `${resolvedBreakpointPx[bp]}px`,
      description: BREAKPOINT_DESCRIPTIONS[bp],
    })),
  ];

  return (
    <ToolbarPortalDropdown
      openOn="hover"
      align="center"
      className="border-base-300 bg-base-100 w-[22rem] rounded-xl border p-2 shadow-xl"
      trigger={
        <button
          type="button"
          aria-label="Canvas width — also the edit scope (next class write targets this layer)"
          aria-haspopup="menu"
          className="tool-button gap-0.5!"
        >
          <span className="inline-flex h-4 min-w-6 items-center justify-center px-0.5">
            {isScaled ? (
              <span className="font-mono text-[11px] leading-none font-bold tracking-tight">
                {Math.round(activeZoom * 100)}%
              </span>
            ) : (
              <>
                {view === "mobile" && <TbDeviceMobile className="size-4" />}
                {(view === "desktop" || view === "tablet") && (
                  <TbDeviceDesktop className="size-4" />
                )}
                {isEditorCanvasBreakpointView(view) && view !== "mobile" && (
                  <span className="font-mono text-[11px] leading-none font-bold tracking-tight">
                    {view === "2xl" ? "2XL" : view.toUpperCase()}
                  </span>
                )}
              </>
            )}
          </span>
          {!isScaled && view !== "desktop" && view !== "mobile" && (
            <span
              className="bg-primary text-primary-content ml-0.5 inline-flex h-4 items-center justify-center rounded-sm px-1 font-mono text-[9px] leading-none font-bold uppercase"
              aria-hidden
            >
              scope
            </span>
          )}
          <TbChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      }
    >
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        {DEVICE_ROWS.map(row => {
          const selected = row.mode === "device" ? device : responsive;
          return (
            <button
              key={row.mode}
              type="button"
              role="menuitemcheckbox"
              aria-checked={selected}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={row.description}
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
              onClick={() => {
                if (row.mode === "device") {
                  setDevice(d => !d);
                  // "desktop" (fluid full-width) has no device frame — default to mobile when turning device on.
                  if (!device && view === "desktop") setView("mobile" as CanvasViewMode);
                } else {
                  setResponsive(r => !r);
                }
                scrollSelectedNodeIntoView();
              }}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-base-300 hover:bg-base-200 text-base-content"
              }`}
            >
              {row.mode === "fluid" ? (
                <TbDeviceDesktop className="size-4 shrink-0" />
              ) : (
                <TbDeviceMobile className="size-4 shrink-0" />
              )}
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="font-medium">{row.label}</span>
                <span className="text-neutral-content text-[10px]">{row.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-neutral-content mt-1 mb-1 px-0.5 text-[10px] font-semibold tracking-wide uppercase">
        Breakpoints
      </div>
      <div className="grid grid-cols-6 gap-1">
        {breakpointRows.map(row => {
          const selected = view === row.id;
          return (
            <button
              key={row.id}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={row.description}
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
              onClick={() => {
                // Click selected chip again → unset back to fluid desktop.
                setView(
                  (view === row.id ? "desktop" : (row.id as CanvasViewMode)) as CanvasViewMode
                );
                scrollSelectedNodeIntoView();
              }}
              className={`flex flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center transition ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-base-300 hover:bg-base-200 text-base-content"
              }`}
            >
              <span className="font-mono text-[11px] leading-none font-bold tracking-tight">
                {row.label}
              </span>
              <span className="text-neutral-content mt-0.5 text-[9px] leading-none">
                {row.sub.replace("px", "")}
              </span>
            </button>
          );
        })}
      </div>

      <SideBySideRow />

      <div className="border-base-300 mt-2 flex items-center justify-between gap-2 border-t pt-2">
        <span className="text-neutral-content px-0.5 text-[10px] font-semibold tracking-wide uppercase">
          Zoom
        </span>
        {device && isEditorCanvasBreakpointView(view) ? (
          (() => {
            const frame = getDeviceFrameSpec(
              view,
              DEVICE_FRAME_BY_VIEW[view] === "phone" ? deviceDimensions : undefined,
              resolvedBreakpointPx
            );
            return (
              <CanvasZoom
                zoomAtom={DeviceZoomAtom}
                fitMode={{
                  kind: "both",
                  targetW: frame.innerWidth + frame.bezelX,
                  targetH: frame.innerHeight + frame.bezelY,
                  chromeOffsetW: 220,
                  chromeOffsetH: 220,
                  max: 1,
                }}
                activeKey="device-menu"
                storageKey="editor-device-zoom"
              />
            );
          })()
        ) : (
          <CanvasZoom
            zoomAtom={BreakpointZoomAtom}
            fitMode={{
              kind: "width",
              target: (resolvedBreakpointPx as Record<string, number>)[view] ?? 1024,
              chromeOffset: 420,
              max: 1,
            }}
            activeKey="breakpoint-menu"
            storageKey="editor-breakpoint-zoom"
          />
        )}
      </div>
    </ToolbarPortalDropdown>
  );
}
