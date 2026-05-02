import { useEditor, useNode, UserComponent } from "@craftjs/core";
import { useMemo } from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useShowHideVersion } from "../../utils/state/showHideStore";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import { useScrollToSelected } from "../../core/componentHooks";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/RenderCtx";

import { renderButtonBody, defaultIcon, type ButtonProps } from "./Button.body";
export { renderButtonBody, defaultIcon, type ButtonProps };

export const Button: UserComponent<ButtonProps> = (incomingProps: ButtonProps) => {
  let icon: any = incomingProps.icon;
  if (typeof icon === "string") {
    icon = {
      value: icon,
      position: (incomingProps as any).iconPosition || defaultIcon.position,
      size: (incomingProps as any).iconSize || defaultIcon.size,
      color: (incomingProps as any).iconColor,
      gap: (incomingProps as any).iconGap || defaultIcon.gap,
      shadow: (incomingProps as any).iconShadow,
      only: (incomingProps as any).iconOnly,
    };
  }
  let props: any = {
    canDelete: true, canEditName: true,
    text: "Button", type: "button",
    ...incomingProps,
    icon: { ...defaultIcon, ...icon },
  };
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));
  props = setClonedProps(props, query);
  const isMounted = useMounted();
  const { rootProps, pageMedia, pageIndex } = useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  useScrollToSelected(id, enabled);
  useShowHideVersion();

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "Button",
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex,
  };
  return renderButtonBody(props, ctx);
};

Button.craft = {
  displayName: "Button",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
  },
};
