/**
 * A panel frame is the box an editor side panel sits in. It owns the layout
 * variables the panel's parts measure and read:
 *
 * - `--editor-nav-height`: height of the header row above the panel body
 *   (0px when there is none). The Add / Theme drawer's top edge.
 * - `--sidebar-layers-height`: height of the docked Layers panel at the
 *   bottom. The drawer's bottom edge.
 * - `--sidebar-inspector-pin-height`: height of the pinned-sections dock.
 *
 * Writers set them on the nearest `[data-ph-panel]` ancestor, so several
 * panels can live side by side, anywhere in the page. The default layout's
 * `#toolbar` sidebar is a frame; a host placing pieces itself wraps each panel
 * piece in `<EditorPanelFrame>`.
 */
import React from "react";
import { twMerge } from "tailwind-merge";

export const PANEL_FRAME_ATTR = "data-ph-panel";

/** Spread onto an element to make it a panel frame. */
export const panelFrameProps = { [PANEL_FRAME_ATTR]: "" } as const;

export const PANEL_VARS = {
  navHeight: "--editor-nav-height",
  layersHeight: "--sidebar-layers-height",
  inspectorPinHeight: "--sidebar-inspector-pin-height",
} as const;

export type PanelVar = (typeof PANEL_VARS)[keyof typeof PANEL_VARS];

/** The frame `el` sits in, or null outside any frame. */
export function closestPanelFrame(el: Element | null | undefined): HTMLElement | null {
  return (el?.closest(`[${PANEL_FRAME_ATTR}]`) as HTMLElement | null) ?? null;
}

/**
 * Keep `name` on `el`'s frame equal to `el`'s rendered height. Returns the
 * cleanup, which also removes the variable. No-op outside a frame.
 */
export function syncHeightToFrameVar(el: HTMLElement | null, name: PanelVar): () => void {
  const frame = closestPanelFrame(el);
  if (!el || !frame) return () => {};
  const sync = () => {
    frame.style.setProperty(name, `${Math.ceil(el.getBoundingClientRect().height)}px`);
  };
  sync();
  const ro = new ResizeObserver(sync);
  ro.observe(el);
  return () => {
    ro.disconnect();
    frame.style.removeProperty(name);
  };
}

/** Max height a resizable dock inside `el`'s frame may take: a share of the frame. */
export function frameShareHeight(el: Element | null, ratio: number, fallback = 600): number {
  const frame = closestPanelFrame(el);
  return frame ? Math.floor(frame.getBoundingClientRect().height * ratio) : fallback;
}

export interface EditorPanelFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * The box a panel piece (`EditorInspector`, `EditorLayers`, `EditorAddPanel`,
 * `EditorThemePanel`) renders in. A positioned flex column that clips, so the
 * Add / Theme drawer and the docks position inside it.
 */
export const EditorPanelFrame = React.forwardRef<HTMLDivElement, EditorPanelFrameProps>(
  function EditorPanelFrame({ className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        {...panelFrameProps}
        className={twMerge("relative flex min-h-0 min-w-0 flex-col overflow-hidden", className)}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
