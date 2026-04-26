import { Element, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import React from "react";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import {
  TbBoxModel2,
  TbHeading,
  TbLayoutAlignLeft,
  TbLayoutAlignTop,
  TbLayoutGridAdd,
  TbTextSize,
  TbX,
} from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { Container } from "../../components/Container";
import {
  CANVAS_SLOT_H,
  CANVAS_SLOT_W,
  CanvasAnnotation,
  COMPONENT_CANVAS_TYPE,
  findComponentCanvasNode,
  getCanvasAnnotations,
  getComponentCanvasPos,
  getComponentCanvasSize,
  getStateNodeDefaultPos,
  listComponentContainers,
} from "../../utils/componentCanvas";
import { findInherentComponentNodes, findStateNodes } from "../../utils/componentStateNodes";
import {
  applyCanvasVisibility,
  CanvasIsolateAtom,
} from "../../utils/componentIsolation";
import { useCanvasPan } from "../hooks/useCanvasPan";
import { useCreateComponent } from "../hooks/useCreateComponent";
import { CanvasZoom } from "./CanvasZoom";
import { CanvasAnnotationLayer } from "./CanvasAnnotationLayer";
import { ComponentCanvasItem } from "./ComponentCanvasItem";
import {
  ComponentCanvasPanAtom,
  ComponentCanvasZoomAtom,
} from "./atoms";

interface Props {
  className?: string;
}

const STYLE_TAG_ID = "ph-component-canvas-style";

/** Inject a style sheet that activates when body has [data-ph-canvas-mode="true"]. */
function ensureCanvasStyleTag() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLE_TAG_ID;
  tag.textContent = `
    body[data-ph-canvas-mode="true"] #viewport {
      overflow: visible !important;
      background: transparent;
      position: relative;
    }
    body[data-ph-canvas-mode="true"] #viewport [data-component-canvas="true"] {
      display: none;
    }
    /* The card chrome on the slot is the visible "component frame" in canvas
       mode. Don't double up with the CraftJS selection chrome on the
       component-root container — the slot frame is enough. The global ring
       (inset box-shadow from styles/editor.css) is suppressed here. */
    body[data-ph-canvas-mode="true"] #viewport [data-component-container="true"][data-selected="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-component-container="true"][data-hover="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-component-container="true"][data-parent-of-selected="true"] {
      outline: none !important;
      box-shadow: none !important;
    }
    /* Hide CraftJS node-name chips in canvas mode — the per-card drag
       handle label replaces them, two labels for the same node is noise. */
    body[data-ph-canvas-mode="true"] .ph-node-name-chip {
      display: none !important;
    }
    /* Suppress CraftJS selection chrome on state-pinned nodes for parity
       with master cards — slot frame is visible chrome enough. */
    body[data-ph-canvas-mode="true"] #viewport [data-canvas-state-pin="true"][data-selected="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-canvas-state-pin="true"][data-hover="true"],
    body[data-ph-canvas-mode="true"] #viewport [data-canvas-state-pin="true"][data-parent-of-selected="true"] {
      outline: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(tag);
}

/** Lazily create the singleton ComponentCanvas container under ROOT. */
function createComponentCanvasNode(query: any, actions: any): string | null {
  try {
    const tree = query
      .parseReactElement(
        <Element
          canvas
          is={Container}
          {...({
            type: COMPONENT_CANVAS_TYPE,
            custom: { displayName: "Component Canvas" },
            annotations: [],
            className: "hidden",
          } as Record<string, unknown>)}
        />
      )
      .toNodeTree();
    actions.addNodeTree(tree, ROOT_NODE);
    return tree.rootNodeId;
  } catch (e) {
    console.error("[ComponentCanvas] failed to create canvas node", e);
    return null;
  }
}

export function ComponentCanvasViewport({ className = "" }: Props) {
  // Subscribe to ROOT children + each component/canvas node's serialized identity
  // so adds/removes/canvasPos/annotations/hidden changes trigger re-renders.
  const { query, actions, sig } = useEditor((state: any) => {
    const root = state.nodes?.[ROOT_NODE];
    if (!root?.data?.nodes) return { sig: "" };
    const parts: string[] = [];
    for (const nid of root.data.nodes) {
      const n = state.nodes[nid];
      const t = n?.data?.props?.type;
      const hidden = n?.data?.hidden ? "h" : "v";
      if (t === "component") {
        const pos = n?.data?.props?.custom?.canvasPos;
        const ipos = n?.data?.props?.custom?.canvasIsolatePos;
        parts.push(
          `c:${nid}:${hidden}:${pos?.x ?? "?"}:${pos?.y ?? "?"}:${ipos?.x ?? "?"}:${ipos?.y ?? "?"}`,
        );
      } else if (t === "componentCanvas") {
        const ann = n?.data?.props?.annotations ?? [];
        parts.push(`cc:${nid}:${hidden}:${ann.length}:${JSON.stringify(ann)}`);
      }
    }
    return { sig: parts.join("|") };
  });
  const [zoom] = useAtomState(ComponentCanvasZoomAtom);
  const [pan, setPan] = useAtomState(ComponentCanvasPanAtom);
  const [canvasIsolateRaw, setCanvasIsolate] = useAtomState(CanvasIsolateAtom);
  const canvasIsolate = canvasIsolateRaw as unknown as string | null;
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const createComponent = useCreateComponent();

  // Look up the isolated component's display name for the pill label.
  // Fall through to `data.displayName` (the React component name like "Modal"
  // or "Dropdown") so inherent components don't all collapse to "Component".
  const isolatedName = React.useMemo(() => {
    if (!canvasIsolate) return null;
    try {
      const n = query.node(canvasIsolate).get();
      return (
        n?.data?.custom?.displayName ||
        n?.data?.props?.custom?.displayName ||
        n?.data?.displayName ||
        "Component"
      );
    } catch {
      return "Component";
    }
  }, [canvasIsolate, query]);

  // Tag body + inject style sheet on mount; clean up on unmount.
  // Lift overflow:hidden on every clipping ancestor of #viewport so absolutely-
  // positioned components paint outside the (collapsed) viewport bounds.
  // Clear the transform on #viewport so position:fixed children escape it.
  React.useEffect(() => {
    ensureCanvasStyleTag();
    document.body.dataset.phCanvasMode = "true";

    const vp = document.getElementById("viewport");
    const overflowEdits: Array<{ el: HTMLElement; prev: string }> = [];
    const transformEdits: Array<{ el: HTMLElement; prev: string }> = [];

    if (vp) {
      let cur: HTMLElement | null = vp;
      while (cur && cur !== document.body) {
        const cs = window.getComputedStyle(cur);
        if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") {
          overflowEdits.push({ el: cur, prev: cur.style.overflow });
          cur.style.setProperty("overflow", "visible", "important");
        }
        if (cs.transform && cs.transform !== "none") {
          transformEdits.push({ el: cur, prev: cur.style.transform });
          cur.style.setProperty("transform", "none", "important");
        }
        cur = cur.parentElement;
      }
    }

    return () => {
      delete document.body.dataset.phCanvasMode;
      document.body.style.removeProperty("--ph-canvas-transform");
      overflowEdits.forEach(({ el, prev }) => {
        if (prev) el.style.overflow = prev;
        else el.style.removeProperty("overflow");
      });
      transformEdits.forEach(({ el, prev }) => {
        if (prev) el.style.transform = prev;
        else el.style.removeProperty("transform");
      });
    };
  }, []);

  // Components are pinned to their slots via position:fixed (computed in
  // ComponentCanvasItem's effect). No transform on #viewport — it would break
  // fixed positioning. Pan/zoom is applied per-item in screen-space math.
  //
  // Write pan/zoom as CSS variables on the surface so item wrappers can
  // recompute their transforms in CSS without re-rendering. Then dispatch a
  // `ph-canvas-tick` event so each item re-runs its position-pinning callback
  // (which can't be done in pure CSS — the live component DOM is `position:
  // fixed` outside the surface and needs its left/top updated imperatively).
  // useLayoutEffect so the var write + tick happen before paint, in the same
  // frame as the React commit.
  React.useLayoutEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    el.style.setProperty("--ph-pan-x", `${pan.x}px`);
    el.style.setProperty("--ph-pan-y", `${pan.y}px`);
    el.style.setProperty("--ph-zoom", `${zoom}`);
    el.dispatchEvent(new Event("ph-canvas-tick"));
    document.body.style.setProperty(
      "--ph-canvas-transform",
      `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
    );
  }, [pan.x, pan.y, zoom]);

  // Drive ROOT-child visibility off mode + isolation. Single source of truth.
  // Also runs on mount with whatever the current isolate value is.
  React.useEffect(() => {
    applyCanvasVisibility(query, actions, {
      mode: "canvas",
      canvasIsolate,
    });
  }, [canvasIsolate]);

  // Clean up isolation when the canvas viewport unmounts (e.g. user toggles
  // back to page mode). Re-entering canvas always starts in list mode.
  React.useEffect(() => {
    return () => {
      setCanvasIsolate(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety: if the isolated component disappears (deleted, restructured),
  // exit isolation so the user isn't stuck on a dead pill / blank canvas.
  // Accept either a `type === "component"` Container or an inherent
  // component (Modal/Dropdown/Tabs/Accordion node) — both can be isolated.
  React.useEffect(() => {
    if (!canvasIsolate) return;
    try {
      const n = query.node(canvasIsolate).get();
      const dn: string = n?.data?.displayName || "";
      const isReal = n?.data?.props?.type === "component";
      const isInherent =
        ["Modal", "Dropdown", "Tabs", "Accordion"].indexOf(dn) >= 0;
      if (!n || (!isReal && !isInherent)) {
        setCanvasIsolate(null);
      }
    } catch {
      setCanvasIsolate(null);
    }
  }, [canvasIsolate, sig]);

  // Pan/zoom snapshot — taken on isolation enter, restored on exit so the
  // user lands back where they were in the list view (instead of stuck at the
  // centered-on-component pan, which leaves siblings off to the side).
  const preIsolatePanRef = React.useRef<{ pan: { x: number; y: number }; zoom: number } | null>(null);

  React.useEffect(() => {
    if (!canvasIsolate) {
      // Exiting isolation — restore the pre-isolation pan/zoom if we have one.
      if (preIsolatePanRef.current) {
        setPan(preIsolatePanRef.current.pan);
        // Zoom intentionally NOT restored — if the user adjusted zoom while
        // editing the isolated component, that's their new preference.
        preIsolatePanRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasIsolate]);

  // When entering isolation, snapshot pan/zoom, select the isolated node, and
  // center the canvas on it. Preserves the user's current zoom — only pan
  // changes.
  React.useEffect(() => {
    if (!canvasIsolate) return;
    // Snapshot only on first entry (back-to-back isolation switches keep the
    // original list-mode pan as the restore target).
    if (!preIsolatePanRef.current) {
      preIsolatePanRef.current = { pan: { ...pan }, zoom };
    }
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        actions.selectNode(canvasIsolate);
      } catch {
        // ignore
      }
      const surface = surfaceRef.current;
      if (!surface) return;
      const containerIdx = listComponentContainers(query, true).indexOf(canvasIsolate);
      const masterPos = getComponentCanvasPos(
        canvasIsolate,
        query,
        Math.max(0, containerIdx),
        "canvasIsolatePos",
      );
      const masterSize = getComponentCanvasSize(canvasIsolate, query);
      const masterW = masterSize.w ?? CANVAS_SLOT_W;
      // Read the live master height (post-mount); fall back to slot default.
      const liveEl = document.querySelector<HTMLElement>(
        `[node-id="${canvasIsolate}"][data-component-container="true"]`
      );
      const masterH = masterSize.h ?? liveEl?.offsetHeight ?? CANVAS_SLOT_H;

      // Build bounding box across master + every state card, so we center on
      // the group rather than leaving state cards floating off-viewport.
      let minX = masterPos.x;
      let minY = masterPos.y;
      let maxX = masterPos.x + masterW;
      let maxY = masterPos.y + masterH;
      const states = findStateNodes(canvasIsolate, query);
      states.forEach((s, i) => {
        let sx: number;
        let sy: number;
        try {
          const stored = query.node(s.nodeId).get()?.data?.props?.custom?.canvasIsolatePos;
          if (stored && typeof stored.x === "number" && typeof stored.y === "number") {
            sx = stored.x;
            sy = stored.y;
          } else {
            const def = getStateNodeDefaultPos(canvasIsolate, i, query);
            sx = def.x;
            sy = def.y;
          }
        } catch {
          const def = getStateNodeDefaultPos(canvasIsolate, i, query);
          sx = def.x;
          sy = def.y;
        }
        const ssize = getComponentCanvasSize(s.nodeId, query);
        const sw = ssize.w ?? CANVAS_SLOT_W;
        const sh = ssize.h ?? CANVAS_SLOT_H;
        if (sx < minX) minX = sx;
        if (sy < minY) minY = sy;
        if (sx + sw > maxX) maxX = sx + sw;
        if (sy + sh > maxY) maxY = sy + sh;
      });

      const z = zoom;
      const w = surface.clientWidth;
      const h = surface.clientHeight;
      const cx = minX + (maxX - minX) / 2;
      const cy = minY + (maxY - minY) / 2;
      setPan({
        x: w / 2 - cx * z,
        y: Math.max(40, h / 2 - cy * z),
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasIsolate]);

  const { cursor } = useCanvasPan({
    panAtom: ComponentCanvasPanAtom,
    zoomAtom: ComponentCanvasZoomAtom,
    containerRef: surfaceRef,
    enabled: true,
  });

  const containerIds = listComponentContainers(query);
  // Inherent components — Modal/Dropdown/Tabs/Accordion nodes anywhere on
  // the page are surfaced as canvas cards alongside the user's
  // type === "component" Containers. No wrapping needed.
  const inherentIds = React.useMemo(
    () => findInherentComponentNodes(query),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig],
  );
  const allCardIds = React.useMemo(
    () => [...containerIds, ...inherentIds],
    [containerIds, inherentIds],
  );
  const canvasId = findComponentCanvasNode(query);
  const annotations: CanvasAnnotation[] = canvasId
    ? getCanvasAnnotations(canvasId, query)
    : [];

  // State cards: in isolation, walk the component subtree for hidden state
  // nodes (Modal panels, Tabs panes, show-hide / open-modal targets) and
  // surface each as its own card alongside the master. Recompute when the
  // tree structure or isolation target changes (sig already tracks the
  // ROOT-children / canvas signature).
  const stateNodes = React.useMemo(() => {
    if (!canvasIsolate) return [];
    return findStateNodes(canvasIsolate, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasIsolate, sig]);

  const writeAnnotations = (next: CanvasAnnotation[]) => {
    let id = canvasId;
    if (!id) {
      id = createComponentCanvasNode(query, actions);
    }
    if (!id) return;
    actions.setProp(id, (p: any) => {
      p.annotations = next;
    });
  };

  // Arrange every list-mode card in a row or column starting at (0, 0).
  // Reads each card's measured slot size from the DOM when available so cards
  // with custom widths/heights pack tightly; falls back to slot defaults.
  // Labels and titles get reset alongside: above the row in horizontal mode,
  // left of the column in vertical mode.
  const arrangeCards = (axis: "horizontal" | "vertical") => {
    const GAP = 32;
    const HANDLE_RESERVE = 32; // matches HANDLE_HEIGHT + HANDLE_GAP in ComponentCanvasItem
    const ANNOTATION_LANE = 56; // distance from the card row at which annotations sit
    const ANNOTATION_STEP = 220; // packing distance between consecutive annotations
    let cursor = 0;
    for (const id of allCardIds) {
      const size = getComponentCanvasSize(id, query);
      // Prefer the live slot's rendered size for auto-fit cards.
      let slotW = size.w;
      let slotH = size.h;
      if (slotW === undefined || slotH === undefined) {
        const wrapper =
          (document.querySelector(`[node-id="${id}"][data-component-container="true"]`) as HTMLElement | null) ||
          (document.querySelector(`[node-id="${id}"]`) as HTMLElement | null);
        if (wrapper) {
          if (slotW === undefined) slotW = wrapper.offsetWidth || CANVAS_SLOT_W;
          if (slotH === undefined) slotH = wrapper.offsetHeight || CANVAS_SLOT_H;
        }
      }
      const w = slotW ?? CANVAS_SLOT_W;
      const h = slotH ?? CANVAS_SLOT_H;
      const x = axis === "horizontal" ? cursor : 0;
      const y = axis === "horizontal" ? HANDLE_RESERVE : cursor;
      try {
        actions.setProp(id, (p: any) => {
          if (!p.custom) p.custom = {};
          p.custom.canvasPos = { x, y };
        });
      } catch {
        // ignore — node might be inherent and missing custom shape
      }
      cursor += (axis === "horizontal" ? w : h + HANDLE_RESERVE) + GAP;
    }
    if (annotations.length > 0) {
      const next = annotations.map((ann, i) => {
        if (axis === "horizontal") {
          return { ...ann, x: i * ANNOTATION_STEP, y: -ANNOTATION_LANE };
        }
        return { ...ann, x: -ANNOTATION_STEP, y: i * 60 };
      });
      writeAnnotations(next);
    }
  };

  const addAnnotation = (kind: "label" | "title") => {
    const cx = (-pan.x + (surfaceRef.current?.clientWidth ?? 800) / 2) / zoom;
    const cy = (-pan.y + (surfaceRef.current?.clientHeight ?? 600) / 2) / zoom;
    writeAnnotations([
      ...annotations,
      {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x: cx,
        y: cy,
        text: kind === "title" ? "Group title" : "Label",
        kind,
      },
    ]);
  };

  return (
    <div
      ref={surfaceRef}
      className={`bg-base-200 relative h-full w-full overflow-hidden ${className}`}
      style={{ cursor }}
      data-canvas-zoom-component-canvas="true"
    >
      {allCardIds.length === 0 && (
        <div className="text-base-content/60 pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <div className="text-lg font-medium">No components yet</div>
          <div className="text-sm">
            Create a component from a section, then it&apos;ll appear here on the canvas.
          </div>
        </div>
      )}

      {/* Drag handles + annotations live in screen space. They read --ph-pan-x/y
          + --ph-zoom from the surface via CSS calc, so panning/zooming costs
          zero React renders for items. */}
      <div className="pointer-events-none absolute inset-0">
        {canvasIsolate ? (
          <>
            {/* Master card. When state cards exist alongside it, drop the
                isolated chrome (handle + resize) so the master is just one of
                N manipulable cards. With no state cards, keep the original
                chromeless isolated look. */}
            <ComponentCanvasItem
              key={canvasIsolate}
              containerId={canvasIsolate}
              index={0}
              isolated={stateNodes.length === 0}
              disableIsolate
              isIsolationCanvas
            />
            {stateNodes.map((s, i) => (
              <ComponentCanvasItem
                key={s.nodeId}
                containerId={s.nodeId}
                index={i + 1}
                isolated={false}
                defaultPos={getStateNodeDefaultPos(canvasIsolate, i, query)}
                disableIsolate
                isStatePin
                isIsolationCanvas
              />
            ))}
          </>
        ) : (
          allCardIds.map((cid, idx) => (
            <ComponentCanvasItem
              key={cid}
              containerId={cid}
              index={idx}
              isolated={false}
            />
          ))
        )}
        {!canvasIsolate && (
          <CanvasAnnotationLayer
            annotations={annotations}
            onChange={writeAnnotations}
          />
        )}
      </div>

      {/* Exit-isolation pill (only visible during isolation). */}
      {canvasIsolate && (
        <button
          type="button"
          onClick={() => setCanvasIsolate(null)}
          className="bg-base-100 text-base-content border-base-300 hover:bg-base-200 pointer-events-auto absolute top-3 left-3 z-50 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Exit isolation"
          data-tooltip-place="bottom"
          data-tooltip-offset={6}
        >
          <TbX className="size-3.5" />
          <TbBoxModel2 className="size-3.5 opacity-70" />
          <span className="max-w-[12rem] truncate">{isolatedName}</span>
        </button>
      )}

      {/* Floating toolbar */}
      <div className="bg-neutral/95 pointer-events-auto absolute top-3 right-3 z-50 flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
        {!canvasIsolate && (
          <>
            <span className="text-neutral-content/70 px-1 text-xs">
              {allCardIds.length} {allCardIds.length === 1 ? "component" : "components"}
            </span>
            <div className="bg-base-content/20 h-4 w-px" />
            <button
              type="button"
              onClick={createComponent}
              className="hover:bg-neutral text-neutral-content rounded p-1.5"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="New component"
              data-tooltip-place="bottom"
              data-tooltip-offset={6}
              aria-label="New component"
            >
              <TbLayoutGridAdd className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => arrangeCards("horizontal")}
              className="hover:bg-neutral text-neutral-content rounded p-1.5"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Arrange in a row"
              data-tooltip-place="bottom"
              data-tooltip-offset={6}
              aria-label="Arrange horizontally"
            >
              <TbLayoutAlignTop className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => arrangeCards("vertical")}
              className="hover:bg-neutral text-neutral-content rounded p-1.5"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Arrange in a column"
              data-tooltip-place="bottom"
              data-tooltip-offset={6}
              aria-label="Arrange vertically"
            >
              <TbLayoutAlignLeft className="size-4" />
            </button>
            <div className="bg-base-content/20 h-4 w-px" />
            <button
              type="button"
              onClick={() => addAnnotation("label")}
              className="hover:bg-neutral text-neutral-content rounded p-1.5"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Add label"
              data-tooltip-place="bottom"
              data-tooltip-offset={6}
              aria-label="Add label"
            >
              <TbTextSize className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => addAnnotation("title")}
              className="hover:bg-neutral text-neutral-content rounded p-1.5"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Add title"
              data-tooltip-place="bottom"
              data-tooltip-offset={6}
              aria-label="Add title"
            >
              <TbHeading className="size-4" />
            </button>
            <div className="bg-base-content/20 h-4 w-px" />
          </>
        )}
        <CanvasZoom
          zoomAtom={ComponentCanvasZoomAtom}
          fitMode={{ kind: "width", target: 2400, max: 2 }}
          activeKey="component-canvas"
          storageKey="editor-component-canvas-zoom"
        />
      </div>
    </div>
  );
}
