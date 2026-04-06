import { ROOT_NODE, useEditor } from "@craftjs/core";
import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePanelUrl } from "../../utils/usePanelUrl";
import {
  TbBoxModel2,
  TbDownload,
  TbEye,
  TbEyeOff,
  TbFilePlus,
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
import { ClippyOpenAtom, ClippyVisibleAtom, ShowGridLinesAtom } from "utils/atoms";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { ToolboxTabs } from "./ToolboxTabs";

interface EditorNavigationProps {
  headerMenu: {
    isOpen: boolean;
    activeTab: string;
    menuType: string;
  };
  setHeaderMenu: (value: any) => void;
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

/** `mid` = faint row divider; `section` = full border (end of a group, replaces `<hr>`); `end` = last row, no border. */
const editorNavRow = (kind: "mid" | "section" | "end") =>
  [
    "flex w-full cursor-pointer items-center gap-1 px-3 py-3 text-muted-foreground hover:bg-muted",
    kind === "mid" && "border-b border-border/50",
    kind === "section" && "border-b border-border",
  ]
    .filter(Boolean)
    .join(" ");

export const EditorNavigation = ({
  headerMenu,
  setHeaderMenu,
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
  toggleTheme,
  isDarkMode,
}: EditorNavigationProps) => {
  const { actions } = useEditor();
  const [showHidden, setShowHidden] = useState(true);
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const [clippyVisible, setClippyVisible] = useAtomState(ClippyVisibleAtom);
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderNavAi = config.editorChromeSlots?.renderNavAiMenuItem;

  const { state: panelState, close: closePanel } = usePanelUrl();

  // URL → atom sync: react to panelState.panel changes (popstate, pushState, mount deep-link)
  useEffect(() => {
    if (panelState.panel === "blocks") {
      setHeaderMenu(prev => {
        if (prev.menuType === "sections" && prev.isOpen) return prev;
        return { ...prev, isOpen: true, activeTab: "sections", menuType: "sections" };
      });
    } else if (panelState.panel === "components") {
      setHeaderMenu(prev => {
        if (prev.menuType === "components" && prev.isOpen) return prev;
        return { ...prev, isOpen: true, activeTab: "components", menuType: "components" };
      });
    } else {
      // No panel param — close if a panel tab was open
      setHeaderMenu(prev => {
        if (prev.menuType === "sections" || prev.menuType === "components") {
          if (!prev.isOpen) return prev;
          return { ...prev, isOpen: false, menuType: "" };
        }
        return prev;
      });
    }
  }, [panelState.panel, setHeaderMenu]);

  // Atom → URL sync: strip panel params when menu closes via click-outside, toggle, etc.
  const prevOpenRef = useRef(headerMenu.isOpen);
  useEffect(() => {
    if (prevOpenRef.current && !headerMenu.isOpen) {
      // Only push if URL still has panel params (avoids double-push when back button already cleared them)
      if (panelState.panel) {
        closePanel();
      }
    }
    prevOpenRef.current = headerMenu.isOpen;
  }, [headerMenu.isOpen, panelState.panel, closePanel]);

  // Click-away: close panel when clicking outside the nav (replaces the
  // fullscreen backdrop div that was blocking HTML5 drag events).
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!headerMenu.isOpen || isDesignSystemSidebarOpen) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [headerMenu.isOpen, isDesignSystemSidebarOpen, setHeaderMenu]);

  if (!headerMenu.isOpen) return null;

  return (
    <>
      {/* Click-away: document listener instead of a backdrop div,
          so HTML5 drag events can reach #viewport unblocked. */}
      <nav
        ref={navRef}
        role="navigation"
        aria-label="Editor menu"
        className="pointer-events-auto absolute bottom-0 top-10 z-50 flex w-full flex-col bg-background text-foreground"
      >
      {(headerMenu.menuType === "components" || headerMenu.menuType === "sections") ? (
        <ToolboxTabs headerMenu={headerMenu} setHeaderMenu={setHeaderMenu} />
      ) : (
      <AutoHideScrollbar
        className="flex flex-1 flex-col gap-0 overflow-y-auto pb-3 pt-0"
        hideDelay={2000}
      >
        {headerMenu.menuType === "domain" && <div id={EDITOR_NAV_PUBLISH_ID} className="flex-1" />}

        {!headerMenu.menuType && (
          <>
            {isTenant ? (
              // For tenant users, show background and settings panel buttons
              <>
                <button
                  onClick={() => {
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                    actions.selectNode(ROOT_NODE);
                  }}
                  className={editorNavRow("mid")}
                >
                  <div className="text-base">
                    <TbBoxModel2 />
                  </div>{" "}
                  Select Background
                </button>

                <button
                  onClick={() => setSideBarLeft(!sideBarLeft)}
                  className={editorNavRow("end")}
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
                <Link
                  href="/build"
                  className="hidden cursor-pointer items-center gap-3 p-3 text-muted-foreground hover:bg-muted"
                >
                  <TbFilePlus /> New Builder
                </Link>


                <button
                  onClick={() => {
                    setIsMediaManagerModalOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("mid")}
                >
                  <div className="text-base">
                    <TbPhoto />
                  </div>
                  <div className="text-sm">Media Manager</div>
                  <Kbd>⌘⇧M</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsDesignSystemSidebarOpen(!isDesignSystemSidebarOpen);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("mid")}
                >
                  <div className="text-base">
                    <TbPalette />
                  </div>
                  <div className="text-sm">Theme Settings</div>
                  <Kbd>⌘⇧D</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsSiteSettingsModalOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("mid")}
                >
                  <div className="text-base">
                    <TbSettings />
                  </div>
                  <div className="text-sm">Site Settings</div>
                  <Kbd>⌘,</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsModifiersModalOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("section")}
                >
                  <div className="text-base">
                    <TbStack2 />
                  </div>
                  <div className="text-sm">Modifiers</div>
                </button>

                <button
                  onClick={() => {
                    setIsLayersDialogOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("mid")}
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
                  className={editorNavRow("mid")}
                >
                  <div className="text-base">
                    <TbBoxModel2 />
                  </div>
                  <div className="text-sm">{`${showGridLines ? "Hide" : "Show"} Grid Lines`}</div>
                  <Kbd>⌘⇧G</Kbd>
                </button>

                <button
                  onClick={() => {
                    const viewport = document.getElementById("viewport");

                    setShowHidden(!showHidden);
                    viewport.setAttribute("data-show-hidden", showHidden ? "true" : "false");
                  }}
                  className={editorNavRow("section")}
                >
                  <div className="text-base">{showHidden ? <TbEyeOff /> : <TbEye />}</div>
                  <div className="text-sm">{`${showHidden ? "Show" : "Hide"} Hidden Components`}</div>
                </button>

                {isAiEnabled &&
                  renderNavAi &&
                  renderNavAi({
                    onSelect: () => {
                      setClippyOpen({});
                      setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                    },
                  })}

                <button
                  onClick={() => {
                    setIsImportExportDialogOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("mid")}
                >
                  <div className="text-base">
                    <TbDownload />
                  </div>
                  <div className="text-sm">Import / Export</div>
                  <Kbd>⌘⇧E</Kbd>
                </button>

                <button
                  onClick={() => {
                    setSideBarLeft(!sideBarLeft);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("mid")}
                >
                  <div className="text-base">
                    {sideBarLeft ? <TbLayoutSidebarRight /> : <TbLayoutSidebar />}
                  </div>
                  <div className="text-sm">{sideBarLeft ? "Right" : "Left"} Settings Panel</div>
                </button>

                <button
                  onClick={() => {
                    toggleTheme();
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className={editorNavRow("end")}
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
      {headerMenu.menuType !== "components" && headerMenu.menuType !== "sections" && (
        <div id="editor-nav-footer" className="mt-auto" />
      )}
    </nav>
    </>
  );
};
