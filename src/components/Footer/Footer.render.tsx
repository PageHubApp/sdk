import { useContainerRenderWalker } from "../Container/Container.render";
import type { ContainerProps } from "../Container/Container.body";

export const FooterRender = (incomingProps: Partial<ContainerProps>) => {
  return useContainerRenderWalker({ ...incomingProps, type: "footer" });
};
