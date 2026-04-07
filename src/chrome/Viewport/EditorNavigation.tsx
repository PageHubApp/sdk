import { ROOT_NODE, useEditor } from "@craftjs/core";
import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import { useEffect, useRef } from "react";
import { usePanelUrl } from "../../utils/usePanelUrl";
import {
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
import { ClippyOpenAtom, ShowGridLinesAtom } from "utils/atoms";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { ToolboxTabs } from "./ToolboxTabs";

interface EditorNavigationProps {
  settings: any;
  isTenant: boolean;
  sideBarLeft: boolean;
  setSideBarLeft: (value: boolean) => void;
  setIsLayersDialogOpen: (value: boolean) => void;
  setIsMediaManagerModalOpen: (value: boolean) => void;
  isDesignSystemSidebarOpen: boolean;
  setIsDesignSystemSidebarOpen: (value: boolean) => void;
  setIsSiteSettingsModalOpen: (value: boolean) => void;
  setIsModifiersModalOpen: (value: boolean) => void;
  setIsImportExportDialogOpen: (value: boolean) => void;
  showHidden: boolean;
  setShowHidden: (fn: (prev: boolean) => boolean) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const EDITOR_NAV_FOOTER_ID = "editor-nav-footer";
export const EDITOR_NAV_PUBLISH_ID = "editor-nav-publish";

const formatKbd = (mac: string) => {
  if (isMac) return mac;
  return mac.replace(/⌘/g, "Ctrl+").replace(/⇧/g, "Shift+").replace(/⌥/g, "Alt+").replace(/\+$/, "");
};

const Kbd = ({ children, win }: { children: string; win?: string }) => (
  <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-foreground/80">
    {win && !isMac ? win : formatKbd(children)}
  </kbd>
);

const navRow =
  "flex w-full cursor-pointer items-center gap-1 px-3 py-3 text-muted-foreground hover:bg-muted";

const SectionLabel = ({ children }: { children: string }) => (
  <div className="px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
    {children}
  </div>
);

export const EditorNavigation = ({
  settings,
  isTenant,
  sideBarLeft,
  setSideBarLeft,
  setIsLayersDialogOpen,
  setIsMediaManagerModalOpen,
  isDesignSystemSidebarOpen,
  setIsDesignSystemSidebarOpen,
  setIsSiteSettingsModalOpen,
  setIsModifiersModalOpen,
  setIsImportExportDialogOpen,
  showHidden,
  setShowHidden,
  toggleTheme,
  isDarkMode,
}: EditorNavigationProps) => {
  const { actions } = useEditor();
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderNavAi = config.editorChromeSlots?.renderNavAiMenuItem;
  const renderNavHeader = config.editorChromeSlots?.renderNavHeaderItems;

  const { isOpen, panel, close } = usePanelUrl();

  // Click-away: close panel when clicking outside the nav
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isOpen || isDesignSystemSidebarOpen) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isDesignSystemSidebarOpen, close]);

  if (!isOpen) return null;

  return (
    <>
      <nav
        ref={navRef}
        role="navigation"
        aria-label="Editor menu"
        className="pointer-events-auto absolute bottom-0 top-10 z-50 flex w-full flex-col bg-background text-foreground"
      >
      {(panel === "components" || panel === "blocks") ? (
        <ToolboxTabs />
      ) : (
      <AutoHideScrollbar
        className="flex flex-1 flex-col gap-0 overflow-y-auto pb-3 pt-0"
        hideDelay={2000}
      >
        {panel === "publish" && <div id={EDITOR_NAV_PUBLISH_ID} className="flex-1" />}

        {panel === "menu" && (
          <>
            {isTenant ? (
              // For tenant users, show background and settings panel buttons
              <>
                <button
                  onClick={() => {
                    close();
                    actions.selectNode(ROOT_NODE);
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbBoxModel2 />
                  </div>{" "}
                  Select Background
                </button>

                <button
                  onClick={() => setSideBarLeft(!sideBarLeft)}
                  className={navRow}
                >
                  <div className="text-base">
                    {sideBarLeft ? <TbLayoutSidebarRight /> : <TbLayoutSidebar />}
                  </div>
                  Move this panel to the {sideBarLeft ? "right" : "left"} side
                </button>
              </>
            ) : (
              // For regular users, show all the original items
              <>
                {/* ── Page actions (from host app) ── */}
                {renderNavHeader && renderNavHeader({ close })}

                {/* ── Settings ── */}
                <SectionLabel>Settings</SectionLabel>

                <button
                  onClick={() => {
                    setIsSiteSettingsModalOpen(true);
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbSettings />
                  </div>
                  <div className="text-sm">Site Settings</div>
                  <Kbd>⌘,</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsDesignSystemSidebarOpen(!isDesignSystemSidebarOpen);
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbPalette />
                  </div>
                  <div className="text-sm">Theme Settings</div>
                  <Kbd>⌘⇧D</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsMediaManagerModalOpen(true);
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbPhoto />
                  </div>
                  <div className="text-sm">Media Manager</div>
                  <Kbd>⌘⇧M</Kbd>
                </button>

                {/* ── View ── */}
                <SectionLabel>View</SectionLabel>

                <button
                  onClick={() => {
                    setIsLayersDialogOpen(true);
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbLayoutGrid />
                  </div>
                  <div className="text-sm">Show Layers</div>
                  <Kbd>⌘⇧L</Kbd>
                </button>

                <button
                  onClick={() => {
                    const viewport = document.getElementById("viewport");
                    setShowGridLines(!showGridLines);
                    viewport?.setAttribute("data-show-gridlines", (!showGridLines).toString());
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbBoxModel2 />
                  </div>
                  <div className="text-sm">{`${showGridLines ? "Hide" : "Show"} Grid Lines`}</div>
                  <Kbd>⌘⇧G</Kbd>
                </button>

                <button
                  onClick={() => {
                    setShowHidden(prev => {
                      const next = !prev;
                      document.getElementById("viewport")?.setAttribute("data-show-hidden", next.toString());
                      return next;
                    });
                  }}
                  className={navRow}
                >
                  <div className="text-base">{showHidden ? <TbEyeOff /> : <TbEye />}</div>
                  <div className="text-sm">{`${showHidden ? "Show" : "Hide"} Hidden Components`}</div>
                  <Kbd>⌘⇧H</Kbd>
                </button>

                {/* ── Tools ── */}
                <SectionLabel>Tools</SectionLabel>

                {isAiEnabled &&
                  renderNavAi &&
                  renderNavAi({
                    onSelect: () => {
                      setClippyOpen({});
                      close();
                    },
                  })}

                <button
                  onClick={() => {
                    setIsModifiersModalOpen(true);
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbStack2 />
                  </div>
                  <div className="text-sm">Modifiers</div>
                  <Kbd>⌘⇧O</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsImportExportDialogOpen(true);
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    <TbDownload />
                  </div>
                  <div className="text-sm">Import / Export</div>
                  <Kbd>⌘⇧E</Kbd>
                </button>

                {/* ── Preferences ── */}
                <SectionLabel>Preferences</SectionLabel>

                <button
                  onClick={() => {
                    setSideBarLeft(!sideBarLeft);
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">
                    {sideBarLeft ? <TbLayoutSidebarRight /> : <TbLayoutSidebar />}
                  </div>
                  <div className="text-sm">{sideBarLeft ? "Right" : "Left"} Settings Panel</div>
                </button>

                <button
                  onClick={() => {
                    toggleTheme();
                    close();
                  }}
                  className={navRow}
                >
                  <div className="text-base">{isDarkMode ? <TbSun /> : <TbMoon />}</div>
                  <div className="text-sm">Switch to {isDarkMode ? "Light" : "Dark"} Theme</div>
                </button>
              </>
            )}
          </>
        )}
      </AutoHideScrollbar>
      )}

      {/* Portal target — app injects footer content (account, nav links) here */}
      {panel !== "components" && panel !== "blocks" && (
        <div id="editor-nav-footer" className="mt-auto" />
      )}
    </nav>
    </>
  );
};
