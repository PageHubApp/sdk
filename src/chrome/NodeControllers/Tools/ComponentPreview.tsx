import { Editor, Element, Frame } from "@craftjs/core";
import React, { useEffect, useMemo } from "react";
import { DEFAULT_STYLE_GUIDE } from "../../../utils/defaults";

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
        <div className="flex h-32 w-full items-center justify-center rounded-lg bg-neutral text-xs text-neutral-content">
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
  "--button-padding-y": DEFAULT_STYLE_GUIDE.buttonPadding.split(" ")[1] || DEFAULT_STYLE_GUIDE.buttonPadding.split(" ")[0],
  "--container-padding": DEFAULT_STYLE_GUIDE.containerPadding,
  "--container-padding-x": DEFAULT_STYLE_GUIDE.containerPadding.split(" ")[1] || DEFAULT_STYLE_GUIDE.containerPadding.split(" ")[0],
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

// Shared registry of modifier @utility rules across all mounted previews.
// Multiple previews render simultaneously — each adds its rules, and we
// rebuild the single <style> tag content from the merged set.
const _modifierRules = new Map<string, string>(); // name → @utility rule
let _modifierStyleEl: HTMLStyleElement | null = null;

function syncModifierStyleTag() {
  if (typeof document === "undefined") return;
  if (_modifierRules.size === 0) {
    _modifierStyleEl?.remove();
    _modifierStyleEl = null;
    return;
  }
  if (!_modifierStyleEl) {
    _modifierStyleEl = document.createElement("style");
    _modifierStyleEl.id = "component-preview-modifier-utilities";
    _modifierStyleEl.setAttribute("type", "text/tailwindcss");
    document.head.appendChild(_modifierStyleEl);
  }
  _modifierStyleEl.textContent = [..._modifierRules.values()].join("\n");
}

interface ComponentPreviewProps {
  component: any;
  scale?: number;
  resolver: any;
  modifiers?: Record<string, { name: string; classes: string }[]>;
}

export const ComponentPreview = React.memo(function ComponentPreview({ component, scale = 0.25, resolver, modifiers }: ComponentPreviewProps) {
  // Register modifier @utility rules into the shared registry
  useEffect(() => {
    if (!modifiers || typeof modifiers !== "object") return;
    const added: string[] = [];
    for (const mods of Object.values(modifiers)) {
      if (!Array.isArray(mods)) continue;
      for (const mod of mods) {
        if (mod.name && mod.classes && !_modifierRules.has(mod.name)) {
          _modifierRules.set(mod.name, `@utility ${mod.name} { @apply ${mod.classes}; }`);
          added.push(mod.name);
        }
      }
    }
    if (added.length) syncModifierStyleTag();
    // No cleanup — rules persist for the session (cheap, avoids flicker on re-mount)
  }, [modifiers]);

  // Read the site's design system vars from #viewport so previews match the user's theme
  const siteVars = useMemo(() => {
    if (typeof document === "undefined") return {};
    const viewport = document.getElementById("viewport");
    if (!viewport) return {};
    const cs = getComputedStyle(viewport);
    const vars: Record<string, string> = {};
    const keys = [
      "primary", "primary-content", "secondary", "secondary-content",
      "accent", "accent-content", "neutral", "neutral-content",
      "base-100", "base-200", "base-300", "base-content",
      "error", "error-content", "info", "info-content",
      "success", "success-content", "warning", "warning-content",
      "radius-box", "radius-field", "border", "depth", "noise",
      "shadow-style", "heading-font-family", "body-font-family",
      "container-padding-x", "container-padding-y", "content-width",
      "section-gap", "container-gap", "spacing-density",
      "space-xs", "space-sm", "space-md", "space-lg", "space-xl",
      "button-padding-x", "button-padding-y",
    ];
    for (const k of keys) {
      const v = cs.getPropertyValue(`--${k}`).trim();
      if (v) vars[`--${k}`] = v;
    }
    return vars;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="overflow-hidden bg-base-100 text-base-content" style={{ zoom: scale, pointerEvents: 'none', ...PREVIEW_DESIGN_VARS, ...siteVars } as any}>
          <Editor resolver={resolver} enabled={false}>
            <Frame>{element}</Frame>
          </Editor>
        </div>
      </PreviewErrorBoundary>
    );
  } catch (error) {
    console.error("Error rendering component preview:", error);
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-base-300 bg-neutral text-neutral-content">
        Failed to render preview
      </div>
    );
  }
});

