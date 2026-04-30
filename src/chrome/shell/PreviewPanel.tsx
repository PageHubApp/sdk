import { Editor, Frame } from "@craftjs/core";
import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { TbCheck, TbLoader2, TbMinus, TbPlus, TbRefresh, TbX } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

class PreviewErrorBoundary extends Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="text-neutral-content p-4 text-sm">
          Preview unavailable — apply changes to see the result.
        </div>
      );
    return this.props.children;
  }
}
import { useResizable } from "../hooks/useResizable";
import { generateDesignSystemCSSVariables } from "../../utils/design/designSystemVars";
import { resolveTheme } from "../../utils/design/resolveTheme";
import { sanitizeCraftNodeReferences } from "../../utils/sanitizeNodeMap";

type Tab = "review" | "live";

/** When ai-draft JSON is missing ROOT.theme.palette, inherit tokens from the live editor viewport (same list as ComponentPreview). */
function buildViewportScopedCss(scopeSelector: string): string {
  if (typeof document === "undefined") return "";
  const viewport = document.getElementById("viewport");
  if (!viewport) return "";
  const cs = getComputedStyle(viewport);
  const keys = [
    "primary",
    "primary-content",
    "color-primary",
    "color-primary-content",
    "secondary",
    "secondary-content",
    "color-secondary",
    "color-secondary-content",
    "accent",
    "accent-content",
    "color-accent",
    "color-accent-content",
    "neutral",
    "neutral-content",
    "color-neutral",
    "color-neutral-content",
    "base-100",
    "base-200",
    "base-300",
    "base-content",
    "color-base-100",
    "color-base-200",
    "color-base-300",
    "color-base-content",
    "error",
    "error-content",
    "color-error",
    "color-error-content",
    "info",
    "info-content",
    "color-info",
    "color-info-content",
    "success",
    "success-content",
    "color-success",
    "color-success-content",
    "warning",
    "warning-content",
    "color-warning",
    "color-warning-content",
    "radius-box",
    "radius-field",
    "border",
    "depth",
    "noise",
    "shadow-style",
    "heading-font-family",
    "body-font-family",
    "container-padding-x",
    "container-padding-y",
    "content-width",
    "section-gap",
    "container-gap",
    "spacing-density",
    "space-xs",
    "space-sm",
    "space-md",
    "space-lg",
    "space-xl",
    "button-padding-x",
    "button-padding-y",
  ];
  const lines: string[] = [];
  for (const k of keys) {
    const v = cs.getPropertyValue(`--${k}`).trim();
    if (v) lines.push(`  --${k}: ${v};`);
  }
  if (!lines.length) return "";
  return `${scopeSelector} {\n${lines.join("\n")}\n}`;
}

export interface SectionOverlayItem {
  nodeId: string;
  displayName: string;
  status: "pending" | "building" | "done" | "failed";
  statusText?: string;
  accepted?: boolean;
  rejected?: boolean;
}

export interface SectionOverlayConfig {
  sections: SectionOverlayItem[];
  onRedo?: (nodeId: string) => void;
  onAccept?: (nodeId: string) => void;
  onReject?: (nodeId: string) => void;
}

function SectionStatusIcon({ status }: { status: SectionOverlayItem["status"] }) {
  switch (status) {
    case "building":
      return <TbLoader2 className="text-primary size-3.5 animate-spin" />;
    case "done":
      return <TbCheck className="size-3.5 text-emerald-500" />;
    case "failed":
      return <TbX className="text-error size-3.5" />;
    default:
      return <div className="border-neutral-foreground/40 size-3.5 rounded-full border" />;
  }
}

function SectionControlList({ sections, onRedo, onAccept, onReject }: SectionOverlayConfig) {
  return (
    <div className="border-base-300/30 space-y-1 border-b px-3 py-2">
      <div className="text-neutral-content text-[10px] font-medium">Sections</div>
      {sections.map(s => (
        <div key={s.nodeId} className="flex items-center gap-1.5 text-[11px]">
          <SectionStatusIcon status={s.accepted ? "done" : s.status} />
          <span
            className={`flex-1 truncate font-medium ${s.rejected ? "text-neutral-content line-through" : "text-base-content"}`}
          >
            {s.displayName}
          </span>
          {s.statusText && s.status === "building" && (
            <span className="text-neutral-content max-w-[80px] truncate text-[10px]">
              {s.statusText}
            </span>
          )}
          {!s.accepted && !s.rejected && (s.status === "done" || s.status === "failed") && (
            <div className="flex items-center gap-0.5">
              {s.status === "done" && onAccept && (
                <button
                  type="button"
                  onClick={() => onAccept(s.nodeId)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Accept"
                >
                  <TbCheck className="size-3" />
                </button>
              )}
              {onRedo && (
                <button
                  type="button"
                  onClick={() => onRedo(s.nodeId)}
                  className="text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 text-[10px]"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Redo"
                >
                  <TbRefresh className="size-3" />
                </button>
              )}
              {onReject && (
                <button
                  type="button"
                  onClick={() => onReject(s.nodeId)}
                  className="text-error hover:bg-error/10 rounded px-1.5 py-0.5 text-[10px]"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Reject"
                >
                  <TbX className="size-3" />
                </button>
              )}
            </div>
          )}
          {s.accepted && <span className="text-[10px] text-emerald-600">Accepted</span>}
          {s.rejected && <span className="text-neutral-content text-[10px]">Rejected</span>}
        </div>
      ))}
    </div>
  );
}

interface PreviewPanelProps {
  content: Record<string, any>;
  liveContent?: string | null;
  changedNodes?: Record<string, any> | null;
  resolver: any;
  onClose?: () => void;
  sectionOverlay?: SectionOverlayConfig | null;
  /**
   * Inline mode: render as a chat-embeddable block (no side-panel chrome,
   * no resize handle, no close button, fixed height). Default: side-panel.
   */
  inline?: boolean;
}

export function PreviewPanel({
  content,
  liveContent,
  changedNodes,
  resolver,
  onClose,
  sectionOverlay,
  inline = false,
}: PreviewPanelProps) {
  const [zoom, setZoom] = useState(inline ? 0.5 : 0.35);
  const [tab, setTab] = useState<Tab>("review");
  const scaledFrameRef = useRef<HTMLDivElement | null>(null);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const { width, handleProps } = useResizable({
    storageKey: "preview-panel",
    defaultWidth: 350,
    defaultHeight: 9999,
    minWidth: 250,
    maxWidth: 800,
    edges: ["w"],
  });

  // Summarize what changed
  const changes = changedNodes
    ? Object.entries(changedNodes)
        .filter(([_, n]: any) => n?.props?.text || n?.parent === "page_home")
        .slice(0, 6)
        .map(([id, n]: any) => ({
          id,
          name: n.custom?.displayName || n.type?.resolvedName || id,
          text: n.props?.text?.replace(/<[^>]*>/g, "").slice(0, 40),
          isNew: n.parent === "page_home",
        }))
    : [];

  // Load Google Fonts from the preview content's ROOT injected <head>
  useEffect(() => {
    const header = content?.ROOT?.props?.inject?.head;
    if (!header) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(header, "text/html");
    const links = doc.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]');
    const added: Element[] = [];
    links.forEach(link => {
      const href = link.getAttribute("href");
      // Don't add duplicate links
      if (href && !document.querySelector(`link[href="${CSS.escape(href)}"]`)) {
        const el = document.createElement("link");
        el.rel = link.getAttribute("rel") || "stylesheet";
        if (link.hasAttribute("crossorigin")) el.crossOrigin = "";
        el.href = href;
        document.head.appendChild(el);
        added.push(el);
      }
    });
    return () => {
      added.forEach(el => el.remove());
    };
  }, [content?.ROOT?.props?.inject?.head]);

  // Theme for the preview iframe: prefer ROOT from ai-draft; if palette missing/stale, match live #viewport (avoids milky editor chrome defaults).
  const previewCSS = useMemo(() => {
    const rootProps = content?.ROOT?.props;
    if (!rootProps) return buildViewportScopedCss("#ph-preview-frame");
    const theme = resolveTheme(rootProps);
    if (theme.palette?.length) {
      return generateDesignSystemCSSVariables(theme, "#ph-preview-frame");
    }
    return buildViewportScopedCss("#ph-preview-frame");
  }, [content]);

  const safeContent = useMemo(() => sanitizeCraftNodeReferences(content), [content]);
  // Strip viewport-height minimums so the preview collapses to content height
  // rather than reserving 100vh of empty scroll space (Background uses
  // `min-h-dvh`; matches the same strip in ComponentPreview).
  const stripViewportMinH = (s: string) =>
    s
      .replace(/min-h-screen/g, "")
      .replace(/min-h-full/g, "")
      .replace(/min-h-dvh/g, "");
  const frameData =
    tab === "live" && liveContent
      ? stripViewportMinH(liveContent)
      : stripViewportMinH(JSON.stringify(safeContent));

  // Measure the unscaled inner content so the scroll viewport can size itself
  // to `naturalHeight * zoom` (transform doesn't affect layout box). Without
  // this the inline preview leaves huge empty space for short pages.
  useEffect(() => {
    const el = scaledFrameRef.current;
    if (!el) return;
    const measure = () => setNaturalHeight(el.scrollHeight || el.offsetHeight || 0);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frameData, zoom]);

  const scaledViewportHeight = naturalHeight > 0 ? Math.ceil(naturalHeight * zoom) : null;
  // Inline: fixed compact height so the chat doesn't expand / jump as the
  // agent streams in content. Scroll inside for taller pages.
  // Side-panel: legacy behavior (flex-1 of parent).
  const INLINE_MAX_HEIGHT = 240;
  const scrollStyle = inline
    ? {
        height: scaledViewportHeight
          ? Math.min(scaledViewportHeight, INLINE_MAX_HEIGHT)
          : INLINE_MAX_HEIGHT,
      }
    : undefined;

  return (
    <div
      className={
        inline
          ? "border-base-300/60 bg-base-100/40 relative flex w-full flex-col overflow-hidden rounded-lg border"
          : "border-base-300/40 relative flex shrink-0 flex-col border-l"
      }
      style={inline ? undefined : { width }}
    >
      {/* Resize handle (side-panel only) */}
      {!inline && <div {...handleProps.w} />}

      <div className="border-base-300/30 flex items-center justify-between border-b px-3 py-2">
        <div className="border-base-300/60 bg-neutral/40 flex items-center gap-0.5 rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setTab("review")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === "review"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-neutral-content hover:bg-neutral/60 hover:text-base-content"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === "live"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-neutral-content hover:bg-neutral/60 hover:text-base-content"
            }`}
          >
            Live
          </button>
        </div>
        <div className="tool-bg gap-1!">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.15, z - 0.05))}
            className="tool-button p-0.5! [&_svg]:size-3.5!"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Zoom out"
          >
            <TbMinus />
          </button>
          <span className="text-neutral-content min-w-[3ch] text-center text-[10px]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(1, z + 0.05))}
            className="tool-button p-0.5! [&_svg]:size-3.5!"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Zoom in"
          >
            <TbPlus />
          </button>
          {onClose && !inline && (
            <button type="button" onClick={onClose} className="tool-button ml-1 [&_svg]:size-3.5!">
              <TbX />
            </button>
          )}
        </div>
      </div>

      {/* Section controls during fills, or changes summary otherwise */}
      {tab === "review" && sectionOverlay && sectionOverlay.sections.length > 0 ? (
        <SectionControlList {...sectionOverlay} />
      ) : tab === "review" && changes.length > 0 ? (
        <div className="border-base-300/30 space-y-1 border-b px-3 py-2">
          <div className="text-neutral-content text-[10px] font-medium">Changed:</div>
          {changes.map(c => (
            <div key={c.id} className="flex items-baseline gap-1.5 text-[10px]">
              {c.isNew && (
                <span className="bg-primary/20 text-primary rounded px-1 text-[9px]">new</span>
              )}
              <span className="text-base-content font-medium">{c.name}</span>
              {c.text && <span className="text-neutral-content truncate">{c.text}</span>}
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={`scrollbar-light w-full min-w-0 overflow-x-hidden overflow-y-auto${inline ? "" : "flex-1"}`}
        style={scrollStyle}
      >
        {(() => {
          try {
            return (
              <PreviewErrorBoundary>
                <div
                  id="ph-preview-frame"
                  ref={scaledFrameRef}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                    width: `${100 / zoom}%`,
                    pointerEvents: "none",
                  }}
                >
                  {previewCSS && <style dangerouslySetInnerHTML={{ __html: previewCSS }} />}
                  <Editor key={tab + frameData} resolver={resolver} enabled={false}>
                    <Frame data={frameData} />
                  </Editor>
                </div>
              </PreviewErrorBoundary>
            );
          } catch {
            return <div className="text-neutral-content p-4 text-sm">Preview unavailable</div>;
          }
        })()}
      </div>
    </div>
  );
}
