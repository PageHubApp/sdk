import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { useEffect, useRef } from "react";
import {
  isFlyoutBlockingToolColumn,
  takeToolboxHistorySelectionSyncForRebaseline,
  usePanelUrl,
} from "../../utils/usePanelUrl";
import {
  TbArrowsHorizontal,
  TbBoxModel2,
  TbDownload,
  TbEye,
  TbEyeOff,
  TbLayoutGrid,
  TbLayoutSidebar,
  TbLayoutSidebarRight,
  TbMoon,
  TbPalette,
  TbPhoto,
  TbSettings,
  TbStack2,
  TbSun,
} from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { AssistantOpenAtom, ShowGridLinesAtom, SidebarLayersPanelAtom } from "../../utils/atoms";
import { ShowBreakpointMarkersAtom } from "./atoms";
import { phStorage } from "../../utils/phStorage";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import { useSDK } from "../../core/context";
import { EditorMenuKbd, EditorMenuNavRow, EditorMenuSectionLabel } from "./EditorMenuNav";
import { SidebarFlyoutSurface } from "../primitives/SidebarFlyoutSurface";
import { ImportExportPanel } from "./ImportExportPanel";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";
import { ToolboxTabs } from "./ToolboxTabs";

interface EditorNavigationProps {
  settings: any;
  isTenant: boolean;
  sideBarLeft: boolean;
  setSideBarLeft: (value: boolean) => void;
  setIsLayersDialogOpen: (value: boolean) => void;
  setIsMediaManagerModalOpen: (value: boolean) => void;
  setIsSiteSettingsModalOpen: (value: boolean) => void;
  setIsModifiersModalOpen: (value: boolean) => void;
  showHidden: boolean;
  setShowHidden: (fn: (prev: boolean) => boolean) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export const EDITOR_NAV_FOOTER_ID = "editor-nav-footer";
export const EDITOR_NAV_PUBLISH_ID = "editor-nav-publish";

export const EditorNavigation = ({
  settings,
  isTenant,
  sideBarLeft,
  setSideBarLeft,
  setIsLayersDialogOpen,
  setIsMediaManagerModalOpen,
  setIsSiteSettingsModalOpen,
  setIsModifiersModalOpen,
  showHidden,
  setShowHidden,
  toggleTheme,
  isDarkMode,
}: EditorNavigationProps) => {
  const { actions, selectedId } = useEditor((state, query) => ({
    selectedId: query.getEvent("selected").first() ?? null,
  }));
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const [showBreakpointMarkers, setShowBreakpointMarkers] = useAtomState(ShowBreakpointMarkersAtom);
  const [sidebarLayersOpen, setSidebarLayersOpen] = useAtomState(SidebarLayersPanelAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderNavAi = config.editorChromeSlots?.renderNavAiMenuItem;
  const renderNavHeader = config.editorChromeSlots?.renderNavHeaderItems;

  const { isOpen, panel, close, open } = usePanelUrl();

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
          ) : panel === "theme" ? (
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
                    // For tenant users, show background and settings panel buttons
                    <>
                      <EditorMenuNavRow
                        icon={<TbBoxModel2 />}
                        label="Select Background"
                        onClick={() => {
                          close();
                          actions.selectNode(ROOT_NODE);
                        }}
                      />

                      <EditorMenuNavRow
                        icon={sideBarLeft ? <TbLayoutSidebarRight /> : <TbLayoutSidebar />}
                        label={`Move this panel to the ${sideBarLeft ? "right" : "left"} side`}
                        onClick={() => setSideBarLeft(!sideBarLeft)}
                      />
                    </>
                  ) : (
                    // For regular users, show all the original items
                    <>
                      {/* ── Page actions (from host app) ── */}
                      {renderNavHeader && renderNavHeader({ close })}

                      {/* ── Settings ── */}
                      <EditorMenuSectionLabel>Settings</EditorMenuSectionLabel>

                      <EditorMenuNavRow
                        icon={<TbSettings />}
                        label={<div className="text-sm">Site Settings</div>}
                        kbd={<EditorMenuKbd>⌘,</EditorMenuKbd>}
                        onClick={() => {
                          setIsSiteSettingsModalOpen(true);
                          close();
                        }}
                      />

                      <EditorMenuNavRow
                        icon={<TbPalette />}
                        label={<div className="text-sm">Theme Settings</div>}
                        kbd={<EditorMenuKbd>⌘⇧D</EditorMenuKbd>}
                        onClick={() => {
                          open("theme", { cat: "colors" });
                        }}
                      />

                      <EditorMenuNavRow
                        icon={<TbPhoto />}
                        label={<div className="text-sm">Media Manager</div>}
                        kbd={<EditorMenuKbd>⌘⇧M</EditorMenuKbd>}
                        onClick={() => {
                          setIsMediaManagerModalOpen(true);
                          close();
                        }}
                      />

                      {/* ── View ── */}
                      <EditorMenuSectionLabel>View</EditorMenuSectionLabel>

                      <EditorMenuNavRow
                        icon={<TbLayoutGrid />}
                        label={<div className="text-sm">Pop Out Layers</div>}
                        kbd={<EditorMenuKbd>⌘⇧L</EditorMenuKbd>}
                        onClick={() => {
                          setIsLayersDialogOpen(true);
                          close();
                        }}
                      />

                      <EditorMenuNavRow
                        icon={<TbLayoutGrid />}
                        label={
                          <div className="text-sm">
                            {sidebarLayersOpen ? "Hide" : "Dock"} Layers Panel
                          </div>
                        }
                        onClick={() => {
                          setSidebarLayersOpen(prev => {
                            const next = !prev;
                            phStorage.set("sidebar-layers-panel", String(next));
                            return next;
                          });
                          close();
                        }}
                      />

                      <EditorMenuNavRow
                        icon={<TbBoxModel2 />}
                        label={
                          <div className="text-sm">{`${showGridLines ? "Hide" : "Show"} Grid Lines`}</div>
                        }
                        kbd={<EditorMenuKbd>⌘⇧G</EditorMenuKbd>}
                        onClick={() => {
                          const viewport = document.getElementById("viewport");
                          setShowGridLines(!showGridLines);
                          viewport?.setAttribute(
                            "data-show-gridlines",
                            (!showGridLines).toString()
                          );
                        }}
                      />

                      <EditorMenuNavRow
                        icon={<TbArrowsHorizontal />}
                        label={
                          <div className="text-sm">{`${showBreakpointMarkers ? "Hide" : "Show"} Breakpoint Lines`}</div>
                        }
                        onClick={() => {
                          setShowBreakpointMarkers(prev => {
                            const next = !prev;
                            try {
                              phStorage.set("show-breakpoint-markers", String(next));
                            } catch {}
                            return next;
                          });
                        }}
                      />

                      <EditorMenuNavRow
                        icon={showHidden ? <TbEyeOff /> : <TbEye />}
                        label={
                          <div className="text-sm">{`${showHidden ? "Show" : "Hide"} Hidden Components`}</div>
                        }
                        kbd={<EditorMenuKbd>⌘⇧H</EditorMenuKbd>}
                        onClick={() => {
                          setShowHidden(prev => {
                            const next = !prev;
                            document
                              .getElementById("viewport")
                              ?.setAttribute("data-show-hidden", next.toString());
                            return next;
                          });
                        }}
                      />

                      {/* ── Tools ── */}
                      <EditorMenuSectionLabel>Tools</EditorMenuSectionLabel>

                      {isAiEnabled &&
                        renderNavAi &&
                        renderNavAi({
                          onSelect: () => {
                            setAssistantOpen({ revealPanel: true });
                            close();
                          },
                        })}

                      <EditorMenuNavRow
                        icon={<TbStack2 />}
                        label={<div className="text-sm">Modifiers</div>}
                        kbd={<EditorMenuKbd>⌘⇧O</EditorMenuKbd>}
                        onClick={() => {
                          setIsModifiersModalOpen(true);
                          close();
                        }}
                      />

                      <EditorMenuNavRow
                        icon={<TbDownload />}
                        label={<div className="text-sm">Import / Export</div>}
                        kbd={<EditorMenuKbd>⌘⇧E</EditorMenuKbd>}
                        onClick={() => {
                          open("import-export");
                        }}
                      />

                      {/* ── Preferences ── */}
                      <EditorMenuSectionLabel>Preferences</EditorMenuSectionLabel>

                      <EditorMenuNavRow
                        icon={sideBarLeft ? <TbLayoutSidebarRight /> : <TbLayoutSidebar />}
                        label={
                          <div className="text-sm">
                            {sideBarLeft ? "Right" : "Left"} Settings Panel
                          </div>
                        }
                        onClick={() => {
                          setSideBarLeft(!sideBarLeft);
                          close();
                        }}
                      />

                      <EditorMenuNavRow
                        icon={isDarkMode ? <TbSun /> : <TbMoon />}
                        label={
                          <div className="text-sm">
                            Switch to {isDarkMode ? "Light" : "Dark"} Theme
                          </div>
                        }
                        onClick={() => {
                          toggleTheme();
                          close();
                        }}
                      />
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
