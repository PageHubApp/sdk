import { atom } from "@zedux/react";

export const TbActiveMenuAtom = atom("TbActiveMenuAtom", null);

export const TbActiveItemAtom = atom("TbActiveItemAtom", 0);

export const TbActiveSubItemAtom = atom("TbActiveSubItemAtom", 0);

export const PreviewAtom = atom("preview", false);

export const ViewportScrollAtom = atom("vpscroll", false);

export const MouseInEditor = atom("mousein", false);

export const UnsavedChangesAtom = atom("unsavedchanges", {});

export const ViewAtom = atom("view", "desktop");

export const ToolbarTitleAtom = atom("ttt", "");

export const TabAtom = atom("editorTab", "");

export const DeviceAtom = atom("device", false);

export const DeviceDimensionsAtom = atom("deviceDimensions", { width: 390, height: 844, dpr: 3 });

export const DeviceZoomAtom = atom("deviceZoom", 0.75);

export const EnabledAtom = atom("enabled", true);

export const InitialLoadCompleteAtom = atom("initialLoadComplete", false);
