import { Element, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import React from "react";
import { TbHeading, TbTextSize } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { Container } from "../../components/Container";
import {
  CanvasAnnotation,
  COMPONENT_CANVAS_TYPE,
  findComponentCanvasNode,
  getCanvasAnnotations,
  listComponentContainers,
} from "../../utils/componentCanvas";
import { useCanvasPan } from "../hooks/useCanvasPan";
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
          type={COMPONENT_CANVAS_TYPE}
          custom={{ displayName: "Component Canvas" }}
          annotations={[]}
          className="hidden"
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
  const { query, actions } = useEditor((state: any) => {
    const root = state.nodes?.[ROOT_NODE];
    if (!root?.data?.nodes) return { sig: "" };
    const parts: string[] = [];
    for (const nid of root.data.nodes) {
      const n = state.nodes[nid];
      const t = n?.data?.props?.type;
      const hidden = n?.data?.hidden ? "h" : "v";
      if (t === "component") {
        const pos = n?.data?.props?.custom?.canvasPos;
        parts.push(`c:${nid}:${hidden}:${pos?.x ?? "?"}:${pos?.y ?? "?"}`);
      } else if (t === "componentCanvas") {
        const ann = n?.data?.props?.annotations ?? [];
        parts.push(`cc:${nid}:${hidden}:${ann.length}:${JSON.stringify(ann)}`);
      }
    }
    return { sig: parts.join("|") };
  });
  const [zoom] = useAtomState(ComponentCanvasZoomAtom);
  const [pan] = useAtomState(ComponentCanvasPanAtom);
  const surfaceRef = React.useRef<HTMLDivElement>(null);

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

  // Un-hide every component + canvas singleton when entering canvas mode (idempotent)
  React.useEffect(() => {
    // Debug: dump ROOT children so we can see what's there
    try {
      const root = query.node(ROOT_NODE).get();
      const summary = root.data.nodes.map((nid: string) => {
        const n = query.node(nid).get();
        return {
          id: nid,
          type: n?.data?.props?.type,
          hidden: n?.data?.hidden,
          displayName: n?.data?.custom?.displayName || n?.data?.props?.custom?.displayName,
        };
      });
      console.log("[ComponentCanvas] ROOT children:", summary);
    } catch (e) {
      console.error("[ComponentCanvas] ROOT walk failed", e);
    }

    const containerIds = listComponentContainers(query, true);
    console.log("[ComponentCanvas] component container IDs:", containerIds);
    containerIds.forEach((cid) => {
      try {
        actions.setHidden(cid, false);
        actions.setProp(cid, (p: any) => {
          p.hidden = false;
        });
      } catch {
        // node may have been removed mid-render
      }
    });
    const canvasId = findComponentCanvasNode(query);
    if (canvasId) {
      try {
        actions.setHidden(canvasId, false);
        actions.setProp(canvasId, (p: any) => {
          p.hidden = false;
        });
      } catch {
        // ignore
      }
    }
  }, []);

  const { cursor } = useCanvasPan({
    panAtom: ComponentCanvasPanAtom,
    zoomAtom: ComponentCanvasZoomAtom,
    containerRef: surfaceRef,
    enabled: true,
  });

  const containerIds = listComponentContainers(query);
  const canvasId = findComponentCanvasNode(query);
  const annotations: CanvasAnnotation[] = canvasId
    ? getCanvasAnnotations(canvasId, query)
    : [];

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
      className={`bg-base-100 relative h-full w-full overflow-hidden ${className}`}
      style={{ cursor }}
      data-canvas-zoom-component-canvas="true"
    >
      {containerIds.length === 0 && (
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
        {containerIds.map((cid, idx) => (
          <ComponentCanvasItem
            key={cid}
            containerId={cid}
            index={idx}
          />
        ))}
        <CanvasAnnotationLayer
          annotations={annotations}
          onChange={writeAnnotations}
        />
      </div>

      {/* Floating toolbar */}
      <div className="bg-neutral/95 pointer-events-auto absolute top-3 right-3 z-50 flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
        <span className="text-neutral-content/70 px-1 text-xs">
          {containerIds.length} {containerIds.length === 1 ? "component" : "components"}
        </span>
        <div className="bg-base-content/20 h-4 w-px" />
        <button
          type="button"
          onClick={() => addAnnotation("label")}
          className="hover:bg-neutral text-neutral-content rounded p-1.5"
          title="Add label"
          aria-label="Add label"
        >
          <TbTextSize className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => addAnnotation("title")}
          className="hover:bg-neutral text-neutral-content rounded p-1.5"
          title="Add title"
          aria-label="Add title"
        >
          <TbHeading className="size-4" />
        </button>
        <div className="bg-base-content/20 h-4 w-px" />
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
