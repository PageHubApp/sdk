import { createContext, useContext } from "react";
import type { ResolvedComponentDef } from "./types";

export const CustomComponentsContext = createContext<{
  toolboxCategories: Array<{ title: string; content: ResolvedComponentDef[] }>;
}>({ toolboxCategories: [] });

export const useCustomComponents = () => useContext(CustomComponentsContext);
