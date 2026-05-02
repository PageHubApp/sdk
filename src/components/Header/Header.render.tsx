import { useContainerRenderWalker } from "../Container/Container.render";
import type { ContainerProps } from "../Container/Container.body";

export const HeaderRender = (incomingProps: Partial<ContainerProps>) => {
  return useContainerRenderWalker({ ...incomingProps, type: "header" });
};
