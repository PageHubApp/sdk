import { useEditor, useNode } from "@craftjs/core";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { TbArrowDown, TbContainer, TbNote } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { useIsolate, usePreview, useView } from "../core/store";
import { ViewModeAtom } from "../utils/lib";
import { registerLiveComponent } from "../utils/componentRegistry";
import { mergeAccessibilityProps } from "../utils/accessibility";
import { addActionHandlers, addCustomHandlers } from "../utils/clickControls";
import {
  migrateAction,
  actionToHref,
  isHandlerAction,
  isAnchorAction,
  type NodeAction,
} from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Section, Box } from "@pagehub/ui";
import { applyBackgroundImage, motionIt } from "../utils/lib";

import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";
import { useScrollEffect } from "../utils/hooks/useScrollEffect";
import { useHorizontalDragScroll } from "../utils/hooks/useHorizontalDragScroll";
import { HorizontalOverflowThumbOverlay } from "./primitives/HorizontalOverflowThumbOverlay";
import { RenderPattern, inlayProps } from "./componentHooks";
import { replaceVariables } from "../utils/design/variables";
import { useRuntimeVarsVersion } from "../utils/design/RuntimeVarsContext";
import { applyShowHideOverride, useShowHideVersion } from "../utils/showHideStore";
import { useItemContext } from "../utils/itemContext";
import { applyAttrs } from "../utils/applyAttrs";

import { BaseSelectorProps, applyAriaProps } from "./selectors";
import type { OverflowProps } from "./types";
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

  /** Pointer-drag scroll UX (not GSAP scroll effects) on published/view/static routes. See {@link OverflowProps}. */
  overflow?: OverflowProps;
}

/**
 * Options for {@link useContainerRender}. Used by the `Data` component to
 * compose its repeater/connector behavior on top of the shared shell without
 * duplicating any layout, scroll, or action code.
 */
export interface ContainerRenderOptions {
  /** Pre-process children before they hit RenderPattern (e.g. Data repeats per item). */
  renderChildren?: (children: React.ReactNode) => React.ReactNode;
  /** Extra DOM attrs merged onto the rendered element (e.g. data-ph-connector-*). */
  extraAttrs?: Record<string, any>;
}

/**
 * Shared render body for `Container` and `Data`. Owns layout, scroll effects,
 * overflow UX, actions, accessibility, and tag selection. Does NOT know about
 * data sources — `Data` supplies a `renderChildren` override and binding attrs
 * via {@link ContainerRenderOptions}.
 */
export function useContainerRender(
  incomingProps: Partial<ContainerProps>,
  opts?: ContainerRenderOptions
) {
  let props: any = {
    type: "container",
    canDelete: true,
    canEditName: true,
    isHomePage: false,
    ...incomingProps,
    background: {
      fetchPriority: "low",
      ...(incomingProps?.background ?? {}),
    },
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
  const router = useRouter();
  const parentItem = useItemContext();
  useRuntimeVarsVersion();
  useShowHideVersion();

  const { name, id, isHovered, hasChildNodes, isCanvasNode, isActive } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
    isActive: node.events.selected,
    isHovered: node.events.hovered,
    hasChildNodes: node.data.nodes.length > 0,
    isCanvasNode: node.data.isCanvas,
  }));

  props = setClonedProps(props, query, ["order"]);

  const isGsaponHorizontalStrip = props.scrollEffect === "horizontal-scroll";
  const overflow: OverflowProps = props.overflow ?? {};
  const overflowUxActive =
    !!(overflow.dragScroll || overflow.autoHide) && !isGsaponHorizontalStrip;

  const dragDisabled = !overflow.dragScroll || enabled || !overflowUxActive;
  const wheelMaps = !!overflow.dragScroll && overflow.wheelHorizontal !== false;

  const rawSmooth = overflow.smoothing;
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

  const ref = useRef(null);

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

  let className = typeof props.className === "string" ? props.className : "";

  // Apply class-based show-hide override. In viewer the action handler writes
  // here when buttons fire; in editor the action-panel "peek" button writes
  // here so authors can see hidden targets (modal backdrops, drawers, etc.)
  // without leaving the trigger's settings panel.
  {
    const showHideTarget =
      (props.attrs && typeof props.attrs.id === "string" ? props.attrs.id : undefined) ||
      (typeof props.id === "string" ? props.id : undefined) ||
      (typeof props.anchor === "string" ? props.anchor : undefined);
    if (showHideTarget) {
      className = applyShowHideOverride(className, showHideTarget);
    }
  }

  // Hide component containers in non-canvas modes. Canvas isolation (hiding
  // non-target components when one is isolated) is handled by setHidden via
  // applyCanvasVisibility — CraftJS RenderNode returns null for hidden nodes,
  // so the className branch isn't needed there.
  if (props.type === "component") {
    if (!enabled || viewMode === "page" || viewMode === "preview") {
      className = `${className} hidden`;
    }
  }

  // The componentCanvas singleton is hidden everywhere except canvas list mode.
  // applyCanvasVisibility hides it via setHidden in non-canvas / isolation
  // modes, but keep the className guard for the brief window between viewMode
  // change and the visibility effect running.
  if (props.type === "componentCanvas") {
    if (!enabled || viewMode !== "canvas") {
      className = `${className} hidden`;
    }
  }

  /** Skip dashed empty hint when this canvas already has a background (image, inline style, or Tailwind `bg-*`).
   *  Page containers always show the hint — their `bg-base-100` is the default surface, not decorative. */
  const suppressEmptyCanvasHint =
    props.type !== "page" &&
    (!!props.background?.image || !!props.root?.style || /\bbg-/.test(className.trim()));

  if (overflowUxActive) {
    if (!/\boverflow-x-[^\s]+/.test(className)) {
      className = `${className} overflow-x-auto`.trim();
    }
  }

  // Resolve final children: Data supplies a wrapper for repeater rendering;
  // Container uses raw children and optional editor hints.
  const resolvedChildren = opts?.renderChildren ? opts.renderChildren(children) : children;

  let prop: any = {
    ref: r => {
      ref.current = r;
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = r;
      setOverflowScrollEl(r);
      if (
        process.env.NODE_ENV === "development" &&
        typeof id === "string" &&
        (id.startsWith("kit_") || id.startsWith("sec_") || id.startsWith("page_"))
      ) {
        // Trace AI-path connectors: if `applyPatch` writes nodes that never
        // reach this ref, `setDOM` never fires → node.dom stays null → drop
        // crash + broken hover on AI-added sections.
        console.log(`[Container.ref] ${r ? "mount" : "unmount"} id=${id}`);
      }
      // Canvas-mode pinning bridge: register every Container DOM in the live
      // registry whenever it mounts/unmounts. Component cards key off
      // type === "component" containers; state cards (Modal panels, Tab panes,
      // show-hide targets) pin descendants by id, so the registry must cover
      // every Container — not just component roots.
      registerLiveComponent(id, r);
      connect(drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
    },
    className,
    ...(props.type === "component" ? { "data-component-container": "true" } : {}),
    ...(props.type === "componentCanvas" ? { "data-component-canvas": "true" } : {}),
    children: (
      <RenderPattern
        props={props}
        settings={settings}
        view={view}
        enabled={enabled}
        properties={inlayProps}
        preview={preview}
        query={query}
      >
        {resolvedChildren ? (
          resolvedChildren
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
                    : name
            }
            selectedLabel={
              props.type === "page" ? "Drop sections or right-click" : "Drop here or right-click"
            }
            typeLabel={name}
            showActionIcons
          />
        ) : null}
      </RenderPattern>
    ),
  };

  // Unified action system
  const action = migrateAction(props);
  const rawUrl = actionToHref(action, query, router?.asPath);
  const resolvedUrl =
    rawUrl && query
      ? (() => {
          try {
            return replaceVariables(rawUrl, query, parentItem);
          } catch {
            return rawUrl;
          }
        })()
      : rawUrl;
  const isLinkActionLocal =
    action?.type === "link" || action?.type === "link-url" || action?.type === "link-page";
  const isInternalLink =
    isLinkActionLocal && typeof resolvedUrl === "string" && resolvedUrl.startsWith("/");
  const linkTarget = isLinkActionLocal ? (action as any).target : undefined;

  if (resolvedUrl && isLinkActionLocal && !enabled) {
    // Real link — href + optional target/rel. tagName is swapped to `<a>` below.
    prop.href = resolvedUrl;
    if (linkTarget) prop.target = linkTarget;
    if (/^https?:\/\//.test(resolvedUrl)) prop.rel = "noopener noreferrer";
    // Internal same-window links → SPA navigation via Next router (matches Link).
    if (isInternalLink && !linkTarget) {
      prop.onClick = (e: any) => {
        // Let modifier-clicks and middle-clicks use native navigation
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
        e.preventDefault();
        router.push(resolvedUrl).catch(() => {});
      };
    }
  } else if (resolvedUrl) {
    // Non-link action with resolved URL (shouldn't really happen) or editor
    // mode — keep the legacy onClick fallback so clicks still do something.
    prop.onClick = (e: any) => {
      e.preventDefault();
      if (!enabled) window.open(resolvedUrl, linkTarget || "_self");
    };
  }

  if (isHandlerAction(action) || isAnchorAction(action)) {
    addActionHandlers(prop, action, enabled);
  }

  if (props.type === "form") {
    prop.action = typeof props.action === "string" ? props.action : "";
    prop.method = props.method || "POST";
    prop.onSubmit = props.onSubmit;
    prop.target = props.target || "iframe";
  }

  // After action + form setup so `handlers.onSubmit` composes with the form
  // submit handler instead of being overwritten by it.
  addCustomHandlers(prop, props.handlers, enabled);

  if (props.scrollEffect) prop["data-scroll-effect"] = props.scrollEffect;
  if (props.id || props.anchor) prop.id = props.id || props.anchor;
  if (props.tabGroup) prop["data-tab-group"] = props.tabGroup;
  if (props.type === "details" && props.open) prop.open = true;

  // Data supplies connector binding attrs here.
  if (opts?.extraAttrs) {
    for (const [k, v] of Object.entries(opts.extraAttrs)) {
      prop[k] = v;
    }
  }

  applyAriaProps(prop, props);

  // Pass through plain string attrs (data-*, role, autocomplete, etc.) so
  // app URL/commerce hooks and other runtime wiring can query the DOM.
  // Interpolate string attrs against repeater item context so blocks can
  // author e.g. `data-ph-zero="{{item.count}}"` on per-item wrappers —
  // parity with Button + FormElement.
  applyAttrs(prop, props.attrs, v =>
    typeof v === "string" ? replaceVariables(v, query, parentItem) : v
  );

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
  } else if (props?.type === "label") {
    // Wrapping label — clicking anywhere inside toggles the first child input
    // (native HTML behavior with no explicit `for` needed).
    tagName = "label";
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
  if (overflowUxActive && overflow.autoHide) {
    const inner = prop.children;
    prop.children = (
      <>
        <HorizontalOverflowThumbOverlay
          scrollEl={overflowScrollEl}
          hideDelay={overflow.hideDelay ?? 1000}
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
  if (overflowUxActive && overflow.dragScroll && !enabled) {
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
    if (overflow.dragScroll) {
      prop["data-ph-overflow-drag"] = "";
      if (dragSmooth > 0) {
        prop["data-ph-overflow-smooth"] = String(dragSmooth);
      }
    }
    if (overflow.autoHide) prop["data-ph-overflow-autohide"] = "";
    if (wheelMaps) prop["data-ph-overflow-wheel"] = "";
    prop["data-ph-overflow-hide-delay"] = String(overflow.hideDelay ?? 1000);
  }

  // If this Container has a link action and would otherwise render as a plain
  // <div>, swap the tag to <a> so the card is a real, right-clickable link.
  // Don't override semantic tags (section/article/header/footer/etc).
  const renderTag =
    resolvedUrl && isLinkActionLocal && !enabled && tagName === "div" ? "a" : tagName;

  return React.createElement(motionIt(props, UiComponent, enabled), {
    ...prop,
    as: renderTag,
  });
}

export const Container = (incomingProps: Partial<ContainerProps>) => {
  return useContainerRender(incomingProps);
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
