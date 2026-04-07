import { Editor, Frame } from "@craftjs/core";
import React, { Component, useEffect, useMemo, useState } from "react";
import { TbCheck, TbLoader2, TbMinus, TbPlus, TbRefresh, TbX } from "react-icons/tb";

class PreviewErrorBoundary extends Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return <div className="p-4 text-sm text-muted-foreground">Preview unavailable — apply changes to see the result.</div>;
    return this.props.children;
  }
}
import { useResizable } from "./hooks/useResizable";
import { generateDesignSystemCSSVariables } from "../utils/design/designSystemVars";
import { getMaterialSymbolsUrlFromNodes } from "../utils/data/collectGoogleIcons";
import { sanitizeCraftNodeReferences } from "../utils/sanitizeNodeMap";

type Tab = "review" | "live";

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
      return <TbLoader2 className="size-3.5 animate-spin text-primary" />;
    case "done":
      return <TbCheck className="size-3.5 text-emerald-500" />;
    case "failed":
      return <TbX className="size-3.5 text-destructive" />;
    default:
      return <div className="size-3.5 rounded-full border border-muted-foreground/40" />;
  }
}

function SectionControlList({ sections, onRedo, onAccept, onReject }: SectionOverlayConfig) {
  return (
    <div className="border-b border-border/30 px-3 py-2 space-y-1">
      <div className="text-[10px] font-medium text-muted-foreground">Sections</div>
      {sections.map(s => (
        <div key={s.nodeId} className="flex items-center gap-1.5 text-[11px]">
          <SectionStatusIcon status={s.accepted ? "done" : s.status} />
          <span className={`flex-1 truncate font-medium ${s.rejected ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {s.displayName}
          </span>
          {s.statusText && s.status === "building" && (
            <span className="truncate text-[10px] text-muted-foreground max-w-[80px]">{s.statusText}</span>
          )}
          {!s.accepted && !s.rejected && (s.status === "done" || s.status === "failed") && (
            <div className="flex items-center gap-0.5">
              {s.status === "done" && onAccept && (
                <button type="button" onClick={() => onAccept(s.nodeId)} className="rounded px-1.5 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10" title="Accept">
                  <TbCheck className="size-3" />
                </button>
              )}
              {onRedo && (
                <button type="button" onClick={() => onRedo(s.nodeId)} className="rounded px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10" title="Redo">
                  <TbRefresh className="size-3" />
                </button>
              )}
              {onReject && (
                <button type="button" onClick={() => onReject(s.nodeId)} className="rounded px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10" title="Reject">
                  <TbX className="size-3" />
                </button>
              )}
            </div>
          )}
          {s.accepted && (
            <span className="text-[10px] text-emerald-600">Accepted</span>
          )}
          {s.rejected && (
            <span className="text-[10px] text-muted-foreground">Rejected</span>
          )}
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
  onClose: () => void;
  sectionOverlay?: SectionOverlayConfig | null;
}

export function PreviewPanel({ content, liveContent, changedNodes, resolver, onClose, sectionOverlay }: PreviewPanelProps) {
  const [zoom, setZoom] = useState(0.35);
  const [tab, setTab] = useState<Tab>("review");
  const { width, handleProps } = useResizable({
    storageKey: "preview-panel",
    defaultWidth: 350,
    defaultHeight: 9999,
    minWidth: 250,
    maxWidth: 800,
    edges: ["w"],
  });

  // Summarize what changed
  const changes = changedNodes ? Object.entries(changedNodes)
    .filter(([_, n]: any) => n?.props?.text || n?.parent === "page_home")
    .slice(0, 6)
    .map(([id, n]: any) => ({
      id,
      name: n.custom?.displayName || n.type?.resolvedName || id,
      text: n.props?.text?.replace(/<[^>]*>/g, "").slice(0, 40),
      isNew: n.parent === "page_home",
    })) : [];

  // Load Google Fonts from the preview content's ROOT header
  useEffect(() => {
    const header = content?.ROOT?.props?.header;
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
    return () => { added.forEach(el => el.remove()); };
  }, [content?.ROOT?.props?.header]);

  // Load Material Symbols font for Google icons used in preview
  useEffect(() => {
    const iconsUrl = getMaterialSymbolsUrlFromNodes(content);
    if (!iconsUrl) return;
    const existing = document.getElementById("google-icons-preview");
    if (existing) { (existing as HTMLLinkElement).href = iconsUrl; return; }
    const el = document.createElement("link");
    el.id = "google-icons-preview";
    el.rel = "stylesheet";
    el.href = iconsUrl;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [content]);

  // Extract palette/styleGuide from ROOT to scope CSS vars into the preview
  const previewCSS = useMemo(() => {
    const rootProps = content?.ROOT?.props;
    if (!rootProps?.pallet) return "";
    return generateDesignSystemCSSVariables(
      { palette: rootProps.pallet, styleGuide: rootProps.styleGuide || {} },
      "#ph-preview-frame"
    );
  }, [content?.ROOT?.props?.pallet, content?.ROOT?.props?.styleGuide]);

  const safeContent = useMemo(() => sanitizeCraftNodeReferences(content), [content]);
  const frameData = tab === "live" && liveContent ? liveContent : JSON.stringify(safeContent);

  return (
    <div className="relative flex shrink-0 flex-col border-l border-border/40" style={{ width }}>
      {/* Resize handle */}
      <div {...handleProps.w} />

      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setTab("review")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === "review"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === "live"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
            title="Zoom out"
          >
            <TbMinus />
          </button>
          <span className="min-w-[3ch] text-center text-[10px] text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(1, z + 0.05))}
            className="tool-button p-0.5! [&_svg]:size-3.5!"
            title="Zoom in"
          >
            <TbPlus />
          </button>
          <button type="button" onClick={onClose} className="tool-button ml-1 [&_svg]:size-3.5!">
            <TbX />
          </button>
        </div>
      </div>

      {/* Section controls during fills, or changes summary otherwise */}
      {tab === "review" && sectionOverlay && sectionOverlay.sections.length > 0 ? (
        <SectionControlList {...sectionOverlay} />
      ) : tab === "review" && changes.length > 0 ? (
        <div className="border-b border-border/30 px-3 py-2 space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground">Changed:</div>
          {changes.map(c => (
            <div key={c.id} className="flex items-baseline gap-1.5 text-[10px]">
              {c.isNew && <span className="rounded bg-primary/20 px-1 text-[9px] text-primary">new</span>}
              <span className="font-medium text-foreground">{c.name}</span>
              {c.text && <span className="truncate text-muted-foreground">{c.text}</span>}
            </div>
          ))}
        </div>
      ) : null}

      <div className="scrollbar-light flex-1 overflow-x-hidden overflow-y-auto">
        {(() => {
          try {
            return (
              <PreviewErrorBoundary>
                <div id="ph-preview-frame" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%`, pointerEvents: "none" }}>
                  {previewCSS && <style dangerouslySetInnerHTML={{ __html: previewCSS }} />}
                  <Editor key={tab + frameData} resolver={resolver} enabled={false}>
                    <Frame data={frameData} />
                  </Editor>
                </div>
              </PreviewErrorBoundary>
            );
          } catch {
            return <div className="p-4 text-sm text-muted-foreground">Preview unavailable</div>;
          }
        })()}
      </div>
    </div>
  );
}
