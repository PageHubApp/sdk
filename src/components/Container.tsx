import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { TbArrowDown, TbContainer, TbNote } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { useIsolate, usePreview, useView } from "../core/store";
import { ViewModeAtom } from "../utils/lib";
import { hasPageIsolation } from "../utils/pageManagement";
import { mergeAccessibilityProps } from "../utils/accessibility";
import { addActionHandlers } from "../utils/clickControls";
import { migrateAction, actionToHref, isHandlerAction, type NodeAction } from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Section, Box } from "@pagehub/ui";
import { applyBackgroundImage, motionIt } from "../utils/lib";

import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";
import { useScrollEffect } from "../utils/hooks/useScrollEffect";
import { useHorizontalDragScroll } from "../utils/hooks/useHorizontalDragScroll";
import { HorizontalOverflowThumbOverlay } from "./primitives/HorizontalOverflowThumbOverlay";
import { RenderPattern, inlayProps } from "./componentHooks";
import { getConnectorData, getClientDataFetcher } from "../utils/design/variables";
import { useStorefrontUrlQuery } from "../utils/StorefrontUrlQueryContext";
import {
  applyStorefrontUrlToDataSource,
  dataSourceBindingId,
  parseStorefrontUrlQuery,
} from "../utils/storefrontDataSource";
import { applyRouteParamsToDataSource } from "../utils/routeParamsDataSource";
import { useRouteParams } from "../utils/RouteParamsContext";
import { ItemProvider, useItemContext } from "../utils/itemContext";
import { applyAttrs } from "../utils/applyAttrs";
import { resolveNestedItems } from "../utils/resolveNestedItems";
import { PAGEHUB_URL_QUERY_CHANGED_EVENT } from "../utils/pagehubEvents";

import { BaseSelectorProps, applyAriaProps } from "./selectors";
export interface ContainerProps extends BaseSelectorProps {
  type: string;
  isHomePage?: boolean;
  is404Page?: boolean;
  anchor?: string;
  tabGroup?: string;
  action?: string | NodeAction;
  method?: string;
  onSubmit?: any;
  target?: any;
  id?: any;
  role?: string;
  "aria-label"?: string;

  open?: boolean;
  actionProp?: NodeAction;
  click?: any; // Legacy — handled by migrateAction()
  scrollEffect?: string;
  scrollDirection?: "ltr" | "rtl";
  scrollSnap?: boolean;
  scrollSpeed?: number;
  scrollSmoothing?: number;
  scrollTimelineRunway?: number;

  /** CSS overflow UX (not GSAP scroll effects): pointer-drag to scroll on published/preview only. */
  overflowDragScroll?: boolean;
  /** Hide native horizontal scrollbar and show auto-hiding thumb. */
  overflowAutoHideScrollbar?: boolean;
  /** When drag scroll is on: map vertical wheel to horizontal scroll. Default true. Ignored when drag is off. */
  overflowWheelScrollsHorizontal?: boolean;
  /** Ms before hiding the custom scrollbar thumb. */
  overflowScrollbarHideDelay?: number;
  /**
   * Drag scroll only: 0 = 1:1 with pointer (default). ~0.12–0.28 = ease toward target each frame
   * (more fluid; too high feels floaty). Does not affect wheel scrolling.
   */
  overflowDragScrollSmoothing?: number;

  /** Bind this container to an external data source for scoped variable resolution + repeating. */
  dataSource?: {
    provider: string;
    collection: string;
    filter?: Record<string, string>;
    ids?: string[];
    sort?: "newest" | "oldest" | "alpha" | "price_asc" | "price_desc";
    offset?: number;
    limit?: number;
    /** Nested repeater: path into parent item (e.g. item.images, item.metadata.sizes). */
    scope?: string;
    /** When scope resolves to a comma-separated string, split for iteration. */
    splitBy?: string;
    /** Skip merging visitor URL query into this binding (SSR/fetch). */
    ignoreUrl?: boolean;
    /**
     * When true, subscribe to URL query changes and re-run the registered client
     * data fetcher (e.g. public connector endpoint). Omit or false for bindings that
     * should only use SSR/hydrated connector data.
     */
    refetchOnUrlChange?: boolean;
    /** Optional stable label for variable paths; included in binding id. */
    bindingKey?: string;
  };
}

function applyDataSourceScope(
  items: any[] | null | undefined,
  ds: { filter?: Record<string, string>; ids?: string[]; sort?: string; offset?: number; limit?: number }
): any[] | null {
  if (!Array.isArray(items)) return null;
  let result = items;
  if (ds.ids?.length) {
    const idSet = new Set(ds.ids);
    result = result.filter(it => idSet.has(it?.id));
  }
  if (ds.filter && Object.keys(ds.filter).length > 0) {
    result = result.filter(it => {
      const md = it?.metadata;
      if (!md) return false;
      return Object.entries(ds.filter!).every(([k, v]) => md[k] === v);
    });
  }
  if (ds.sort) {
    result = [...result];
    switch (ds.sort) {
      case "alpha":
        result.sort((a, b) => String(a?.title ?? "").localeCompare(String(b?.title ?? "")));
        break;
      case "price_asc":
        result.sort((a, b) => (a?.price?.amount ?? 0) - (b?.price?.amount ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b?.price?.amount ?? 0) - (a?.price?.amount ?? 0));
        break;
      case "oldest":
        result.reverse();
        break;
    }
  }
  if (ds.offset && ds.offset > 0) result = result.slice(ds.offset);
  if (ds.limit && ds.limit > 0 && result.length > ds.limit) result = result.slice(0, ds.limit);
  return result;
}

export const Container = (incomingProps: Partial<ContainerProps>) => {
  let props: any = {
    type: "container",
    canDelete: true,
    canEditName: true,
    isHomePage: false,
    backgroundFetchPriority: "low",
    ...incomingProps,
  };

  const view = useView();
  const viewMode = useAtomValue(ViewModeAtom);
  const isolate = useIsolate();
  const preview = usePreview();
  const settings = null;

  const {
    connectors: { connect, drag },
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const storefrontUrlQuery = useStorefrontUrlQuery();
  const routeParams = useRouteParams();

  const { name, id, isHovered, hasChildNodes, isCanvasNode, isActive } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
    isActive: node.events.selected,
    isHovered: node.events.hovered,
    hasChildNodes: node.data.nodes.length > 0,
    isCanvasNode: node.data.isCanvas,
  }));

  props = setClonedProps(props, query, ["order"]);

  const isGsaponHorizontalStrip = props.scrollEffect === "horizontal-scroll";
  const overflowUxActive =
    !!(props.overflowDragScroll || props.overflowAutoHideScrollbar) && !isGsaponHorizontalStrip;

  const dragDisabled = !props.overflowDragScroll || enabled || !overflowUxActive;
  const wheelMaps =
    !!props.overflowDragScroll && props.overflowWheelScrollsHorizontal !== false;

  const rawSmooth = props.overflowDragScrollSmoothing;
  const dragSmooth = (() => {
    const n =
      typeof rawSmooth === "number"
        ? rawSmooth
        : typeof rawSmooth === "string"
          ? parseFloat(rawSmooth)
          : NaN;
    if (Number.isNaN(n)) return 0;
    return Math.min(0.5, Math.max(0, n));
  })();

  const { scrollRef, onDragPointerDown } = useHorizontalDragScroll({
    disabled: dragDisabled,
    verticalWheelScrollsHorizontal: wheelMaps,
    dragScrollSmoothing: dragSmooth,
    deps: [id, props.className, dragSmooth],
  });

  const [overflowScrollEl, setOverflowScrollEl] = useState<HTMLElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detect when something is being dragged over this container
  useEffect(() => {
    if (!ref.current) return;

    const containerRef = ref.current;

    const handleDragOver = (e: DragEvent) => {
      if (e.target === containerRef) {
        setIsDragOver(true);
      } else {
        setIsDragOver(false);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.target === containerRef) {
        setIsDragOver(false);
      }
    };

    const handleDragEnd = () => {
      setIsDragOver(false);
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragend", handleDragEnd);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  const { children } = props;

  const ref = useRef(null);

  let className = typeof props.className === "string" ? props.className : "";

  // Hide component containers from the main viewport
  // Only show them when being actively edited
  if (props.type === "component") {
    let hideReason = null;
    if (!enabled) {
      hideReason = "preview";
      className = `${className} hidden`;
    } else if (viewMode === "page") {
      hideReason = "page-mode";
      className = `${className} hidden`;
    } else if (viewMode === "component" && hasPageIsolation(isolate) && isolate !== id) {
      hideReason = `isolate-mismatch (isolate=${isolate}, id=${id})`;
      className = `${className} hidden`;
    }
  }

  /** Skip dashed empty hint when this canvas already has a background (image, inline style, or Tailwind `bg-*`).
   *  Page containers always show the hint — their `bg-base-100` is the default surface, not decorative. */
  const suppressEmptyCanvasHint =
    props.type !== "page" &&
    (!!props.backgroundImage || !!props.root?.style || /\bbg-/.test(className.trim()));

  // Resolve connector data for repeaters (hoisted so both children and badge can access)
  const ds = props.dataSource;
  const parentItem = useItemContext();
  const connData = getConnectorData();
  const mergedDs =
    ds && !ds.scope
      ? applyStorefrontUrlToDataSource(
          applyRouteParamsToDataSource(ds, routeParams),
          storefrontUrlQuery
        )
      : null;
  const bindingId = mergedDs ? dataSourceBindingId(mergedDs) : null;
  // `scope` → nested repeater: read from parent item, split if needed.
  // Otherwise → top-level repeater: read from connectorData[provider].bindings[id].
  const rawItems: any[] | null = ds
    ? ds.scope
      ? resolveNestedItems(parentItem, ds.scope, ds.splitBy)
      : bindingId
        ? (connData?.[ds.provider]?.bindings?.[bindingId] ?? null)
        : null
    : null;
  const items = ds ? applyDataSourceScope(rawItems, ds) : rawItems;
  const hasItems = Array.isArray(items) && items.length > 0;

  // ── Client-side data source ──────────────────────────────────────────────
  const [clientItems, setClientItems] = useState<any[] | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const wantsUrlClientRefetch = ds?.refetchOnUrlChange === true && !ds?.scope;

  useEffect(() => {
    if (!wantsUrlClientRefetch) return;
    const bump = () => setRefetchKey(k => k + 1);
    window.addEventListener(PAGEHUB_URL_QUERY_CHANGED_EVENT, bump);
    window.addEventListener("popstate", bump);
    return () => {
      window.removeEventListener(PAGEHUB_URL_QUERY_CHANGED_EVENT, bump);
      window.removeEventListener("popstate", bump);
    };
  }, [wantsUrlClientRefetch]);

  useEffect(() => {
    if (!ds || enabled) return;
    if (ds.scope) return;
    if (ds.refetchOnUrlChange !== true) return;
    const fetcher = getClientDataFetcher();
    if (!fetcher) return;

    // Read current URL params for client refetch (search/filter/pagination, etc.).
    let options: Record<string, any> | undefined;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const flat: Record<string, string | string[] | undefined> = {};
      searchParams.forEach((v, k) => {
        flat[k] = v;
      });
      const urlQ = parseStorefrontUrlQuery(flat);
      const mergedForFetch = applyStorefrontUrlToDataSource(
        applyRouteParamsToDataSource(ds, routeParams),
        urlQ
      );
      options = {
        ...(mergedForFetch.query ? { q: mergedForFetch.query } : {}),
        ...(mergedForFetch.category ? { category: mergedForFetch.category } : {}),
        ...(mergedForFetch.sort ? { sort: mergedForFetch.sort } : {}),
        ...(typeof mergedForFetch.page === "number" ? { page: String(mergedForFetch.page) } : {}),
        ...(typeof mergedForFetch.priceMin === "number"
          ? { minPrice: String(mergedForFetch.priceMin) }
          : {}),
        ...(typeof mergedForFetch.priceMax === "number"
          ? { maxPrice: String(mergedForFetch.priceMax) }
          : {}),
        ...(mergedForFetch.slug ? { slug: mergedForFetch.slug } : {}),
        ...(mergedForFetch.filter ? { filter: mergedForFetch.filter } : {}),
        ...(mergedForFetch.limit ? { limit: mergedForFetch.limit } : {}),
      };
    }

    // Only skip when we have SSR items AND no user-driven URL query overriding them.
    const hasQueryOverride =
      options &&
      (options.q ||
        options.category ||
        options.page ||
        options.minPrice ||
        options.maxPrice ||
        options.slug ||
        options.sort ||
        (options.filter && Object.keys(options.filter).length > 0));
    if (hasItems && !hasQueryOverride && refetchKey === 0) return;

    let cancelled = false;
    fetcher(ds.provider, ds.collection, options)
      .then(result => {
        if (!cancelled && Array.isArray(result)) {
          setClientItems(result);
        }
      })
      .catch(err => console.error("[Container] Client data fetch failed:", err));

    return () => {
      cancelled = true;
    };
  }, [
    ds?.provider,
    ds?.collection,
    ds?.refetchOnUrlChange,
    ds?.limit,
    JSON.stringify(ds?.filter ?? null),
    JSON.stringify(routeParams),
    enabled,
    hasItems,
    refetchKey,
  ]);

  const scopedClientItems = ds && clientItems ? applyDataSourceScope(clientItems, ds) : clientItems;
  // clientItems wins when present — fresher URL-driven fetch. Falls back to SSR.
  const resolvedItems = scopedClientItems != null ? scopedClientItems : items;
  const hasResolvedItems = Array.isArray(resolvedItems) && resolvedItems.length > 0;

  if (overflowUxActive) {
    if (!/\boverflow-x-[^\s]+/.test(className)) {
      className = `${className} overflow-x-auto`.trim();
    }
  }

  let prop: any = {
    ref: r => {
      ref.current = r;
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = r;
      setOverflowScrollEl(r);
      connect(drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
    },
    className,
    children: (() => {
      // Data-bound repeater: repeat children for each item from the connected data source
      const shouldRepeat = !enabled && hasResolvedItems && children;

      if (shouldRepeat) {
        return (
          <RenderPattern
            props={props}
            settings={settings}
            view={view}
            enabled={enabled}
            properties={inlayProps}
            preview={preview}
            query={query}
          >
            {resolvedItems.map((item, idx) => (
              <ItemProvider key={item.id || idx} item={item} index={idx}>
                {children}
              </ItemProvider>
            ))}
          </RenderPattern>
        );
      }

      // Editor: show live data preview — template card with first item (editable),
      // plus read-only clones for remaining items (toggleable via props.livePreview)
      const showLivePreview = props.livePreview !== false; // default on
      const editorChildren =
        enabled && hasItems && children ? (
          <>
            <ItemProvider item={items[0]} index={0}>
              {children}
            </ItemProvider>
            {showLivePreview &&
              items.slice(1).map((item, idx) => (
                <div key={item.id || idx + 1} style={{ pointerEvents: "none" }} aria-hidden>
                  <ItemProvider item={item} index={idx + 1}>
                    {children}
                  </ItemProvider>
                </div>
              ))}
          </>
        ) : (
          children
        );

      return (
        <RenderPattern
          props={props}
          settings={settings}
          view={view}
          enabled={enabled}
          properties={inlayProps}
          preview={preview}
          query={query}
        >
          {editorChildren ? (
            editorChildren
          ) : isCanvasNode && !hasChildNodes && enabled && !suppressEmptyCanvasHint ? (
            <EditorEmptyLeafHint
              selected={isActive}
              icon={props.type === "page" ? <TbNote aria-hidden /> : <TbContainer aria-hidden />}
              selectedIcon={<TbArrowDown aria-hidden />}
              idleLabel={
                props.type === "page"
                  ? "Empty page"
                  : props.type === "header"
                    ? "Global header"
                    : props.type === "footer"
                      ? "Global footer"
                      : "Empty container"
              }
              selectedLabel={
                props.type === "page" ? "Drop sections or right-click" : "Drop here or right-click"
              }
              typeLabel={name}
              showActionIcons
            />
          ) : null}
        </RenderPattern>
      );
    })(),
  };

  // Unified action system
  const action = migrateAction(props);
  const resolvedUrl = actionToHref(action, null, undefined);

  if (resolvedUrl) {
    prop.onClick = (e: any) => {
      e.preventDefault();
      if (!enabled) {
        const target =
          action?.type === "link-url" || action?.type === "link-page"
            ? (action as any).target
            : undefined;
        window.open(resolvedUrl, target || "_self");
      }
    };
  }

  if (isHandlerAction(action) || action?.type === "scroll-to") {
    addActionHandlers(prop, action, enabled);
  }

  if (props.type === "form") {
    prop.action = typeof props.action === "string" ? props.action : "";
    prop.method = props.method || "POST";
    prop.onSubmit = props.onSubmit;
    prop.target = props.target || "iframe";
  }

  if (props.scrollEffect) prop["data-scroll-effect"] = props.scrollEffect;
  if (props.id || props.anchor) prop.id = props.id || props.anchor;
  if (props.tabGroup) prop["data-tab-group"] = props.tabGroup;
  if (props.type === "details" && props.open) prop.open = true;
  applyAriaProps(prop, props);

  // Pass through plain string attrs (data-*, role, autocomplete, etc.) so
  // app URL/commerce hooks and other runtime wiring can query the DOM.
  applyAttrs(prop, props.attrs);

  if (enabled) {
    prop["data-border"] = /\bborder(-[^\s])?/.test(props.className || "");

    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = !children;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop["data-enabled"] = true;
    prop["data-node-type"] = props.type;

    // Ensure all sections act as positioning bounds for the absolute AddSectionNodeController
    if (props.type === "section" && !className.includes("relative")) {
      prop.className = (prop.className || "") + " relative";
    }
  }

  // Add drag-over styling to container props (editor only)
  if (enabled) {
    prop["data-dragged-over"] = isDragOver;
  }

  prop = mergeAccessibilityProps(
    {
      ...applyBackgroundImage(prop, props, settings, query),
      ...applyAnimation({ ...prop, key: id }, props, null, enabled),
    },
    props
  );

  let tagName = "div";

  if (props?.type === "page") {
    tagName = "article";
    // Add skip navigation target for accessibility (WCAG 2.4.1)
    if (!prop.id) prop.id = "main-content";
  } else if (props?.type === "section") {
    tagName = "section";
  } else if (props?.type === "header") {
    tagName = "header";
  } else if (props?.type === "footer") {
    tagName = "footer";
  } else if (props?.type === "nav") {
    tagName = "nav";
  } else if (props?.type === "aside") {
    tagName = "aside";
  } else if (props?.type === "main") {
    tagName = "main";
  } else if (props?.type === "form") {
    tagName = "form";
  } else if (props?.type === "details") {
    tagName = "details";
  } else if (props?.type === "summary") {
    tagName = "summary";
  }

  // Note: we intentionally do NOT force overflow:visible here.
  // Doing so broke mx-auto + max-w centering in edit mode because it prevented
  // the layout engine from properly constraining widths. Node controllers
  // use position:absolute and escape bounds via position:relative on the parent
  // (handled by data-bounding-box CSS), so they work fine without this hack.

  // Pick @pagehub/ui component based on type
  let UiComponent: any = Box;
  if (props.type === "section" || props.type === "page") {
    UiComponent = Section;
  }

  // ─── Scroll effects (GSAP ScrollTrigger) ────────────────────────────────
  const hasScrollEffect = !!props.scrollEffect;
  const isHScroll = props.scrollEffect === "horizontal-scroll";
  const sectionRef = useRef<HTMLElement>(null);

  useScrollEffect(sectionRef, {
    effect: props.scrollEffect || "",
    direction: props.scrollDirection,
    snap: props.scrollSnap,
    speed: props.scrollSpeed,
    smoothing: props.scrollSmoothing,
    runway: props.scrollTimelineRunway,
    enabled,
  });

  if (hasScrollEffect) {
    const origRef = prop.ref;
    prop.ref = (r: any) => {
      sectionRef.current = r;
      if (origRef) origRef(r);
    };

    // Horizontal scroll needs wrapper divs; other effects operate directly on the section
    if (isHScroll) {
      prop.className = (prop.className || "") + " relative";
      if (!enabled) {
        prop.children = (
          <div className="ph-hscroll-sticky" style={{ height: "100vh", overflow: "hidden" }}>
            <div
              className="ph-hscroll-track"
              style={{ display: "flex", height: "100%", willChange: "transform" }}
            >
              {prop.children}
            </div>
          </div>
        );
      }
    }
  }

  // ─── CSS overflow UX (horizontal drag + autohide thumb; not GSAP horizontal-scroll) ──
  if (overflowUxActive && props.overflowAutoHideScrollbar) {
    const inner = prop.children;
    prop.children = (
      <>
        <HorizontalOverflowThumbOverlay
          scrollEl={overflowScrollEl}
          hideDelay={props.overflowScrollbarHideDelay ?? 1000}
        />
        {inner}
      </>
    );
    prop.className = `${prop.className || ""} ph-overflow-hide-native-scrollbar`.trim();
    prop.style = {
      ...prop.style,
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    };
  }
  if (overflowUxActive && props.overflowDragScroll && !enabled) {
    prop.onPointerDown = onDragPointerDown;
    prop.className = `${prop.className || ""} cursor-grab`.trim();
    /** Native `<img>` drag steals pointer gestures; block so horizontal drag-scroll works on cards. */
    const prevDragStart = prop.onDragStart;
    prop.onDragStart = (e: React.DragEvent) => {
      const el = e.target as Node | null;
      if (el && (el as Element).nodeName === "IMG") {
        e.preventDefault();
      }
      if (typeof prevDragStart === "function") prevDragStart(e);
    };
  }
  if (overflowUxActive) {
    if (props.overflowDragScroll) {
      prop["data-ph-overflow-drag"] = "";
      if (dragSmooth > 0) {
        prop["data-ph-overflow-smooth"] = String(dragSmooth);
      }
    }
    if (props.overflowAutoHideScrollbar) prop["data-ph-overflow-autohide"] = "";
    if (wheelMaps) prop["data-ph-overflow-wheel"] = "";
    prop["data-ph-overflow-hide-delay"] = String(props.overflowScrollbarHideDelay ?? 1000);
  }

  const container = React.createElement(motionIt(props, UiComponent, enabled), {
    ...prop,
    as: tagName,
  });

  return container;
};

const SECTION_PARENTS = new Set(["page", "component", "header", "footer"]);

const canMoveIn = (nodes, into) => {
  return nodes.every(node => {
    if (node?.data?.props?.type === "form") {
      if (into.data?.props?.type === "form") return false;
    }
    if (node?.data?.props?.type === "page") {
      return into.id === "ROOT";
    }
    // Blocks/sections can only go into pages, components, headers, or footers
    if (node?.data?.props?.type === "section") {
      return SECTION_PARENTS.has(into.data?.props?.type);
    }
    return true;
  });
};

Container.craft = {
  displayName: "Container",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: (node, into) => canMoveIn(node, into),
  },
};
