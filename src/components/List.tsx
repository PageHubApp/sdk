import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbList } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";
import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./componentHooks";
import { BaseSelectorProps, applyAriaProps } from "./selectors";

export type ListMarkerStyle = "bullet" | "check" | "dash" | "icon";

export interface ListMarkerIconProps {
  value?: string;
  size?: string;
}

export interface ListProps extends BaseSelectorProps {
  ordered?: boolean;
  markerStyle?: ListMarkerStyle;
  markerIcon?: ListMarkerIconProps;
}

export const List: UserComponent<ListProps> = (incomingProps: ListProps) => {
  let props: any = {
    ordered: false,
    markerStyle: "check" as ListMarkerStyle,
    markerIcon: { value: "ref-google:check", size: "w-5 h-5" },
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useScrollToSelected(id, enabled);

  const Tag = props.ordered ? "ol" : "ul";

  const prop: any = {
    ref: (r: HTMLElement | null) => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: props.className || "",
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const element = motionIt(props, Tag, enabled);

  let hasListItems = false;
  if (enabled && isMounted) {
    try {
      const node = query.node(id).get();
      hasListItems = (node.data.nodes || []).some((cid: string) => {
        try {
          return query.node(cid).get().data.name === "ListItem";
        } catch {
          return false;
        }
      });
    } catch {
      hasListItems = false;
    }
  } else if (!enabled) {
    hasListItems = !!props.children;
  }

  const { children } = props;

  const content =
    hasListItems || !enabled ? (
      children
    ) : (
      <li className="flex list-none justify-center p-4">
        <div data-empty-state={true} className="text-3xl">
          <TbList aria-hidden />
        </div>
      </li>
    );

  prop.children = content;

  return React.createElement(element, {
    ...applyAnimation(prop, props, null, enabled),
  });
};

List.craft = {
  displayName: "List",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "ListItem"),
  },
};
