import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { TbBoxModel2, TbClick, TbLayoutGridAdd, TbPlus } from "react-icons/tb";
import { useSDK } from "../../core/context";
import { AssistantOpenAtom, useSetAtomState } from "../../utils/atoms";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import {
  ComponentsAtom,
  OpenComponentEditorAtom,
  SideBarOpen,
  ViewModeAtom,
} from "../../utils/lib";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { markManualSidebarClose } from "../hooks/useAutoOpenSidebar";
import { ActionRow } from "./helpers/ActionRow";

export const EditorEmptyState = () => {
  const viewMode = useAtomValue(ViewModeAtom);
  const components = useAtomValue(ComponentsAtom);
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const setOpenComponentEditor = useSetAtomState(OpenComponentEditorAtom);
  const { open: openPanel } = usePanelUrl();
  const setViewMode = useSetAtomState(ViewModeAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const { actions: editorActions } = useEditor();
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderEmptyAi = config.editorChromeSlots?.renderEmptyStateAiCard;

  const isComponentMode = viewMode === "component";
  const hasComponents = components.length > 0;

  const handleCreateClick = () => {
    setViewMode("component");
    setOpenComponentEditor({
      componentId: null,
      componentName: "New Component",
    });
  };

  const handleComponentsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openPanel("components");
  };

  const handleAddSectionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openPanel("blocks");
  };

  return (
    <div className="scrollbar text-neutral-content z-20 flex min-h-0 w-full flex-1 flex-col overflow-auto bg-transparent p-4 pr-2 pb-2 text-center">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
        {!isComponentMode && (
          <div className="flex max-w-md flex-wrap items-center justify-center gap-1 text-sm">
            <div className="w-full space-y-6">
              <div className="grid grid-cols-1 gap-1">
                <ActionRow
                  icon={<TbLayoutGridAdd className="size-6" />}
                  title="Add Blocks"
                  description="Like heroes, CTAs, cards, and more…"
                  onClick={handleAddSectionClick}
                />

                <ActionRow
                  icon={<TbPlus className="size-6" />}
                  title="Add Components"
                  description="Like buttons, images, and text..."
                  onClick={handleComponentsClick}
                />

                <ActionRow
                  icon={<TbBoxModel2 className="size-6" />}
                  title="Reusable components"
                  description="Save a layout once, drop it on every page…"
                  onClick={handleCreateClick}
                />

                {isAiEnabled &&
                  renderEmptyAi &&
                  renderEmptyAi({ onOpenAssistant: () => setAssistantOpen({ revealPanel: true }) })}
              </div>
            </div>
          </div>
        )}

        {isComponentMode && !hasComponents && (
          <div className="flex w-full max-w-md flex-col gap-1 text-sm">
            <ActionRow
              icon={<TbBoxModel2 className="size-6" />}
              title="New reusable component"
              description="Starts a blank layout you can save and reuse on any page."
              onClick={handleCreateClick}
            />
          </div>
        )}

        {isComponentMode && hasComponents && (
          <div className="flex w-full max-w-md flex-col gap-1 text-sm">
            <ActionRow
              icon={<TbClick className="size-6" />}
              title="Select something to edit"
              description="Pick from the dropdown or click an element on the canvas."
              onClick={handleComponentsClick}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          markManualSidebarClose();
          editorActions.clearEvents();
          setSideBarOpen(false);
        }}
        className="text-neutral-content/50 hover:text-neutral-content/80 shrink-0 border-0 bg-transparent py-2 text-xs transition-colors hover:underline"
      >
        close sidebar
      </button>
    </div>
  );
};
