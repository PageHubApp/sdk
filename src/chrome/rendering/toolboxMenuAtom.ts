import { atom } from "@zedux/react";

export interface ToolboxMenuInterface {
  enabled?: boolean;
  position: string;
  x: number;
  y: number;
  name: string;
  id: string;
  parent: {
    name: string;
    displayName: string;
    props: any;
  };
}

/** Full default; use when resetting so partial `setMenu({ enabled: false })` does not drop `parent`. */
export const toolboxMenuInitialState = {
  enabled: false,
  position: "after",
  x: 0,
  y: 0,
  name: "",
  components: [],
  id: "",
  parent: {
    name: "",
    displayName: "",
    props: {},
  },
} as const;

export const ToolboxMenu = atom("menu", { ...toolboxMenuInitialState } as any);
