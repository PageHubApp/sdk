import { atom } from "@zedux/react";

export const DesignVarDialogAtom = atom("DesignVarDialogAtom", {
    enabled: false,
    value: "",
    prefix: "",
    propKey: "",
    changed: null,
    e: null,
  },);
