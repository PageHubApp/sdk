import { useEditor, useNode, UserComponent } from "@craftjs/core";
import { useMemo } from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useResolvedIcon } from "../../utils/icons/iconResolver";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import { useScrollToSelected } from "../../core/componentHooks";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/RenderCtx";

import { renderIconBody, type IconProps } from "./Icon.body";
export { renderIconBody, type IconProps };

export const Icon: UserComponent<IconProps> = (incomingProps: IconProps) => {
  let props: any = { canDelete: true, canEditName: true, ...incomingProps };
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
  useScrollToSelected(id, enabled);
  const { rootProps, pageMedia, pageIndex } = useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  const iconElement = useResolvedIcon(props.value, pageMedia);

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "Icon",
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex,
  };
  return renderIconBody(props, ctx, iconElement);
};

Icon.craft = {
  displayName: "Icon",
  rules: {
    canDrag: () => true,
  },
};
