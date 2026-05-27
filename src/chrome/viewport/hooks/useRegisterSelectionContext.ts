/**
 * Push a derived `CommandContext.selection` / `parent` / `clipboard` /
 * sibling-move snapshot into the command registry whenever the live Craft
 * selection / atoms change. Single subscription point so the right-click
 * menu, palette, breadcrumb, and future selection chip all read the same
 * predicates.
 */
import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useEffect } from "react";
import { ComponentsAtom, IsolateAtom, SettingsAtom } from "../../../utils/atoms";
import { useRegistries } from "../../../registry";
import { deriveSelectionContext } from "../../../registry/selectionContext";
import { hasPageIsolation } from "../../../utils/page/pageManagement";

export function useRegisterSelectionContext(): void {
  const { selectedId, query } = useEditor((state, q) => ({
    selectedId: q.getEvent("selected").first() ?? null,
    // Track the events tick so editor mutations (e.g. delete/move) refresh
    // derived predicates even when the selection id is unchanged.
    eventsCount: Object.keys(state.events.selected ?? {}).length,
  }));
  const components = useAtomValue(ComponentsAtom);
  const isolate = useAtomValue(IsolateAtom);
  const settings = useAtomValue(SettingsAtom);
  const { context: commandContext } = useRegistries();

  useEffect(() => {
    const derived = deriveSelectionContext(query, selectedId, {
      components: components as Array<{ rootNodeId?: string }>,
      pageIsolation: isolate as string | null,
    });
    commandContext.setCommandContext({
      selection: derived.selection,
      parent: derived.parent,
      clipboard: derived.clipboard,
    });
    // Host-set keys for fields not in the canonical CommandContext shape.
    commandContext.set("siblingMove.canMoveUp", derived["siblingMove.canMoveUp"]);
    commandContext.set("siblingMove.canMoveDown", derived["siblingMove.canMoveDown"]);
    commandContext.set("canMakeSavedComponent", derived.canMakeSavedComponent);
    commandContext.set("hasPageIsolation", hasPageIsolation(isolate as string));
    commandContext.set("pageIsolation", isolate);
    // settings is needed for unifiedDeleteNode (media cleanup); piggyback
    // here so node delete reads the latest value via getAtomExternal.
    void settings;
  }, [
    query,
    selectedId,
    components,
    isolate,
    settings,
    commandContext,
  ]);
}
