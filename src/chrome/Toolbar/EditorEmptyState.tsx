import { useRef, useState, useEffect } from "react";
import { TbBoxModel2, TbClick, TbLayoutGridAdd, TbPlus, TbPointer } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { ClippyOpenAtom } from "utils/atoms";
import { ComponentsAtom, OpenComponentEditorAtom, ViewModeAtom } from "utils/lib";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { usePanelUrl } from "../../utils/usePanelUrl";

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: (e: React.MouseEvent) => void;
  delay: number;
}

const ActionCard = ({ icon, title, description, onClick, delay }: ActionCardProps) => {
  return (
    <button
      onClick={onClick}
      className="animate-slide-up group relative overflow-hidden rounded-xl border border-base-300 bg-base-200 p-6 text-left hover:bg-neutral/50"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex flex-row items-center justify-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content">
          {icon}
        </div>
        <div className="flex flex-col items-start justify-center">
          <h3 className="font-semibold text-base-content">{title}</h3>
          <p className="text-xs text-neutral-content">{description}</p>
        </div>
      </div>
    </button>
  );
};

export const EditorEmptyState = () => {
  const viewMode = useAtomValue(ViewModeAtom);
  const components = useAtomValue(ComponentsAtom);
  const setOpenComponentEditor = useSetAtomState(OpenComponentEditorAtom);
  const { open: openPanel } = usePanelUrl();
  const setViewMode = useSetAtomState(ViewModeAtom);
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);
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
    <div ref={containerRef} className="scrollbar z-20 flex h-screen w-auto grow basis-full flex-col items-center justify-center gap-8 overflow-auto bg-transparent p-4 pr-2 text-center text-neutral-content">
      {/* Icon */}
      {!isCompact && (
        <div
          className="animate-slide-up flex size-24 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          {isComponentMode && !hasComponents ? (
            <TbBoxModel2 className="size-12" />
          ) : (
            <TbPointer className="size-12 rotate-90" />
          )}
        </div>
      )}

      {/* Title */}
      <div
        className="animate-slide-up space-y-3"
        style={{ animationDelay: "0.1s" }}
      >
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
                  className="inline-flex size-5 cursor-pointer items-center justify-center text-base-content transition-colors hover:text-primary"
                  title="Browse components"
                >
                  <TbPlus className="size-8" />
                </button>
                <span>to build your component.</span>
              </>
            ) : (
              <>
                Get started by creating your first reusable component. Components can be used across
                multiple pages.
              </>
            )
          ) : (
            <div className="w-full space-y-6">
              {!isCompact && (
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-neutral-content">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <ActionCard
                  icon={<TbLayoutGridAdd className="size-6" />}
                  title="Add Blocks"
                  description="Like heros, ctas, cards, and more..."
                  onClick={handleAddSectionClick}
                  delay={0.15}
                />

                <ActionCard
                  icon={<TbPlus className="size-6" />}
                  title="Add Components"
                  description="Like buttons, images, and text..."
                  onClick={handleComponentsClick}
                  delay={0.2}
                />

                <ActionCard
                  icon={<TbBoxModel2 className="size-6" />}
                  title="Create Components"
                  description="Don't repeat yourself..."
                  onClick={handleCreateClick}
                  delay={0.25}
                />

                {isAiEnabled &&
                  renderEmptyAi &&
                  renderEmptyAi({ onOpenAssistant: () => setClippyOpen({}) })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      {!hasComponents && isComponentMode && (
        <button
          onClick={handleCreateClick}
          className="animate-slide-up btn btn-primary gap-2 px-6! py-3! shadow-sm"
          style={{ animationDelay: "0.2s" }}
        >
          <TbPlus className="size-5" />
          <span>Create Component</span>
        </button>
      )}

      {/* Helpful Hint */}
      {hasComponents && isComponentMode && (
        <div
          className="animate-slide-up text-xxs mt-4 flex items-center gap-2 text-neutral-content"
          style={{ animationDelay: "0.2s" }}
        >
          <TbClick className="size-4" />
          <span>Use the dropdown at the top to select a component</span>
        </div>
      )}
    </div>
  );
};
