import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React from "react";
import { TbArrowDown, TbLayoutGrid } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";
import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./componentHooks";
import { BaseSelectorProps, applyAriaProps } from "./selectors";
import { useMounted } from "../utils/hooks";

export interface GridProps extends BaseSelectorProps {}

export const Grid: UserComponent<GridProps> = (incomingProps: GridProps) => {
  let props: any = {
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
    isActive,
  } = useNode(node => ({
    id: node.id,
    isActive: node.events.selected,
  }));

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  props = setClonedProps(props, query);
  const isMounted = useMounted();

  useScrollToSelected(id, enabled);

  const gridClassName =
    props.className?.trim() || "grid w-full min-w-0 grid-cols-1 gap-space-md text-base-content";

  let hasChildren = false;
  if (enabled && isMounted) {
    try {
      const node = query.node(id).get();
      hasChildren = (node.data.nodes || []).length > 0;
    } catch {
      hasChildren = false;
    }
  } else if (!enabled) {
    hasChildren = !!props.children;
  }

  const outer: any = {
    ref: (r: HTMLElement | null) => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: gridClassName,
  };

  applyAriaProps(outer, props);
  if (props.id || props.anchor) outer.id = props.id || props.anchor;

  if (enabled) {
    outer["data-border"] = /\bborder(-[^\s])?/.test(props.className || "");
    outer["data-bounding-box"] = enabled;
    outer["data-empty-state"] = !hasChildren;
    if (isMounted) {
      outer["node-id"] = id;
    }
  }

  const { children } = props;

  const content =
    hasChildren || !enabled ? (
      children
    ) : (
      <EditorEmptyLeafHint
        className="col-span-full min-h-[4rem]"
        selected={isActive}
        icon={<TbLayoutGrid aria-hidden />}
        selectedIcon={<TbArrowDown aria-hidden />}
        idleLabel="Empty grid"
        selectedLabel="Drop here or right-click"
        showActionIcons
      />
    );

  outer.children = content;

  return React.createElement(motionIt(props, "div", enabled), {
    ...applyAnimation(outer, props, null, enabled),
  });
};
