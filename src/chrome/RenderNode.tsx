// @ts-nocheck
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

export const ToolboxMenu = atom("menu", {
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
} as any);
