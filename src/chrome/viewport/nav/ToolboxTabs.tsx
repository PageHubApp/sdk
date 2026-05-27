import { useMemo } from "react";
import { useSDK } from "../../../core/context";
import { useMenuItems, useRegistries, SlotRenderer } from "../../../registry";
import { SidebarTabsPane } from "../../primitives/SidebarTabsPane";
import { useAiEnabled } from "../../../utils/hooks/useAiEnabled";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { ComponentSettings } from "../modals/ComponentSettings";
import { SectionsSettings } from "../modals/SectionsSettings";

/**
 * Sidebar tab strip — Phase 2 C2e.
 *
 * The two pills come from the `sidebar/tabs` menu location (Components +
 * Blocks). Each menu item's command id encodes its target panel; we map
 * them to (id, label, content) tuples for SidebarTabsPane. The trailing
 * AI button is contributed via the `toolbox/ai-button` slot — rendered
 * here through `<SlotRenderer>`.
 *
 * When `features.blocksPanel.enabled === false` the Blocks command's own
 * `when` predicate filters it out — `useMenuItems` then returns a
 * single-item list, and we collapse the tabs entirely and render the
 * ComponentSettings panel directly (matches legacy behavior).
 */
const COMMAND_TO_TAB: Record<string, { id: "components" | "blocks"; label: string; content: React.ReactNode }> = {
  "ph.editor.openComponentsPanel": {
    id: "components",
    label: "Components",
    content: <ComponentSettings />,
  },
  "ph.editor.openBlocksPanel": {
    id: "blocks",
    label: "Blocks",
    content: <SectionsSettings />,
  },
};

export const ToolboxTabs = () => {
  const { config } = useSDK();
  const { commands } = useRegistries();
  const items = useMenuItems("sidebar/tabs");
  const { panel } = usePanelUrl();
  const isAiEnabled = useAiEnabled();

  const tabs = useMemo(
    () =>
      items
        .map(item => COMMAND_TO_TAB[item.command])
        .filter((t): t is { id: "components" | "blocks"; label: string; content: React.ReactNode } => Boolean(t)),
    [items]
  );

  const blocksEnabled = config.features?.blocksPanel?.enabled !== false;
  const currentTab: "components" | "blocks" =
    panel === "blocks" && blocksEnabled ? "blocks" : "components";

  // When the menu surface yields only one (or zero) tabs — e.g. blocks
  // disabled by config — drop the tab nav and render the components panel
  // directly. Reclaims a row of header space and keeps the chrome honest.
  if (tabs.length <= 1) {
    return <ComponentSettings />;
  }

  return (
    <SidebarTabsPane
      ariaLabel="Content tabs"
      value={currentTab}
      onValueChange={id => {
        // Re-dispatch through the registry so palette/keybinding fire the
        // same code path. The corresponding command id matches the tab id.
        const commandId =
          id === "blocks" ? "ph.editor.openBlocksPanel" : "ph.editor.openComponentsPanel";
        void commands.execute(commandId, undefined, { trigger: "menu" });
      }}
      trailing={isAiEnabled ? <SlotRenderer id="toolbox/ai-button" /> : null}
      tabs={tabs}
    />
  );
};
