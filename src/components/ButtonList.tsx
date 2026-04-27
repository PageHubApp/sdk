import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbHandClick } from "react-icons/tb";
import type { NodeAction } from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Box } from "@pagehub/ui";
import { motionIt } from "../utils/lib";

import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./componentHooks";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

type ButtonArrayProp = {
  type?: string;
  text: string;
  icon?: string;
  url?: string;
  onClick?: any;
  background?: string;
  color?: string;
  border?: string;
  iconOnly?: boolean;
  action?: NodeAction;
  click?: any; // Legacy
  root?: {
    background?: string;
    color?: string;
    border?: string;
  };
};

export interface ButtonListProps extends BaseSelectorProps {
  buttons?: ButtonArrayProp[];
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  source?: string;
}

export const ButtonList: UserComponent<ButtonListProps> = (incomingProps: ButtonListProps) => {
  let props: any = {
    buttons: [],
    alignItems: "items-center",
    justifyContent: "justify-start",
    gap: "gap-2",
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { actions, query, enabled } = useEditor(state => getClonedState(props, state));

  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useScrollToSelected(id, enabled);

  const prop: any = {
    ref: r => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: props.className || "",
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const element = motionIt(props, Box, enabled);

  const { children } = props;

  // Source mirroring — read nav links from a source Nav node and render them
  let sourceLinks = null;
  if (props.source) {
    try {
      const sourceNode = query.node(props.source).get();
      const sourceMenu = sourceNode.data.props?.menu;
      const menuId = sourceMenu?.id || "mobile-menu";
      const childIds = sourceNode.data.nodes || [];

      sourceLinks = childIds
        .map(childId => {
          try {
            const childNode = query.node(childId).get();
            if (childNode.data.name !== "Button") return null;
            const actionTarget =
              childNode.data.props?.action?.target || childNode.data.props?.click?.value;
            if (actionTarget === menuId) return null;
            return childNode.data.props;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch (e) {
      sourceLinks = null;
    }
  }

  // Check if there are non-hamburger Button children
  let hasActualButtons = false;
  if (props.source) {
    hasActualButtons = sourceLinks && sourceLinks.length > 0;
  } else if (enabled) {
    try {
      const node = query.node(id).get();
      const childButtons = node.data.nodes || [];

      hasActualButtons = childButtons.some(childId => {
        try {
          const childNode = query.node(childId).get();
          if (childNode.data.name === "Button") {
            const actionTarget =
              childNode.data.props?.action?.target || childNode.data.props?.click?.value;
            const isHamburger = actionTarget?.includes("mobile-menu");
            return !isHamburger;
          }
          return false;
        } catch (e) {
          return false;
        }
      });
    } catch (e) {
      hasActualButtons = !!children;
    }
  } else {
    hasActualButtons = !!children;
  }

  const sourceContent = sourceLinks?.map((linkProps, i) => (
    <a
      key={i}
      href={linkProps.url || "#"}
      className="block w-full px-4 py-3 transition-opacity hover:opacity-75"
      style={{ color: "var(--text)" }}
      onClick={e => {
        if (enabled) e.preventDefault();
      }}
    >
      {linkProps.text || "Link"}
    </a>
  ));

  const content = (
    <>
      {props.source
        ? sourceContent && sourceContent.length > 0
          ? sourceContent
          : enabled && (
              <div className="flex w-auto items-center justify-center p-4">
                <div data-empty-state={true} className="text-3xl">
                  <TbHandClick />
                </div>
              </div>
            )
        : hasActualButtons || !enabled
          ? children
          : enabled && (
              <div className="flex w-auto items-center justify-center p-4">
                <div data-empty-state={true} className="text-3xl">
                  <TbHandClick />
                </div>
              </div>
            )}
    </>
  );

  prop.children = content;

  return React.createElement(element, {
    ...applyAnimation(prop, props, null, enabled),
  });
};

ButtonList.craft = {
  displayName: "Button List",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
  },
};
