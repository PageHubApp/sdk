import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbArrowDown, TbContainer, TbNote } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { useIsolate, usePreview, useView } from "../core/store";
import { hasPageIsolation } from "../utils/pageManagement";
import { mergeAccessibilityProps } from "../utils/accessibility";
import { addActionHandlers } from "../utils/clickControls";
import { migrateAction, actionToHref, isHandlerAction, type NodeAction } from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Section, Box } from "@pagehub/ui";
import { applyBackgroundImage, motionIt } from "../utils/lib";

import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";
import { useScrollEffect } from "../utils/hooks/useScrollEffect";
import { RenderPattern, inlayProps } from "./componentHooks";
import { getConnectorData } from "../utils/design/variables";
import { ItemProvider } from "../utils/itemContext";

import { BaseSelectorProps, applyAriaProps } from "./selectors";
export interface ContainerProps extends BaseSelectorProps {
  type: string;
  isHomePage?: boolean;
  is404Page?: boolean;
  anchor?: string;
  tabGroup?: string;
  action?: string;
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

  /** Bind this container to an external data source for scoped variable resolution + repeating. */
  dataSource?: {
    provider: string;
    collection: string;
  };
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
  const viewMode = "page";
  const isolate = useIsolate();
  const preview = usePreview();
  const settings = null;

  const {
    connectors: { connect, drag },
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  const { name, id, isHovered, hasChildNodes, isCanvasNode, isActive } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
    isActive: node.events.selected,
    isHovered: node.events.hovered,
    hasChildNodes: node.data.nodes.length > 0,
    isCanvasNode: node.data.isCanvas,
  }));

  props = setClonedProps(props, query, ["order"]);

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
    // Always hide in preview mode (not editing)
    if (!enabled) {
      className = `${className} hidden`;
    }
    // Hide in page mode (only show when editing components)
    else if (viewMode === "page") {
      className = `${className} hidden`;
    }
    // In component mode, only show if this specific component is isolated
    else if (viewMode === "component" && hasPageIsolation(isolate) && isolate !== id) {
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
  const connData = getConnectorData();
  const items = ds && connData ? connData[ds.provider]?.[ds.collection] : null;
  const hasItems = Array.isArray(items) && items.length > 0;

  let prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
    },
    className,
    children: (() => {
      // Data-bound repeater: repeat children for each item from the connected data source
      const shouldRepeat = !enabled && hasItems && children;

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
            {items.map((item, idx) => (
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
      const editorChildren = enabled && hasItems && children
        ? <>
            <ItemProvider item={items[0]} index={0}>{children}</ItemProvider>
            {showLivePreview && items.slice(1).map((item, idx) => (
              <div key={item.id || idx + 1} style={{ pointerEvents: "none" }} aria-hidden>
                <ItemProvider item={item} index={idx + 1}>
                  {children}
                </ItemProvider>
              </div>
            ))}
          </>
        : children;

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
              idleLabel={props.type === "page" ? "Empty page" : "Empty container"}
              selectedLabel={
                props.type === "page"
                  ? "Drop sections or right-click"
                  : "Drop here or right-click"
              }

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
    prop.action = props.action || "";
    prop.method = props.method || "POST";
    prop.onSubmit = props.onSubmit;
    prop.target = props.target || "iframe";
  }

  if (props.scrollEffect) prop["data-scroll-effect"] = props.scrollEffect;
  if (props.id || props.anchor) prop.id = props.id || props.anchor;
  if (props.tabGroup) prop["data-tab-group"] = props.tabGroup;
  if (props.type === "details" && props.open) prop.open = true;
  applyAriaProps(prop, props);

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
