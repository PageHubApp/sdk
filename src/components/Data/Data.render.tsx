import { useDataSource } from "../../utils/data/useDataSource";
import { useContainerRenderWalker } from "../Container/Container.render";
import type { DataProps } from "./Data.body";

export const DataRender = (incomingProps: Partial<DataProps>) => {
  const { renderChildren } = useDataSource(incomingProps.dataSource, {
    livePreview: incomingProps.livePreview,
    emptyState: incomingProps.emptyState,
  });
  return useContainerRenderWalker(incomingProps, { renderChildren });
};
