import { createContext, useContext } from "react";

export interface PropertyContextValue {
  nodeId: string;
  propId: string;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export const PropertyContextProvider = PropertyContext.Provider;

export function useProperty(): PropertyContextValue | null {
  return useContext(PropertyContext);
}
