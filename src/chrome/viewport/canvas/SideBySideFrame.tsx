/**
 * SideBySideFrame — read-only mirror of the primary canvas at a different
 * breakpoint width. Phase 3 wire-up of `SideBySideAtom`.
 *
 * Architecture: separate `<Editor enabled={false}>` instance fed with the
 * primary editor's current serialized state. The wrapper carries
 * `container-type: inline-size; container-name: ph-editor-canvas` so the
 * editor-rewritten `@container` queries resolve against THIS frame's width
 * (not the browser viewport — that's the whole point of the rewrite).
 *
 * Updates: subscribes to the primary editor's `_nodes_changed` emitter
 * event and re-serializes on each change. Re-mounts the secondary frame
 * with `key={serializedHash}` so CraftJS picks up new structure cleanly.
 *
 * Performance: serialization is debounced (60ms) — well under the eye's
 * threshold for "live" feel and prevents stutter on rapid drag.
 */
import { Editor, Frame, useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";

import { useSDK } from "../../../core/context";
import { sanitizeCraftNodeReferences } from "../../../utils/sanitizeNodeMap";
import { ViewAtom } from "../state/atoms";
import { getCanvasBreakpointPx } from "../../../utils/tailwind/className";
import { viewerResolver } from "../../../components/resolvers/viewer";
import type { ViewMode } from "../../../core/store";
import { sdkLog } from "../../../utils/logger";

interface Props {
  /** Which bp width the secondary should render at. */
  secondaryView: ViewMode;
  /** Outer wrapper class. */
  className?: string;
  /** Px width to render the secondary at. */
  widthPx: number;
  /** Sync a scrollTop value from the primary into secondary (and vice versa). */
  scrollMirrorRef: React.MutableRefObject<{
    primary: HTMLDivElement | null;
    secondary: HTMLDivElement | null;
    isMirroring: boolean;
  }>;
}

export function SideBySideFrame({
  secondaryView,
  className = "",
  widthPx,
  scrollMirrorRef,
}: Props) {
  const { query } = useEditor();
  const { emitter } = useSDK();
  const primaryView = useAtomValue(ViewAtom);

  // Throttled re-serialization tied to primary edits.
  const [serialized, setSerialized] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reserialize = () => {
      try {
        const raw = JSON.parse(query.serialize());
        const cleaned = sanitizeCraftNodeReferences(raw);
        setSerialized(JSON.stringify(cleaned));
      } catch (err) {
        sdkLog.warn("[SideBySideFrame] serialize failed", err);
      }
    };
    reserialize();
    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(reserialize, 60);
    };
    const unsub = emitter.onInternal("_nodes_changed", handler);
    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // primaryView isn't a true dep but include so the secondary refreshes when
    // the user switches the primary canvas (in case ROOT props ride along).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, emitter, primaryView]);

  // Wire up scroll mirror after mount.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    scrollMirrorRef.current.secondary = el;
    const handleScroll = () => {
      const m = scrollMirrorRef.current;
      if (m.isMirroring) return;
      if (!m.primary) return;
      m.isMirroring = true;
      try {
        m.primary.scrollTop = el.scrollTop;
      } finally {
        // Release on next frame so the other side's scroll handler is the one
        // that fires (and still sees isMirroring=true so it doesn't loop).
        requestAnimationFrame(() => {
          m.isMirroring = false;
        });
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      scrollMirrorRef.current.secondary = null;
    };
  }, [scrollMirrorRef]);

  const labelText = secondaryView === "2xl" ? "2XL" : secondaryView.toUpperCase();

  return (
    <div
      className={`bg-base-100 border-base-300 relative flex shrink-0 flex-col overflow-hidden border-l ${className}`}
      style={{ width: `${widthPx}px` }}
      data-side-by-side-secondary
    >
      <div className="bg-base-200 text-neutral-content border-base-300 flex h-6 shrink-0 items-center justify-between border-b px-2 font-mono text-[10px] tracking-wider uppercase">
        <span>{labelText} mirror</span>
        <span className="text-[9px] opacity-70">read-only</span>
      </div>
      <div
        ref={containerRef}
        className="scrollbar-light flex-1 overflow-auto"
        style={{
          // Each secondary frame is its own container — Phase 3's @container
          // ph-editor-canvas queries resolve against THIS width.
          containerType: "inline-size",
          containerName: "ph-editor-canvas",
        }}
      >
        {serialized ? (
          <Editor key={"sbs-" + serialized.length} resolver={viewerResolver} enabled={false}>
            <Frame data={serialized} />
          </Editor>
        ) : (
          <div className="text-neutral-content p-4 text-xs">Loading mirror…</div>
        )}
      </div>
    </div>
  );
}

/** Resolve px width for a secondary view from the site's theme (or defaults). */
export function resolveSecondaryWidthPx(
  view: ViewMode,
  themeBreakpoints?: Record<string, number>
): number {
  const map = getCanvasBreakpointPx({ breakpoints: themeBreakpoints });
  if (view === "tablet") return map.sm;
  if (view === "desktop") return map["2xl"];
  return map[view as keyof typeof map] ?? 390;
}
