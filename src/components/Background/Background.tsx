import { useEditor, useNode } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { usePreview, useView } from "../../core/store";
import { CSStoObj, applyAnimation } from "../../utils/tailwind/tailwind";

import React, { useEffect, useRef, useState } from "react";
import { TbContainer } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "../../utils/defaults";
import { resolveTheme } from "../../utils/design/resolveTheme";
import { useLazyBackground } from "../../utils/hooks/useLazyBackground";
import { useMounted } from "../../utils/hooks/useMounted";

import { Box } from "@pagehub/ui";
import { applyBackgroundImage, applyLazyBackgroundImage, getBackgroundUrl } from "../../utils/background";
import { PaletteProvider } from "../../utils/design/PaletteContext";
import { RuntimeVarsProvider } from "../../utils/design/RuntimeVarsContext";
import { RenderPattern, inlayProps } from "../../core/componentHooks";
import { BaseSelectorProps, applyAriaProps } from "../selectors";
import { useBackgroundEffects } from "./useBackgroundEffects";
import { InjectedHeadTags, InjectedBodyTags } from "../../chrome/static/runtime/InjectedHeadTags";

/**
 * Bootstrap shim for runtime variables. Defines a queueing setVar synchronously
 * during HTML parse so user inject.head / inject.footer scripts can call
 * window.PageHub.setVar(...) before React hydrates. Provider replaces this with
 * the live setVar and drains the queue post-mount.
 */
const RUNTIME_VARS_BOOTSTRAP =
  "window.PageHub=window.PageHub||{_queue:[],setVar:function(k,v){this._queue.push([k,v])},getVar:function(){}};";

export interface NamedColor {
  name: string;
  color: string;
}

export interface ContainerProps extends BaseSelectorProps {
  activeTab?: number;
  "data-renderer"?: boolean;
  theme?: {
    palette?: NamedColor[];
    darkPalette?: NamedColor[];
    darkModeEnabled?: boolean;
    styleGuide?: Record<string, any>;
    typography?: any[];
  };
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
  /**
   * When true, user established identity (Site Settings save or template start with profile company).
   * AI / MCP must not overwrite `company` without explicit rebrand intent.
   */
  brandingCommitted?: boolean;
  /** GA4, GTM, Search Console verification, Meta Pixel, etc. */
  integrations?: Record<string, Record<string, string>>;
  /** Server-side redirect rules */
  redirects?: Array<{ from: string; to: string; permanent?: boolean }>;
}

export function Background({
  type = "background",
  pageMedia = [],
  savedComponents = [],
  background,
  ...rest
}: Partial<ContainerProps>) {
  let props: any = {
    type,
    pageMedia,
    savedComponents,
    ...rest,
    background: {
      fetchPriority: "low",
      // Theme-aware placeholder: 5% of the current text color so dark themes
      // get a light tint and light themes get a dark tint, instead of always
      // flashing a near-black box.
      placeholder: "color-mix(in oklab, currentColor 5%, transparent)",
      ...(background ?? {}),
    },
  };
  const { children } = props;

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { enabled, query, nodeCount, isActive } = useEditor((state, q) => ({
    enabled: state.options.enabled,
    query: q,
    nodeCount: Object.keys(state.nodes).length,
    isActive: q.getEvent("selected").contains(id),
  }));

  const ref = useRef<HTMLElement | null>(null);
  const isMounted = useMounted();

  // Lazy loading for background images
  const {
    ref: lazyRef,
    isLoaded,
    backgroundImage,
  } = useLazyBackground(props.background?.image ? getBackgroundUrl(props, query) : null, {
    enabled: props.background?.lazy && !enabled,
  });

  const view = useView();
  const device = "desktop" as const;
  const preview = usePreview();
  const settings = null;

  // All side-effects (icon fonts, header/footer injection, link styles, design system vars)
  useBackgroundEffects({ enabled, query, nodeCount, props, nodeId: id });

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
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop["main-node"] = "true";
  }

  const isRoot = id === ROOT_NODE;

  prop.children = (
    <PaletteProvider palette={resolveTheme(props).palette}>
      <RuntimeVarsProvider>
        {isRoot && !enabled ? (
          <script
            key="ph-runtime-vars-bootstrap"
            dangerouslySetInnerHTML={{ __html: RUNTIME_VARS_BOOTSTRAP }}
          />
        ) : null}
        {isRoot && props.inject?.head ? <InjectedHeadTags html={props.inject.head} /> : null}
        <RenderPattern
          props={props}
          settings={settings}
          view={view}
          enabled={enabled}
          properties={inlayProps}
          preview={preview}
          query={query}
        >
          {children ||
            (enabled ? (
              <EditorEmptyLeafHint
                selected={isActive}
                icon={<TbContainer aria-hidden />}
                idleLabel="Empty canvas"
                selectedLabel="Drop here or right-click"
              />
            ) : null)}
        </RenderPattern>
        {isRoot && props.inject?.footer ? <InjectedBodyTags html={props.inject.footer} /> : null}
      </RuntimeVarsProvider>
    </PaletteProvider>
  );

  // Note: do NOT force overflow: visible here.
  // Doing so on the <main data-renderer> element breaks mx-auto + max-w centering
  // for all descendant sections.

  // Apply background image with lazy loading support
  if (props.background?.lazy && !enabled) {
    applyLazyBackgroundImage(prop, props, settings, query, lazyRef);
    if (isLoaded && backgroundImage) {
      prop.style = prop.style || {};
      prop.style.backgroundImage = backgroundImage;
    }
  } else {
    applyBackgroundImage(prop, props, settings, query);
  }

  applyAnimation(prop, props, null, enabled);

  prop["data-ph-site"] = "true";

  return React.createElement(Box, { ...prop, as: "main" });
}

Background.craft = {
  displayName: "Background",
  custom: { hiddenInLayers: true },
  rules: {
    canDrag: () => false,
    canMoveIn: (nodes: any[]) => nodes.every((node: any) => node.data?.name === "Container"),
  },
};
