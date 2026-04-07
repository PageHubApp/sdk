import { useEditor, useNode } from "@craftjs/core";
import { usePreview, useView } from "../store";
import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";

import React, { useEffect, useRef, useState } from "react";
import { TbContainer } from "react-icons/tb";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "../utils/defaults";
import { useLazyBackground } from "../utils/hooks/useLazyBackground";

import { Box } from "@pagehub/ui";
import {
  applyBackgroundImage,
  applyLazyBackgroundImage,
  enableContext,
  getBackgroundUrl,
} from "../utils/lib";
import { PaletteProvider } from "../utils/design/PaletteContext";
import { EmptyState } from "./EmptyState";
import { RenderPattern, inlayProps } from "./lib";
import { BaseSelectorProps, applyAriaProps } from "./selectors";
import { useBackgroundEffects } from "./Background/useBackgroundEffects";

export interface NamedColor {
  name: string;
  color: string;
}

export interface ContainerProps extends BaseSelectorProps {
  activeTab?: number;
  "data-renderer"?: boolean;
  pallet?: NamedColor[];
  darkPallet?: NamedColor[];
  darkModeEnabled?: boolean;
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

export function Background({
  type = "background",
  pallet = DEFAULT_PALETTE,
  typography = [],
  styleGuide = DEFAULT_STYLE_GUIDE,
  backgroundFetchPriority = "low",
  backgroundPlaceholder = "rgba(0, 0, 0, 0.05)",
  pageMedia = [],
  savedComponents = [],
  ...rest
}: Partial<ContainerProps>) {
  let props: any = { type, pallet, typography, styleGuide, backgroundFetchPriority, backgroundPlaceholder, pageMedia, savedComponents, ...rest };
  const { children } = props;

  const { enabled, query, nodeCount } = useEditor((state) => ({
    enabled: state.options.enabled,
    nodeCount: Object.keys(state.nodes).length,
  }));

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const ref = useRef<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Lazy loading for background images
  const {
    ref: lazyRef,
    isLoaded,
    backgroundImage,
  } = useLazyBackground(
    props.backgroundImage ? getBackgroundUrl(props, query) : null,
    { enabled: props.backgroundLazy && !enabled },
  );

  const view = useView();
  const device = "desktop" as const;
  const preview = usePreview();
  const settings = null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // All side-effects (icon fonts, header/footer injection, link styles, design system vars)
  useBackgroundEffects({ enabled, query, nodeCount, props });

  const contexted = (e: React.MouseEvent) => {
    if (!enabled || !enableContext) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const prop: Record<string, any> = {
    ref: (r: HTMLElement | null) => {
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
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop["main-node"] = "true";
  }

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
          {children || <EmptyState icon={<TbContainer />} />}
      </RenderPattern>
    </PaletteProvider>
  );

  // Note: do NOT force overflow: visible here.
  // Doing so on the <main data-renderer> element breaks mx-auto + max-w centering
  // for all descendant sections.

  // Apply background image with lazy loading support
  if (props.backgroundLazy && !enabled) {
    applyLazyBackgroundImage(prop, props, settings, query, lazyRef);
    if (isLoaded && backgroundImage) {
      prop.style = prop.style || {};
      prop.style.backgroundImage = backgroundImage;
    }
  } else {
    applyBackgroundImage(prop, props, settings, query);
  }

  applyAnimation(prop, props, null, enabled);

  return React.createElement(Box, { ...prop, as: "main" });
}

Background.craft = {
  displayName: "Background",
  rules: {
    canDrag: () => false,
    canMoveIn: (nodes: any[]) => nodes.every((node: any) => node.data?.name === "Container"),
  },
};
