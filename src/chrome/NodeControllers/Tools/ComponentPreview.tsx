// @ts-nocheck
import { Editor, Element, Frame } from "@craftjs/core";
import React from "react";

export const buildElementFromStructure = (structure: any, resolver: any, key?: string, isRoot: boolean = true): any => {
  // Guard against incomplete partial JSON structures
  if (!structure || !structure.type || !structure.props) return null;

  // Resolve from globalThis-locked resolver — safe across Next.js Fast Refresh
  const Component = resolver ? resolver[structure.type] : null;
  if (!Component) {
    return null;
  }

  // Check if this is an empty Image (no videoId and no content)
  if (structure.type === "Image") {
    const isEmpty = !structure.props.videoId && !structure.props.content;
    if (isEmpty) {
      structure = {
        ...structure,
        props: {
          ...structure.props,
          content: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="800" height="600" fill="%23e5e7eb"/%3E%3C/svg%3E',
        },
      };
    }

    // Cap image heights in preview
    structure = {
      ...structure,
      props: {
        ...structure.props,
        className: `${structure.props.className || ""} max-h-32`.trim(),
      },
    };
  }

  const uniqueKey = key || "preview-root";

  // Filter out incomplete children from partial JSON
  const children = structure.children
    ?.map((child: any, index: number) =>
      buildElementFromStructure(child, resolver, `${uniqueKey}-${index}`, false)
    )
    .filter(Boolean);

  // Only strip vertical padding from the root container to keep the preview compact.
  // Leave child node padding intact so inner content spacing looks correct.
  let cleanedClassName = structure.props.className;
  if (typeof cleanedClassName !== 'string') cleanedClassName = '';
  if (cleanedClassName && isRoot) {
    cleanedClassName = cleanedClassName
      .replace(/py-\d+/g, 'py-2')
      .replace(/pt-\d+/g, '')
      .replace(/pb-\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const propsWithDefaults = {
    ...structure.props,
    canDelete: true,
    ...(isRoot && cleanedClassName ? { className: cleanedClassName } : {}),
  };

  return (
    <Element key={uniqueKey} canvas is={Component} {...propsWithDefaults}>
      {children}
    </Element>
  );
};

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
        <div className="flex h-32 w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
          Preview unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

interface ComponentPreviewProps {
  component: any;
  scale?: number;
  resolver: any;
}

export const ComponentPreview = React.memo(function ComponentPreview({ component, scale = 0.25, resolver }: ComponentPreviewProps) {
  if (!component) return null;

  try {
    // String replace on the entire JSON structure to remove problematic classes
    const jsonString = JSON.stringify(component);
    if (!jsonString || typeof jsonString !== "string") {
      throw new Error("Component is not serializable");
    }

    const cleanedComponent = JSON.parse(
      jsonString
        .replace(/min-h-screen/g, '')
        .replace(/min-h-full/g, '')
    );

    const element = buildElementFromStructure(cleanedComponent, resolver);

    return (
      <PreviewErrorBoundary>
        <div className="overflow-hidden bg-(--background) text-(--text)" style={{ zoom: '0.5', pointerEvents: 'none' }}>
          <Editor resolver={resolver} enabled={false}>
            <Frame>{element}</Frame>
          </Editor>
        </div>
      </PreviewErrorBoundary>
    );
  } catch (error) {
    console.error("Error rendering component preview:", error);
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        Failed to render preview
      </div>
    );
  }
});

export default ComponentPreview;
