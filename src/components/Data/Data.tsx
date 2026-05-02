import { useEditor } from "@craftjs/core";
import { useContainerRender, type ContainerProps } from "../Container/Container";
import { useDataSource } from "../../utils/data/useDataSource";
import type { DataProps } from "./Data.body";
export type { DataProps };

export const Data = (incomingProps: Partial<DataProps>) => {
  const { enabled } = useEditor(state => ({ enabled: state.options.enabled }));
  const { renderChildren } = useDataSource(incomingProps.dataSource, {
    livePreview: incomingProps.livePreview,
    enabled,
  });
  return useContainerRender(incomingProps as Partial<ContainerProps>, {
    renderChildren,
  });
};

Data.craft = {
  displayName: "Data",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
  },
};
