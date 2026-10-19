/**
 * Every effect the editor needs exactly once, whatever layout the host draws:
 * component sync, sidebar auto-open, selection / Tiptap / undo-redo / menu
 * context for the command registry, dark mode, the components dropdown feed,
 * the initial page load + page-switch wiring, and the unsaved-changes warning.
 *
 * Mounted by `EditorServices`, never by a visible piece, so hiding or moving
 * the canvas, sidebar or header can't switch any of it off.
 *
 * Returns the unsaved-changes dialog; the caller renders it.
 */
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useEffect } from "react";
import type React from "react";
import { useSDK } from "../../core/context";
import { useRegistries } from "../../registry/provider";
import {
  DarkModeAtom,
  IsolateAtom,
  ShowGridLinesAtom,
  ShowHiddenAtom,
  SideBarAtom,
  SidebarLayersPanelAtom,
  ViewModeAtom,
  useSetAtomState,
} from "../../utils/atoms";
import { CanvasIsolateAtom } from "../../utils/component/componentIsolation";
import { useAutoOpenSidebar } from "../hooks/useAutoOpenSidebar";
import { useComponentSync } from "../hooks/useComponentSync";
import { useShowOnLoadAutoReveal } from "../hooks/useShowOnLoadAutoReveal";
import { useRegisterTiptapContext } from "../inline-tools/useRegisterTiptapContext";
import { useRegisterSelectionContext } from "../viewport/hooks/useRegisterSelectionContext";
import { useInitialPageNavigation } from "../viewport/Viewport/hooks/useInitialPageNavigation";
import { useUnsavedChangesWarning } from "../viewport/Viewport/hooks/useUnsavedChangesWarning";
import { useViewportSetupEffects } from "../viewport/Viewport/hooks/useViewportSetupEffects";
import { useDarkMode } from "../viewport/ViewportTopBar/useDarkMode";
import { useTopBarComponents } from "../viewport/ViewportTopBar/useTopBarComponents";
import {
  PageLoadAtom,
  PreviewAtom,
  ShowBreakpointMarkersAtom,
  ShowDeviceGuidesAtom,
  UnsavedChangesAtom,
} from "../viewport/state/atoms";

export function useEditorWideEffects(): React.ReactNode {
  const { query, actions } = useEditor();
  const { enabled, canUndo, canRedo, componentFingerprint, editorPageIdsKey } = useEditor(
    (state, q) => {
      const root = state.nodes[ROOT_NODE];
      const rootChildren: string[] = root?.data?.nodes ?? [];
      return {
        enabled: state.options.enabled,
        canUndo: q.history.canUndo(),
        canRedo: q.history.canRedo(),
        componentFingerprint: rootChildren
          .filter(id => state.nodes[id]?.data?.props?.type === "component")
          .map(id => {
            const cid = state.nodes[id]?.data?.nodes?.[0];
            return `${id}:${cid ? (state.nodes[cid]?.data?.nodes?.length ?? 0) : 0}`;
          })
          .join(","),
        editorPageIdsKey: rootChildren
          .filter(id => state.nodes[id]?.data?.props?.type === "page")
          .join(","),
      };
    }
  );
  const { config } = useSDK();
  const { context: commandContext } = useRegistries();

  useComponentSync();
  useAutoOpenSidebar();
  useShowOnLoadAutoReveal();
  // The registry's doc-level dispatcher owns every canvas chord; these feed
  // its selection and Tiptap predicates.
  useRegisterSelectionContext();
  useRegisterTiptapContext();
  useViewportSetupEffects();
  useTopBarComponents({ query, enabled, componentFingerprint });
  // Hydrates DarkModeAtom from storage / system preference and mirrors it to <html>.
  useDarkMode();

  // History / mode / view mode for `when` / `enablement` predicates (undo
  // enables only when `canUndo`, preview-only commands, and so on).
  const preview = useAtomValue(PreviewAtom);
  const viewMode = useAtomValue(ViewModeAtom);
  useEffect(() => {
    commandContext.setCommandContext({
      canUndo,
      canRedo,
      mode: preview ? "preview" : "editor",
      viewMode: viewMode === "canvas" ? "canvas" : "page",
    });
  }, [commandContext, canUndo, canRedo, preview, viewMode]);

  // Back on the page editor, no component stays isolated. The board resets
  // this on its own unmount; without the board (`features.componentBoard:
  // false`) nothing else would.
  const setCanvasIsolate = useSetAtomState(CanvasIsolateAtom);
  useEffect(() => {
    if (viewMode === "page") setCanvasIsolate(null);
  }, [viewMode, setCanvasIsolate]);

  // Inputs to the menu items' dynamic titles ("Hide Layers Panel" vs "Dock
  // Layers Panel", the dark-mode toggle, …), read by `titleOverride` via ctx[key].
  const showGridLines = useAtomValue(ShowGridLinesAtom);
  const showBreakpointMarkers = useAtomValue(ShowBreakpointMarkersAtom);
  const showDeviceGuides = useAtomValue(ShowDeviceGuidesAtom);
  const showHidden = useAtomValue(ShowHiddenAtom);
  const sidebarLayersOpen = useAtomValue(SidebarLayersPanelAtom);
  const sideBarLeft = useAtomValue(SideBarAtom);
  const editorDarkMode = useAtomValue(DarkModeAtom);
  useEffect(() => {
    commandContext.setCommandContext({
      showGridLines,
      showBreakpointMarkers,
      showDeviceGuides,
      showHidden,
      sidebarLayersOpen,
      sideBarLeft,
      editorDarkMode,
    } as never);
  }, [
    commandContext,
    showGridLines,
    showBreakpointMarkers,
    showDeviceGuides,
    showHidden,
    sidebarLayersOpen,
    sideBarLeft,
    editorDarkMode,
  ]);

  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const setPageLoad = useSetAtomState(PageLoadAtom);
  useInitialPageNavigation({
    query,
    actions,
    editorPageIdsKey,
    isolate,
    setIsolate,
    config,
    setPageLoad,
  });

  const [unsavedChanges] = useAtomState(UnsavedChangesAtom);
  return useUnsavedChangesWarning(unsavedChanges as unknown as string | null);
}
