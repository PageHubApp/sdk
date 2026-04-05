// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { usePreview, useView } from "../store";
import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";

import React, { useEffect, useRef, useState } from "react";
import { TbContainer } from "react-icons/tb";
import { getMaterialSymbolsUrlFromNodes } from "../utils/data/collectGoogleIcons";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "../utils/defaults";
import { injectDesignSystemVars } from "../utils/design/designSystemVars";
import { useLazyBackground } from "../utils/hooks/useLazyBackground";

import { GoogleFontLoadedAtom, useSetAtomState } from "../utils/atoms";
import { Box } from "@pagehub/ui";
import {
  applyBackgroundImage,
  applyLazyBackgroundImage,
  enableContext,
  getBackgroundUrl,
  isCssValid,
  isJsValid,
} from "../utils/lib";
import { PaletteProvider } from "../utils/design/PaletteContext";
import { EmptyState } from "./EmptyState";
import { RenderGradient, RenderPattern, hasInlay, inlayProps } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface NamedColor {
  name: string;
  color: string;
}

export interface ContainerProps extends BaseSelectorProps {
  activeTab?: number;
  "data-renderer"?: boolean;
  pallet?: NamedColor[];
  typography?: any[];
  styleGuide?: {
    borderRadius?: string;
    buttonPadding?: string;
    containerPadding?: string;
    sectionGap?: string;
    containerGap?: string;
    contentWidth?: string;
    headingFont?: string;
    headingFontFamily?: string;
    bodyFont?: string;
    bodyFontFamily?: string;
    shadowStyle?: string;
    inputBorderWidth?: string;
    inputBorderColor?: string;
    inputBorderRadius?: string;
    inputPadding?: string;
    inputBgColor?: string;
    inputTextColor?: string;
    inputPlaceholderColor?: string;
    inputFocusRing?: string;
    inputFocusRingColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    linkUnderline?: string;
    linkUnderlineOffset?: string;
  };
  header?: string;
  footer?: string;
  pageTitle?: string;
  pageDescription?: string;
  ico?: string;
  icoType?: string;
  icoContent?: string;
  pageMedia?: Array<{
    id: string;
    type: string;
    uploadedAt: number;
    componentId?: string;
  }>;
  savedComponents?: Array<{
    rootNodeId: string;
    nodes: string;
    name: string;
  }>;
  /** Site branding; {{company.*}} in Text */
  company?: {
    name?: string;
    tagline?: string;
    type?: string;
    location?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  /** Editor AI site hints */
  ai?: {
    prompt?: string;
    styleTags?: string[];
  };
  /** GA4, GTM, Search Console verification, Meta Pixel, etc. */
  integrations?: Record<string, Record<string, string>>;
  /** Server-side redirect rules */
  redirects?: Array<{ from: string; to: string; permanent?: boolean }>;
  /** Default structured data for the site */
  jsonLd?: Record<string, unknown>;
}

const defaultProps: ContainerProps = {
  type: "background",
  pallet: DEFAULT_PALETTE,
  typography: [],
  styleGuide: DEFAULT_STYLE_GUIDE,
  backgroundFetchPriority: "low",
  backgroundPlaceholder: "rgba(0, 0, 0, 0.05)",
  pageMedia: [],
  savedComponents: [],
};

export const Background = (props: Partial<ContainerProps>) => {
  props = {
    ...defaultProps,
    ...props,
  };
  const { children } = props;

  const { actions, enabled, query, nodeCount } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    nodeCount: Object.keys(state.nodes).length,
  }));

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const ref = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Lazy loading for background images
  const {
    ref: lazyRef,
    isLoaded,
    backgroundImage,
  } = useLazyBackground(
    props.backgroundImage ? getBackgroundUrl(props, query) : null,
    { enabled: props.backgroundLazy && !enabled } // Only lazy load in preview/published mode
  );

  const view = useView();
  const device = "desktop" as const;
  const preview = usePreview();
  const settings = null;
  const setMenu = (_: any) => { };
  const setGoogleFontLoaded = useSetAtomState(GoogleFontLoadedAtom);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dynamically load optimized Material Symbols font for all Google icons in the tree
  // Only runs in editor mode - static pages load font server-side
  const prevFontUrlRef = useRef<string | null>(null);
  useEffect(() => {
    // Only run in editor mode (not in preview/published)
    if (!enabled) return;

    try {
      const nodes = query.getSerializedNodes();
      const fontUrl = getMaterialSymbolsUrlFromNodes(nodes);

      // Only update if the font URL actually changed
      if (fontUrl && fontUrl !== prevFontUrlRef.current) {
        const fontId = "google-icons";

        // Remove old font if exists (to update when icons change)
        const existingFont = document.getElementById(fontId);
        if (existingFont) {
          existingFont.remove();
        }

        // Add optimized font
        const link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        link.href = fontUrl;

        // Set atom when font is loaded
        link.onload = () => {
          setGoogleFontLoaded(true);
        };

        document.head.appendChild(link);
        prevFontUrlRef.current = fontUrl;
      } else if (!fontUrl && prevFontUrlRef.current) {
        // Remove font if no icons are used anymore
        const existingFont = document.getElementById("google-icons");
        if (existingFont) {
          existingFont.remove();
        }
        setGoogleFontLoaded(false);
        prevFontUrlRef.current = null;
      }
    } catch (error) {
      console.error("Error loading Material Symbols:", error);
    }
  }, [enabled, query, nodeCount, setGoogleFontLoaded]);

  const contexted = e => {
    if (!enabled || !enableContext) return;

    e.preventDefault();
    e.stopPropagation();

    setMenu({
      enabled: true,
      x: e.clientX,
      y: e.clientY,
      position: "inside",
      name: "Background",
      id,
      parent: {
        name: "Background",
        props,
        displayName: "Background",
      },
    });
  };

  const inlayed = hasInlay(props);

  const prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
    },
    className: props.className || "",
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-no-scrollbars"] = view !== "desktop" && device;
    prop["data-renderer"] = enabled;
    prop["data-bounding-box"] = enabled;
    prop.onContextMenu = contexted;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop["main-node"] = "true";
  }
  const validScriptTypes = ["link", "meta", "title", "style", "script"];

  /** Script types the browser executes as JavaScript (not JSON-LD, import maps, etc.). */
  function isExecutableJavaScriptScript(node: Element): boolean {
    const raw = node.getAttribute("type");
    if (raw == null || raw.trim() === "") return true;
    const t = raw.trim().toLowerCase();
    if (t === "module") return true;
    return (
      t === "text/javascript" ||
      t === "application/javascript" ||
      t === "text/ecmascript" ||
      t === "application/ecmascript"
    );
  }

  function copyElementAttributes(from: Element, to: Element) {
    for (let a = 0; a < from.attributes.length; a++) {
      const attr = from.attributes[a];
      to.setAttribute(attr.name, attr.value);
    }
  }

  function addElementsToHead(header, head) {
    const elements = [];

    if (header && typeof window !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(header, "text/html");
      const headElement = doc.head;

      for (let i = 0; i < headElement.childNodes?.length; i++) {
        const node: Element = headElement.childNodes[i] as Element;
        const nodeName = node.nodeName.toLowerCase();

        if (!validScriptTypes.includes(nodeName)) continue;

        if (nodeName === "style") {
          const styleContent = node.textContent.trim();

          if (!isCssValid(styleContent)) {
            console.warn(`Ignoring invalid ${nodeName} element: ${node.textContent}`);
            continue;
          }

          const style = document.createElement("style");
          style.textContent = styleContent;
          elements.push(style);

          try {
            head.appendChild(style);
          } catch (e: any) {
            console.warn(`Failed to append ${nodeName} element: ${e?.message}`);
          }
          continue;
        }

        if (nodeName === "script") {
          if (node.hasAttribute("src")) {
            const script = document.createElement("script");
            copyElementAttributes(node, script);
            if (!script.hasAttribute("async") && !script.hasAttribute("defer")) {
              script.setAttribute("async", "");
            }
            elements.push(script);

            try {
              head.appendChild(script);
            } catch (e: any) {
              console.warn(`Failed to load script src ${script.getAttribute("src")}: ${e?.message}`);
            }
          } else {
            const scriptContent = node.textContent.trim();
            const script = document.createElement("script");

            if (isExecutableJavaScriptScript(node)) {
              const t = (node.getAttribute("type") || "").trim().toLowerCase();
              if (t !== "module" && !isJsValid(scriptContent)) {
                console.warn(`Ignoring invalid ${nodeName} element: ${node.textContent}`);
                continue;
              }
              copyElementAttributes(node, script);
              script.textContent = scriptContent;
            } else {
              copyElementAttributes(node, script);
              script.textContent = scriptContent;
            }

            elements.push(script);

            try {
              head.appendChild(script);
            } catch (e: any) {
              console.warn(`Failed to append ${nodeName} element: ${e?.message}`);
            }
          }
          continue;
        }

        if (nodeName === "link") {
          if (!node.hasAttribute("href") || !node.hasAttribute("rel")) {
            console.warn(`Ignoring invalid ${nodeName} element: missing href or rel`);
            continue;
          }

          const link = document.createElement("link");
          copyElementAttributes(node, link);
          elements.push(link);

          try {
            head.appendChild(link);
          } catch (e: any) {
            console.warn(`Failed to append link ${link.getAttribute("href")}: ${e?.message}`);
          }
        }
      }
    }
    return elements;
  }

  useEffect(() => {
    if (!enabled) return;
    const head = document.getElementsByTagName("head")[0];

    const elements = addElementsToHead(props.header, head);

    return () => {
      elements?.forEach(element => {
        head.removeChild(element);
      });
    };
  }, [props.header, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const head = document.querySelector(".pagehub-sdk-root") || document.body;

    const elements = addElementsToHead(props.footer, head);

    return () => {
      elements?.forEach(element => {
        head.removeChild(element);
      });
    };
  }, [props.footer, enabled]);

  // Inject global link styles into head
  useEffect(() => {
    if (typeof window === "undefined") return;

    const head = document.getElementsByTagName("HEAD")[0];
    const styleId = "pagehub-link-styles";

    // Remove existing style tag if present
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      head.removeChild(existingStyle);
    }

    // Generate and inject new styles if styleGuide exists
    if (props.styleGuide) {
      const resolveLinkColor = (colorValue: string | undefined): string => {
        if (!colorValue) return "inherit";

        // If it's a palette reference, resolve it
        if (colorValue.startsWith("palette:")) {
          const paletteName = colorValue.replace("palette:", "");
          const paletteColor = (props.pallet || []).find(p => p.name === paletteName);
          if (paletteColor) {
            // Recursively resolve in case the palette color is also a reference
            return resolveLinkColor(paletteColor.color);
          }
        }

        // If it's a Tailwind color like "blue-500", convert to CSS
        if (
          colorValue.includes("-") &&
          !colorValue.startsWith("#") &&
          !colorValue.startsWith("rgb")
        ) {
          // Map common Tailwind colors to CSS
          const colorMap: { [key: string]: string } = {
            "blue-500": "#3b82f6",
            "purple-500": "#a855f7",
            "orange-500": "#f97316",
            "gray-500": "#6b7280",
            "gray-900": "#111827",
            "gray-50": "#f9fafb",
            "gray-600": "#4b5563",
            white: "#ffffff",
            black: "#000000",
          };
          return colorMap[colorValue] || colorValue;
        }

        return colorValue;
      };

      // Scope styles to the viewport in edit mode, or globally in preview/published mode
      // Exclude Button components from global link styles
      const selector = enabled
        ? 'main[data-renderer="true"] a:not([class*="no-style"]):not([data-button-link])'
        : 'a:not([class*="no-style"]):not([data-button-link])';

      const linkStyles = `
        ${selector} {
          color: ${resolveLinkColor(props.styleGuide.linkColor)};
          ${props.styleGuide.linkUnderline === "underline" ? "text-decoration: underline;" : props.styleGuide.linkUnderline === "no-underline" ? "text-decoration: none;" : ""};
          ${props.styleGuide.linkUnderlineOffset && props.styleGuide.linkUnderlineOffset !== "underline-offset-auto" ? `text-underline-offset: ${props.styleGuide.linkUnderlineOffset.replace("underline-offset-", "")}px;` : ""};
          transition: color 150ms ease-in-out;
        }
        ${selector}:hover {
          color: ${resolveLinkColor(props.styleGuide.linkHoverColor)};
          ${props.styleGuide.linkUnderline === "hover:underline" ? "text-decoration: underline;" : ""};
        }
      `;

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = linkStyles;
      head.appendChild(style);
    }

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        head.removeChild(styleToRemove);
      }
    };
  }, [props.styleGuide, props.pallet]);


  // Inject design system CSS variables (skip in preview/disabled editors — they scope their own vars)
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    // Always inject/update CSS variables when design system data changes
    // The injectDesignSystemVars function handles removing existing styles
    injectDesignSystemVars({
      palette: props.pallet || DEFAULT_PALETTE,
      typography: props.typography || [],
      styleGuide: props.styleGuide || DEFAULT_STYLE_GUIDE,
    });
  }, [props.pallet, props.typography, props.styleGuide, enabled]);

  prop.children = (
    <PaletteProvider palette={props.pallet || []}>
      <RenderPattern
        props={props}
        settings={settings}
        view={view}
        enabled={enabled}
        properties={inlayProps}
        preview={preview}
        query={query}
      >
        <RenderGradient
          props={props}
          view={view}
          enabled={enabled}
          properties={inlayProps}
          preview={preview}
          query={query}
        >
          {children || <EmptyState icon={<TbContainer />} />}
        </RenderGradient>
      </RenderPattern>
    </PaletteProvider>
  );

  // Note: do NOT force overflow: visible here.
  // Doing so on the <main data-renderer> element breaks mx-auto + max-w centering
  // for all descendant sections. Node controls use position:absolute and work
  // fine without overflow:visible — they escape their parent via position:relative anchors.

  // Apply background image with lazy loading support
  if (props.backgroundLazy && !enabled) {
    // Use lazy loading in preview/published mode
    applyLazyBackgroundImage(prop, props, settings, query, lazyRef);

    // Apply the loaded background image when ready
    if (isLoaded && backgroundImage) {
      prop.style = prop.style || {};
      prop.style.backgroundImage = backgroundImage;
    }
  } else {
    // Use normal immediate loading in editor mode or when lazy loading is disabled
    applyBackgroundImage(prop, props, settings, query);
  }

  applyAnimation(prop, props, null, enabled);

  return React.createElement(Box, { ...prop, as: "main" });
};

Background.craft = {
  displayName: "Background",
  rules: {
    canDrag: () => false,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "Container"),
  },
};
