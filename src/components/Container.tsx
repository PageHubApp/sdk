import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbContainer, TbNote } from "react-icons/tb";
import { useIsolate, usePreview, useView } from "../store";
import { mergeAccessibilityProps } from "../utils/accessibility";
import { addActionHandlers } from "../utils/clickControls";
import { migrateAction, actionToHref, isHandlerAction, type NodeAction } from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Section, Box } from "@pagehub/ui";
import {
  applyBackgroundImage,
  enableContext,
  motionIt
} from "../utils/lib";

import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";
import { EmptyState } from "./EmptyState";
import { RenderGradient, RenderPattern, hasInlay, inlayProps } from "./lib";

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

  actionProp?: NodeAction;
  click?: any; // Legacy — handled by migrateAction()
}

export const Container = (incomingProps: Partial<ContainerProps>) => {
  let props: any = { type: "container", canDelete: true, canEditName: true, isHomePage: false, backgroundFetchPriority: "low", ...incomingProps };

  const view = useView();
  const viewMode = "page";
  const isolate = useIsolate();
  const setMenu = (_: any) => { };
  const preview = usePreview();
  const settings = null;


  const {
    connectors: { connect, drag },
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  const { name, id, isHovered, hasChildNodes, isCanvasNode } = useNode(node => ({
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

  const contexted = e => {
    if (!enabled || !enableContext) return;
    if (!enableContext) {
      const theNode = id ? query.node(id).get() : { data: "no active node" };

      console.info(theNode.data);
    }

    if (!enabled || !enableContext) return;

    e.preventDefault();
    e.stopPropagation();

    setMenu({
      x: e.clientX,
      y: e.clientY,
      enabled: true,
      position: "inside",
      name,
      id,
      parent: {
        name,
        props,
        displayName: name,
      },
    });
  };

  const inlayed = hasInlay(props);

  let className = props.className || "";

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
    else if (viewMode === "component" && isolate && isolate !== id) {
      className = `${className} hidden`;
    }
  }

  let prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
    },
    className,
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
        <RenderGradient
          props={props}
          view={view}
          enabled={enabled}
          properties={inlayProps}
          preview={preview}
          query={query}
        >
          {children ? (
            children
          ) : (isCanvasNode && !hasChildNodes && !props.backgroundImage && !props.backgroundOverlay && !props.root?.style && !/\bbg-/.test(props.className || "")) ? (
            <EmptyState icon={props.type === "page" ? <TbNote /> : <TbContainer />} />
          ) : null}
        </RenderGradient>
      </RenderPattern>
    ),
  };

  // Unified action system
  const action = migrateAction(props);
  const resolvedUrl = actionToHref(action, null, undefined);

  if (resolvedUrl) {
    prop.onClick = (e: any) => {
      e.preventDefault();
      if (!enabled) {
        const target = action?.type === "link-url" || action?.type === "link-page"
          ? (action as any).target : undefined;
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

  if (props.id) prop.id = props.id;
  if (props.tabGroup) prop["data-tab-group"] = props.tabGroup;
  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-border"] = /\bborder(-[^\s])?/.test(props.className || "");

    prop["data-bounding-box"] = enabled;
    prop.onContextMenu = contexted;
    prop.onDoubleClick = contexted;
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

  if (props.anchor) prop.id = props.anchor;

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

  const container = React.createElement(motionIt(props, UiComponent, enabled), { ...prop, as: tagName });

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
