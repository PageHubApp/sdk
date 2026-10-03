import { useContainerRenderWalker } from "../Container/Container.render";
import type { ContainerProps } from "../Container/Container.body";
import { headerSlotProps } from "./headerSlot";

export const HeaderRender = (incomingProps: Partial<ContainerProps>) => {
  return useContainerRenderWalker(headerSlotProps({ ...incomingProps, type: "header" }));
};
