import { useAtomState } from "@zedux/react";
import { TbBoxModel2, TbClick, TbLayoutGridAdd, TbPlus } from "react-icons/tb";
import { useSDK } from "../../core/context";
import { useRegistries, SlotRenderer } from "../../registry";
import { AssistantOpenAtom, useSetAtomState } from "../../utils/atoms";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import { ComponentsAtom, ViewModeAtom } from "../../utils/atoms";
import { ActionRow } from "./primitives/ActionRow";

/**
 * Empty-state card — Phase 2 C2f.
 *
 * The card's conditional layout (canvas vs non-canvas vs has-components)
 * stays in JSX — these are intrinsic UX branches, not generic menu
 * rendering. Each CTA dispatches through `sdk.commands.execute` so the
 * palette / keybinding share the same code path. The AI card slot is
 * consumed via `<SlotRenderer id="empty-state/ai-card">` — host renderers
 * contributed through the adapter shim still work unchanged.
 */
export const EditorEmptyState = () => {
  const [components] = useAtomState(ComponentsAtom);
  const [viewMode] = useAtomState(ViewModeAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const { config } = useSDK();
  const { commands } = useRegistries();
  const isAiEnabled = useAiEnabled();

  const isCanvasMode = viewMode === "canvas";
  const hasComponents = components.length > 0;
  const blocksEnabled = config.features?.blocksPanel?.enabled !== false;

  const dispatch = (command: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    void commands.execute(command, undefined, { trigger: "menu" });
  };

  return (
    <div className="scrollbar text-neutral-content z-20 flex min-h-0 w-full flex-1 flex-col overflow-auto bg-transparent p-4 pr-2 pb-2 text-center">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
        {!isCanvasMode && (
          <div className="flex max-w-md flex-wrap items-center justify-center gap-1 text-sm">
            <div className="w-full space-y-6">
              <div className="grid grid-cols-1 gap-1">
                {blocksEnabled && (
                  <ActionRow
                    icon={<TbLayoutGridAdd className="size-6" />}
                    title="Add Blocks"
                    description="Like heroes, CTAs, cards, and more…"
                    onClick={dispatch("ph.editor.openBlocksPanel")}
                  />
                )}

                <ActionRow
                  icon={<TbPlus className="size-6" />}
                  title="Add Components"
                  description="Like buttons, images, and text..."
                  onClick={dispatch("ph.editor.openComponentsPanel")}
                />

                <ActionRow
                  icon={<TbBoxModel2 className="size-6" />}
                  title="Reusable components"
                  description="Save a layout once, drop it on every page…"
                  onClick={dispatch("ph.component.createReusable")}
                />

                {isAiEnabled && (
                  <SlotRenderer
                    id="empty-state/ai-card"
                    ctx={{ onOpenAssistant: () => setAssistantOpen({ revealPanel: true }) }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {isCanvasMode && !hasComponents && (
          <div className="flex w-full max-w-md flex-col gap-1 text-sm">
            <ActionRow
              icon={<TbBoxModel2 className="size-6" />}
              title="New reusable component"
              description="Starts a blank layout you can save and reuse on any page."
              onClick={dispatch("ph.component.createReusable")}
            />
          </div>
        )}

        {isCanvasMode && hasComponents && (
          <div className="flex w-full max-w-md flex-col gap-1 text-sm">
            <ActionRow
              icon={<TbClick className="size-6" />}
              title="Select something to edit"
              description="Pick from the dropdown or click an element on the canvas."
              onClick={dispatch("ph.editor.openComponentsPanel")}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void commands.execute("ph.editor.closeSidebar", undefined, { trigger: "menu" })}
        className="text-neutral-content/50 hover:text-neutral-content/80 shrink-0 border-0 bg-transparent py-2 text-xs transition-colors hover:underline"
      >
        close sidebar
      </button>
    </div>
  );
};
