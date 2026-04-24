import { Editor, Frame } from "@craftjs/core";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_STYLE_GUIDE } from "../../../utils/defaults";
import {
  buildModifierExpansionMap,
  expandStructureWithModifierMap,
} from "../../../utils/modifierUtils";
import { buildCraftTreeFromStructure } from "../../structure/buildCraftTreeFromStructure";

/**
 * Error boundary that catches CraftJS invariant errors inside preview Editors.
 * Without this, a single bad section preview crashes the entire Sections panel.
 */
class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Silently swallow CraftJS invariant errors in previews
    if (process.env.NODE_ENV === "development") {
      console.warn("[ComponentPreview] Preview render failed:", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-neutral text-neutral-content flex h-32 w-full items-center justify-center rounded-lg text-xs">
          Preview unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

/** Default layout/style tokens for preview context (outside #viewport).
 *  Palette vars inherit from :root via theme.css — only layout tokens need explicit values. */
const PREVIEW_DESIGN_VARS: React.CSSProperties & Record<string, string> = {
  "--radius-box": DEFAULT_STYLE_GUIDE.radiusBox,
  "--radius-field": DEFAULT_STYLE_GUIDE.radiusField,
  "--radius-selector": DEFAULT_STYLE_GUIDE.radiusSelector,
  "--depth": DEFAULT_STYLE_GUIDE.depth,
  "--noise": DEFAULT_STYLE_GUIDE.noise,
  "--border": DEFAULT_STYLE_GUIDE.border,
  "--shadow-style": DEFAULT_STYLE_GUIDE.shadowStyle,
  "--heading-font-family": `'${DEFAULT_STYLE_GUIDE.headingFontFamily}', system-ui, sans-serif`,
  "--body-font-family": `'${DEFAULT_STYLE_GUIDE.bodyFontFamily}', system-ui, sans-serif`,
  "--button-padding": DEFAULT_STYLE_GUIDE.buttonPadding,
  "--button-padding-x": DEFAULT_STYLE_GUIDE.buttonPadding.split(" ")[0],
  "--button-padding-y":
    DEFAULT_STYLE_GUIDE.buttonPadding.split(" ")[1] ||
    DEFAULT_STYLE_GUIDE.buttonPadding.split(" ")[0],
  "--container-padding": DEFAULT_STYLE_GUIDE.containerPadding,
  "--container-padding-x":
    DEFAULT_STYLE_GUIDE.containerPadding.split(" ")[1] ||
    DEFAULT_STYLE_GUIDE.containerPadding.split(" ")[0],
  "--container-padding-y": DEFAULT_STYLE_GUIDE.containerPadding.split(" ")[0],
  "--section-gap": DEFAULT_STYLE_GUIDE.sectionGap,
  "--container-gap": DEFAULT_STYLE_GUIDE.containerGap,
  "--content-width": DEFAULT_STYLE_GUIDE.contentWidth,
  "--spacing-density": DEFAULT_STYLE_GUIDE.spacingDensity,
  "--space-xs": `calc(${DEFAULT_STYLE_GUIDE.spaceXs} * var(--spacing-density))`,
  "--space-sm": `calc(${DEFAULT_STYLE_GUIDE.spaceSm} * var(--spacing-density))`,
  "--space-md": `calc(${DEFAULT_STYLE_GUIDE.spaceMd} * var(--spacing-density))`,
  "--space-lg": `calc(${DEFAULT_STYLE_GUIDE.spaceLg} * var(--spacing-density))`,
  "--space-xl": `calc(${DEFAULT_STYLE_GUIDE.spaceXl} * var(--spacing-density))`,
};

interface ComponentPreviewProps {
  component: any;
  /** Library block `modifiers` — expand shortcut tokens in structure for preview only. */
  modifiers?: Record<string, { name: string; classes?: string; requires?: string }[]>;
  /** Stable id for memo (e.g. block slug) when `component` JSON matches another block. */
  slug?: string;
  scale?: number;
  resolver: any;
}

export const ComponentPreview = React.memo(function ComponentPreview({
  component,
  modifiers,
  slug,
  scale = 0.25,
  resolver,
}: ComponentPreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);

  // Read the site's design system vars from #viewport so previews match the user's theme
  const siteVars = useMemo(() => {
    if (typeof document === "undefined") return {};
    const viewport = document.getElementById("viewport");
    if (!viewport) return {};
    const cs = getComputedStyle(viewport);
    const vars: Record<string, string> = {};
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
    for (const k of keys) {
      const v = cs.getPropertyValue(`--${k}`).trim();
      if (v) vars[`--${k}`] = v;
    }
    return vars;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const node = previewRef.current;
    if (!node) return;

    const measure = () => {
      const nextHeight = Math.ceil(node.scrollHeight * scale);
      setScaledHeight(nextHeight > 0 ? nextHeight : null);
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, [component, modifiers, scale, slug]);

  const { previewElement, previewBuildError } = useMemo(() => {
    if (!component) return { previewElement: null as React.ReactNode, previewBuildError: false };
    try {
      const jsonString = JSON.stringify(component);
      if (!jsonString || typeof jsonString !== "string") {
        throw new Error("Component is not serializable");
      }

      let cleanedComponent = JSON.parse(
        jsonString
          .replace(/min-h-screen/g, "")
          .replace(/min-h-full/g, "")
          .replace(/min-h-dvh/g, "")
      );

      if (modifiers && typeof modifiers === "object" && Object.keys(modifiers).length > 0) {
        const expansionMap = buildModifierExpansionMap(modifiers as Record<string, any>);
        if (expansionMap.size > 0) {
          cleanedComponent = expandStructureWithModifierMap(cleanedComponent, expansionMap);
        }
      }

      const el = buildCraftTreeFromStructure(cleanedComponent, {
        mode: "preview",
        resolver,
        uniqueKey: "preview-root",
        isRoot: true,
      });
      return { previewElement: el, previewBuildError: false };
    } catch (error) {
      console.error("Error rendering component preview:", error);
      return { previewElement: null, previewBuildError: true };
    }
  }, [component, modifiers, resolver, slug]);

  if (!component) return null;

  if (previewBuildError) {
    return (
      <div className="border-base-300 bg-neutral text-neutral-content flex h-48 w-full items-center justify-center rounded-lg border">
        Failed to render preview
      </div>
    );
  }

  const scaledWidth = `${100 / scale}%`;

  return (
    <PreviewErrorBoundary>
      <div
        className="pagehub-sdk-root bg-base-100 text-base-content overflow-hidden"
        style={{ pointerEvents: "none", height: scaledHeight ?? undefined }}
      >
        <div
          ref={previewRef}
          style={
            {
              width: scaledWidth,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              ...PREVIEW_DESIGN_VARS,
              ...siteVars,
            } as any
          }
        >
          <Editor resolver={resolver} enabled={false}>
            <Frame>{previewElement}</Frame>
          </Editor>
        </div>
      </div>
    </PreviewErrorBoundary>
  );
});
