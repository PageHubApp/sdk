import { NamedColor } from "../../components/Background";
import React, { createContext, useContext } from "react";

interface PaletteContextType {
  palette: NamedColor[];
}

const PaletteContext = createContext<PaletteContextType>({ palette: [] });

export const PaletteProvider: React.FC<{
  palette: NamedColor[];
  children: React.ReactNode;
}> = ({ palette, children }) => {
  return <PaletteContext.Provider value={{ palette }}>{children}</PaletteContext.Provider>;
};

export const usePalette = () => {
  const context = useContext(PaletteContext);
  return context.palette;
};
