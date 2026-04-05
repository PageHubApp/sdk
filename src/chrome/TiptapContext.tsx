// @ts-nocheck
import { Editor } from "@tiptap/react";
import { createContext, ReactNode, useContext } from "react";

interface TiptapContextType {
  editor: Editor | null;
}

const TiptapContext = createContext<TiptapContextType>({ editor: null });

export const TiptapProvider = ({
  children,
  editor,
}: {
  children: ReactNode;
  editor: Editor | null;
}) => {
  return <TiptapContext.Provider value={{ editor }}>{children}</TiptapContext.Provider>;
};

export const useTiptapContext = () => {
  const context = useContext(TiptapContext);
  if (!context) {
    throw new Error("useTiptapContext must be used within a TiptapProvider");
  }
  return context;
};
