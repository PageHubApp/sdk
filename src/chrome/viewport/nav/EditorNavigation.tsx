/**
 * Editor navigation drawer — Phase 2 C2b (command-registry migration).
 *
 * Thin renderer: the four `panel === "menu"` sections come from
 * `useMenuItems("navmenu/settings" | "navmenu/view" | "navmenu/tools" |
 * "navmenu/preferences")`. Click dispatches via
 * `sdk.commands.execute(id, args, { trigger: "menu" })`. Host slots route
 * through `<SlotRenderer>` for `navmenu/header-items` and `navmenu/ai-row`
 * (the existing `editorChromeSlots.renderNav*` adapter shim wires these up).
 *
 * Other panel values (`components`, `blocks`, `theme`, `import-export`,
 * `publish`) keep their existing bodies — they're routed content, not menu
 * rows. C2b only touches `panel === "menu"`.
 *
 * Dynamic titles ("Hide Layers Panel" vs "Dock Layers Panel", etc.) flow
 * from atom state into the command context via host-set keys
 * (`sidebarLayersOpen`, `showGridLines`, `editorDarkMode`, etc.) so menu
 * `titleOverride` resolvers can read them without prop-drilling.
 */
import { useEditor } from "@craftjs/core";
import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { useEffect, useRef } from "react";
import { useAtomState } from "@zedux/react";
import {
  isFlyoutBlockingToolColumn,
  takeToolboxHistorySelectionSyncForRebaseline,
  usePanelUrl,
} from "../../../utils/usePanelUrl";
import {
  DarkModeAtom,
  ShowGridLinesAtom,
  ShowHiddenAtom,
  SideBarAtom,
  SidebarLayersPanelAtom,
} from "../../../utils/atoms";
import { ShowBreakpointMarkersAtom, ShowDeviceGuidesAtom } from "../state/atoms";
import { useSDK } from "../../../core/context";
import { useRegistries } from "../../../registry/provider";
import { useMenuItems } from "../../../registry/hooks";
import { SlotRenderer } from "../../../registry/SlotRenderer";
import type { ResolvedMenuItem } from "../../../registry/types";
import { EditorMenuNavRow, EditorMenuSectionLabel } from "./EditorMenuNav";
import { SidebarFlyoutSurface } from "../../primitives/SidebarFlyoutSurface";
import { ImportExportPanel } from "./ImportExportPanel";
import { ThemeSettingsPanel } from "../modals/ThemeSettingsPanel";
import { ToolboxTabs } from "./ToolboxTabs";

interface EditorNavigationProps {
  settings: any;
  isTenant: boolean;
}

export const EDITOR_NAV_FOOTER_ID = "editor-nav-footer";
export const EDITOR_NAV_PUBLISH_ID = "editor-nav-publish";

/**
 * Map a list of resolved menu items to clickable rows. Hidden when empty.
 * The label is split into icon / text + optional kbd; we render text in a
 * `<div className="text-sm">` to match the prior visual treatment.
 */
function NavMenuSection({ items }: { items: ResolvedMenuItem[] }) {
  const { commands } = useSDK();
  if (items.length === 0) return null;
  return (
    <>
      {items.map(item => (
        <EditorMenuNavRow
          key={item.command + JSON.stringify(item.args ?? null)}
          icon={item.icon}
          label={<div className="text-sm">{item.title}</div>}
          onClick={() => {
            void commands.execute(item.command, item.args, { trigger: "menu" });
          }}
        />
      ))}
    </>
  );
}

export const EditorNavigation = ({ settings: _settings, isTenant }: EditorNavigationProps) => {
  const { selectedId } = useEditor((_state, query) => ({
    selectedId: query.getEvent("selected").first() ?? null,
  }));
  const { commands, config } = useSDK();
  const designSystemEnabled = config.features?.designSystem !== false;
  // Subscribe to the atoms that drive dynamic titles so this component
  // re-renders and re-runs the title resolvers. We also mirror them into
  // the command context (below) so the `titleOverride` callbacks see them.
  const [showGridLines] = useAtomState(ShowGridLinesAtom);
  const [showBreakpointMarkers] = useAtomState(ShowBreakpointMarkersAtom);
  const [showDeviceGuides] = useAtomState(ShowDeviceGuidesAtom);
  const [showHidden] = useAtomState(ShowHiddenAtom);
  const [sidebarLayersOpen] = useAtomState(SidebarLayersPanelAtom);
  const [sideBarLeft] = useAtomState(SideBarAtom);
  const [editorDarkMode] = useAtomState(DarkModeAtom);
  const { context: commandContext } = useRegistries();

  const { isOpen, panel, close } = usePanelUrl();

  // Feed the dynamic-title inputs into the command context so each
  // menu item's `titleOverride` (and `ph.ui.toggleDarkMode`'s built-in
  // dynamic title) can read them via ctx[key]. Host-set keys are flat on
  // CommandContext; we already mirror SDK-derived fields elsewhere.
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

  // Resolve the four navmenu locations. The registry handles `when`
  // gating (e.g. `ph.site.selectBackground` only renders for tenants).
  const settingsItems = useMenuItems("navmenu/settings");
  const viewItems = useMenuItems("navmenu/view");
  const toolsItems = useMenuItems("navmenu/tools");
  const preferenceItems = useMenuItems("navmenu/preferences");

  // Baseline Craft selection when entering Components/Blocks — close panel when it changes (see below).
  const selectedIdAtToolboxOpenRef = useRef<string | null | undefined>(undefined);
  const prevPanelRef = useRef<string | null>(null);

  useEffect(() => {
    const isToolbox = panel === "components" || panel === "blocks";
    const wasToolbox = prevPanelRef.current === "components" || prevPanelRef.current === "blocks";

    if (isToolbox && !wasToolbox) {
      selectedIdAtToolboxOpenRef.current = selectedId;
    }
    if (!isToolbox) {
      selectedIdAtToolboxOpenRef.current = undefined;
    }
    prevPanelRef.current = panel;
  }, [panel, selectedId]);

  useEffect(() => {
    if (panel !== "components" && panel !== "blocks") return;
    const baseline = selectedIdAtToolboxOpenRef.current;
    if (baseline === undefined) return;
    if (selectedId !== baseline) {
      if (takeToolboxHistorySelectionSyncForRebaseline()) {
        selectedIdAtToolboxOpenRef.current = selectedId;
        return;
      }
      close();
    }
  }, [panel, selectedId, close]);

  // Click-away: close panel when clicking outside the nav (not for Components/Blocks — sticky toolbox)
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    if (isFlyoutBlockingToolColumn(panel)) return;
    const handler = (e: MouseEvent) => {
      if (!navRef.current || navRef.current.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, panel, close]);

  if (!isOpen) return null;

  // The Preferences label only renders if at least one preference item
  // is visible (gated by settingsPanelSwitcher / darkModeSwitcher feature
  // flags).
  const showPreferencesLabel = preferenceItems.length > 0;
  // The Tools label hides only when no built-in tool items AND no AI slot
  // contribution exists. We can't easily probe slot resolution from here
  // without rendering, so we always show the label when there are any tool
  // items; the AI slot handles its own visibility.

  return (
    <>
      <nav
        ref={navRef}
        role="navigation"
        aria-label="Editor menu"
        className="bg-base-100 text-base-content pointer-events-auto absolute z-50 flex w-full flex-col"
        style={{
          top: "var(--editor-nav-height, 3rem)",
          bottom: "var(--sidebar-layers-height, 0px)",
        }}
      >
        <SidebarFlyoutSurface>
          {panel === "components" || panel === "blocks" ? (
            <ToolboxTabs />
          ) : panel === "theme" && designSystemEnabled ? (
            <ThemeSettingsPanel />
          ) : panel === "import-export" ? (
            <ImportExportPanel onClose={close} />
          ) : (
            <AutoHideScrollbar
              className="flex flex-1 flex-col gap-0 overflow-y-auto pt-0 pb-3"
              hideDelay={2000}
            >
              {panel === "publish" && <div id={EDITOR_NAV_PUBLISH_ID} className="flex-1" />}

              {panel === "menu" && (
                <>
                  {isTenant ? (
                    // Tenant short list — `ph.site.selectBackground` and the
                    // sidebar-side toggle. Both are gated via `when`
                    // predicates (directSave / settingsPanelSwitcher).
                    <NavMenuSection
                      items={[
                        ...settingsItems.filter(it => it.command === "ph.site.selectBackground"),
                        ...preferenceItems.filter(it => it.command === "ph.ui.toggleSidebarSide"),
                      ]}
                    />
                  ) : (
                    <>
                      {/* ── Page actions (host slot) ── */}
                      <SlotRenderer id="navmenu/header-items" ctx={{ close }} />

                      {/* ── Settings ── */}
                      {settingsItems.length > 0 && (
                        <EditorMenuSectionLabel>Settings</EditorMenuSectionLabel>
                      )}
                      <NavMenuSection items={settingsItems} />

                      {/* ── View ── */}
                      {viewItems.length > 0 && (
                        <EditorMenuSectionLabel>View</EditorMenuSectionLabel>
                      )}
                      <NavMenuSection items={viewItems} />

                      {/* ── Tools (AI row from host slot, then built-ins) ── */}
                      {toolsItems.length > 0 && (
                        <EditorMenuSectionLabel>Tools</EditorMenuSectionLabel>
                      )}
                      <SlotRenderer
                        id="navmenu/ai-row"
                        ctx={{
                          onSelect: () => {
                            void commands.execute(
                              "ph.ai.openAssistant",
                              undefined,
                              { trigger: "menu" }
                            );
                          },
                        }}
                      />
                      <NavMenuSection items={toolsItems} />

                      {/* ── Preferences ── */}
                      {showPreferencesLabel && (
                        <EditorMenuSectionLabel>Preferences</EditorMenuSectionLabel>
                      )}
                      <NavMenuSection items={preferenceItems} />
                    </>
                  )}
                </>
              )}
            </AutoHideScrollbar>
          )}
        </SidebarFlyoutSurface>

        {/* Portal target — app injects footer content (account, nav links) here */}
        {!isFlyoutBlockingToolColumn(panel) && <div id="editor-nav-footer" className="mt-auto" />}
      </nav>
    </>
  );
};
