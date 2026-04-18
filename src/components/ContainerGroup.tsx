import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbContainer } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { usePreview, useView } from "../core/store";
import { mergeAccessibilityProps } from "../utils/accessibility";
import { Box } from "@pagehub/ui";
import { applyBackgroundImage, motionIt } from "../utils/lib";

import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";
import { RenderPattern, inlayProps } from "./componentHooks";
import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface ContainerGroupProps extends BaseSelectorProps {
  items?: Array<{
    id: string;
    type: string;
    props: any;
    media?: any;
  }>;
  groupSettings?: {
    [type: string]: {
      [settingKey: string]: any;
    };
  };
  backgroundPattern?: any;
  backgroundGradient?: any;
  id?: string;
  role?: string;
  "aria-label"?: string;
}

export const ContainerGroup = (props: ContainerGroupProps) => {
  const { query, actions } = useEditor();
  const { connectors, id } = useNode();
  const { enabled, isActive } = useEditor((state, q) => ({
    enabled: state.options.enabled,
    isActive: q.getEvent("selected").contains(id),
  }));
  const view = useView();
  const preview = usePreview();
  const settings = null;
  const setSettings = (_: any) => {};

  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Group components by type
  const groupedComponents = React.useMemo(() => {
    const groups: { [type: string]: any[] } = {};
    const items = props.items || [];
    items.forEach(item => {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type].push(item);
    });
    return groups;
  }, [props.items]);

  let className = props.className || "";

  let prop: any = {
    ref: r => {
      containerRef.current = r;
      connectors.connect(connectors.drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
    },
    className,
    children: (
      <>
        {/* Render background elements */}
        {props.backgroundPattern && (
          <RenderPattern
            props={props}
            settings={settings}
            view={view}
            enabled={enabled}
            properties={inlayProps}
            preview={preview}
            query={query}
          >
            <></>
          </RenderPattern>
        )}
        {/* Render grouped components */}
        {Object.entries(groupedComponents).map(([type, components]) => (
          <div key={type} className="group-section">
            <h3 className="group-title">
              {type}s ({components.length})
            </h3>
            <div className="group-items">
              {components.map((component, index) => (
                <div key={component.id} className="group-item">
                  {/* Render individual component */}
                  {props.children}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Render children */}
        {props.children}

        {/* Render empty state if no items */}
        {(props.items || []).length === 0 && enabled ? (
          <EditorEmptyLeafHint
            selected={isActive}
            icon={<TbContainer aria-hidden />}
            idleLabel="Empty group"
            selectedLabel="Drop here or right-click"
            showActionIcons
          />
        ) : null}
      </>
    ),
  };

  if (enabled) {
    prop["data-border"] = /\bborder(-[^\s])?/.test(props.className || "");
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = !props.children;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop["data-enabled"] = true;
  }

  if (props.id) prop.id = props.id;
  applyAriaProps(prop, props);

  prop = mergeAccessibilityProps(
    {
      ...applyBackgroundImage(prop, props, settings, query),
      ...applyAnimation({ ...prop, key: id }, props, null, enabled),
    },
    props
  );

  let tagName = "div";

  // Add inline controls as children if in edit mode (skip for pages, after hydration)
  if (enabled && props.type !== "page" && isMounted) {
    prop.style = {
      ...(prop.style || {}),
      overflow: "visible",
    };
    const originalChildren = prop.children;
    prop.children = <>{originalChildren}</>;
  }

  const container = React.createElement(motionIt(props, Box, enabled), { ...prop, as: tagName });

  return container;
};

ContainerGroup.craft = {
  displayName: "Container Group",
  rules: {
    canDrag: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};
