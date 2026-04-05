// @ts-nocheck
import { motion } from "framer-motion";
import { TbBoxModel2, TbClick, TbLayoutGridAdd, TbPlus, TbPointer } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { ClippyOpenAtom } from "utils/atoms";
import { ComponentsAtom, HeaderMenuAtom, OpenComponentEditorAtom, ViewModeAtom } from "utils/lib";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: (e: React.MouseEvent) => void;
  delay: number;
}

const ActionCard = ({ icon, title, description, onClick, delay }: ActionCardProps) => {
  return (
    <motion.button
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all hover:bg-muted/50"
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex flex-row items-center justify-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <div className="flex flex-col items-start justify-center">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </motion.button>
  );
};

export const EditorEmptyState = () => {
  const viewMode = useAtomValue(ViewModeAtom);
  const components = useAtomValue(ComponentsAtom);
  const setOpenComponentEditor = useSetAtomState(OpenComponentEditorAtom);
  const setHeaderMenu = useSetAtomState(HeaderMenuAtom);
  const setViewMode = useSetAtomState(ViewModeAtom);
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderEmptyAi = config.editorChromeSlots?.renderEmptyStateAiCard;

  const isComponentMode = viewMode === "component";
  const hasComponents = components.length > 0;

  const handleCreateClick = () => {
    // Switch to component mode and open component editor
    setViewMode("component");
    setOpenComponentEditor({
      componentId: null,
      componentName: "New Component",
    });
  };

  const handleComponentsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setHeaderMenu(prev => ({ ...prev, isOpen: true, menuType: "components" }));
  };

  const handleAddSectionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setHeaderMenu(prev => ({ ...prev, isOpen: true, menuType: "sections" }));
  };

  return (
    <div className="scrollbar z-20 flex h-screen w-auto grow basis-full flex-col items-center justify-center gap-8 overflow-auto bg-transparent p-4 pr-2 text-center text-muted-foreground">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="flex size-24 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        {isComponentMode && !hasComponents ? (
          <TbBoxModel2 className="size-12" />
        ) : (
          <TbPointer className="size-12 rotate-90" />
        )}
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.1,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="space-y-3"
      >
        <h2 className="text-xl font-semibold">
          {isComponentMode && !hasComponents ? (
            <>Create your first component</>
          ) : (
            <>Select something to edit</>
          )}
        </h2>

        <div className="flex max-w-md flex-wrap items-center justify-center gap-1 text-sm">
          {isComponentMode ? (
            hasComponents ? (
              <>
                <span>Click on an element to start editing,</span>
                <span>or add components</span>
                <button
                  onClick={handleComponentsClick}
                  className="inline-flex size-5 cursor-pointer items-center justify-center text-foreground transition-colors hover:text-primary"
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
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <ActionCard
                  icon={<TbLayoutGridAdd className="size-6" />}
                  title="Add Sections"
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
      </motion.div>

      {/* Action Button */}
      {!hasComponents && isComponentMode && (
        <motion.button
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          onClick={handleCreateClick}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <TbPlus className="size-5" />
          <span>Create Component</span>
        </motion.button>
      )}

      {/* Helpful Hint */}
      {hasComponents && isComponentMode && (
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="text-xxs mt-4 flex items-center gap-2 text-muted-foreground"
        >
          <TbClick className="size-4" />
          <span>Use the dropdown at the top to select a component</span>
        </motion.div>
      )}
    </div>
  );
};
