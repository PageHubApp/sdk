import { NamedColor } from "../../components/Background/Background";
import React, { createContext, useContext } from "react";

interface PaletteContextType {
  palette: NamedColor[];
}

const PaletteContext = createContext<PaletteContextType>({ palette: [] });

export function PaletteProvider({
  palette,
  children,
}: {
  palette: NamedColor[];
  children: React.ReactNode;
}) {
  return <PaletteContext.Provider value={{ palette }}>{children}</PaletteContext.Provider>;
}

export const usePalette = () => {
  const context = useContext(PaletteContext);
  return context.palette;
};
