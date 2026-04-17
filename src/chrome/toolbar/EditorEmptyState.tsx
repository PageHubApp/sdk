import { useRef, useState, useEffect } from "react";
import { TbBoxModel2, TbClick, TbLayoutGridAdd, TbPlus, TbPointer } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { AssistantOpenAtom } from "../../utils/atoms";
import { ComponentsAtom, OpenComponentEditorAtom, SideBarOpen, ViewModeAtom } from "../../utils/lib";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import { useSDK } from "../../core/context";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { ActionRow } from "./helpers/ActionRow";

export const EditorEmptyState = () => {
  const viewMode = useAtomValue(ViewModeAtom);
  const components = useAtomValue(ComponentsAtom);
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const setOpenComponentEditor = useSetAtomState(OpenComponentEditorAtom);
  const { open: openPanel } = usePanelUrl();
  const setViewMode = useSetAtomState(ViewModeAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderEmptyAi = config.editorChromeSlots?.renderEmptyStateAiCard;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setIsCompact(entry.contentRect.height < 700);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    <div
      ref={containerRef}
      className="scrollbar text-neutral-content z-20 flex min-h-0 w-full flex-1 flex-col overflow-auto bg-transparent p-4 pr-2 pb-2 text-center"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
        {/* Icon */}
        {!isCompact && (
          <div className="bg-primary/10 text-primary flex size-24 items-center justify-center rounded-2xl">
            {isComponentMode && !hasComponents ? (
              <TbBoxModel2 className="size-12" />
            ) : (
              <TbPointer className="size-12 rotate-90" />
            )}
          </div>
        )}

        {/* Title */}
        <div className="space-y-3">
          {!isCompact && (
            <h2 className="text-xl font-semibold">
              {isComponentMode && !hasComponents ? (
                <>Create your first component</>
              ) : (
                <>Select something to edit</>
              )}
            </h2>
          )}

          <div className="flex max-w-md flex-wrap items-center justify-center gap-1 text-sm">
            {isComponentMode ? (
              hasComponents ? (
                <>
                  <span>Click on an element to start editing,</span>
                  <span>or add components</span>
                  <button
                    onClick={handleComponentsClick}
                    className="text-base-content hover:text-primary inline-flex size-5 cursor-pointer items-center justify-center transition-colors"
                    title="Browse components"
                  >
                    <TbPlus className="size-8" />
                  </button>
                  <span>to build your component.</span>
                </>
              ) : (
                <>
                  Get started by creating your first reusable component. Components can be used
                  across multiple pages.
                </>
              )
            ) : (
              <div className="w-full space-y-6">
                {!isCompact && (
                  <div className="flex items-center gap-4">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-neutral-content text-xs font-medium">or</span>
                    <div className="bg-border h-px flex-1" />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-1">
                  <ActionRow
                    icon={<TbLayoutGridAdd className="size-6" />}
                    title="Add Blocks"
                    description="Like heros, ctas, cards, and more..."
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
                    title="Create Components"
                    description="Don't repeat yourself..."
                    onClick={handleCreateClick}
                  />

                  {isAiEnabled &&
                    renderEmptyAi &&
                    renderEmptyAi({ onOpenAssistant: () => setAssistantOpen({}) })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {!hasComponents && isComponentMode && (
          <button
            type="button"
            onClick={handleCreateClick}
            className="btn btn-primary gap-2 px-6! py-3! shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99]"
          >
            <TbPlus className="size-5" />
            <span>Create Component</span>
          </button>
        )}

        {/* Helpful Hint */}
        {hasComponents && isComponentMode && (
          <div className="text-xxs text-neutral-content mt-4 flex items-center gap-2">
            <TbClick className="size-4" />
            <span>Use the dropdown at the top to select a component</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSideBarOpen(false)}
        className="text-neutral-content/50 hover:text-neutral-content/80 shrink-0 border-0 bg-transparent py-2 text-xs transition-colors hover:underline"
      >
        close sidebar
      </button>
    </div>
  );
};
