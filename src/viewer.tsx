/**
 * @pagehub/sdk — Viewer component
 *
 * Lightweight read-only renderer for published pages.
 * This is a separate, smaller bundle that customers include
 * on their public-facing pages (no editor UI, no drag/drop).
 */

import { Editor, Frame, useEditor } from "@craftjs/core";
import lz from "lzutf8";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_CRAFT_RESOLVER } from "./core/componentRegistry";
import { EditorStoreProvider } from "./core/store";
import { injectTailwindBrowser } from "./core/tailwindBrowser";
import { sanitizeCraftSerializedContent } from "./utils/sanitizeNodeMap";
import { processForViewer, type ResolvedComponentDef } from "./define";

interface PageHubViewerProps {
  /** Compressed page content (from PageData.content) */
  content: string;
  /** Additional component resolver — merged with default */
  resolver?: Record<string, React.ComponentType<any>>;
  /** Custom components registered via defineComponent() */
  components?: ResolvedComponentDef[];
  /** Class name for the container */
  className?: string;
  /** Inline styles for the container */
  style?: React.CSSProperties;
}

function ViewerInner({ content }: { content: string }) {
  const { actions } = useEditor();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      if (content) {
        const decompressed = lz.decompress(lz.decodeBase64(content));
        actions.deserialize(sanitizeCraftSerializedContent(decompressed) || "");
        setLoaded(true);
      }
    } catch (err) {
      console.error("[PageHub Viewer] Failed to render page:", err);
    }
  }, [content, actions]);

  if (!loaded) return null;

  return (
    <ViewerFrameBoundary>
      <Frame />
    </ViewerFrameBoundary>
  );
}

class ViewerFrameBoundary extends React.Component<
  { children?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[PageHub Viewer] Frame render failed:", error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Read-only page viewer.
 */
export function PageHubViewer({
  content,
  resolver = {},
  components = [],
  className,
  style,
}: PageHubViewerProps) {
  // Inject Tailwind v4 browser runtime for standalone viewer usage
  injectTailwindBrowser();

  if (!content) {
    return null;
  }

  const customResolver = components.length > 0 ? processForViewer(components) : {};
  const mergedResolver = { ...DEFAULT_CRAFT_RESOLVER, ...customResolver, ...resolver };

  return (
    <EditorStoreProvider>
      <div
        className={`pagehub-viewer ${className || ""}`}
        style={{
          width: "100%",
          ...style,
        }}
      >
        <Editor resolver={mergedResolver} enabled={false}>
          <ViewerInner content={content} />
        </Editor>
      </div>
    </EditorStoreProvider>
  );
}

// ─── Vanilla JS mount helper ────────────────────────────────────────────────

interface ViewerRenderOptions {
  container: HTMLElement | string;
  content: string;
  resolver?: Record<string, React.ComponentType<any>>;
  components?: ResolvedComponentDef[];
}

/**
 * Mount the viewer into a DOM element (vanilla JS API).
 */
export function renderViewer(options: ViewerRenderOptions): () => void {
  const globalReactDom = (
    globalThis as typeof globalThis & { ReactDOM?: { createRoot?: typeof createRoot } }
  ).ReactDOM;
  const createRootFn =
    typeof globalReactDom?.createRoot === "function" ? globalReactDom.createRoot : createRoot;

  let containerEl: HTMLElement;
  if (typeof options.container === "string") {
    const el = document.querySelector(options.container);
    if (!el) throw new Error(`[PageHub Viewer] Element not found: ${options.container}`);
    containerEl = el as HTMLElement;
  } else {
    containerEl = options.container;
  }

  const root = createRootFn(containerEl);
  root.render(
    React.createElement(PageHubViewer, {
      content: options.content,
      resolver: options.resolver,
      components: options.components,
    })
  );

  // Return cleanup function
  return () => root.unmount();
}
